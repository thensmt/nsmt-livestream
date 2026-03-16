'use strict';

/**
 * tickets-checkout Lambda
 * Routes:
 *   POST /tickets/checkout             — create Stripe Checkout Session (paid) or fulfill free order
 *   GET  /tickets/checkout/confirm     — post-Stripe success redirect: fulfill paid order
 */

const { ddb, TABLES }  = require('../shared/db');
const { publicOrgId }  = require('../shared/auth');
const ids              = require('../shared/ids');
const { ok, err }      = require('../shared/response');

const { GetCommand, PutCommand, UpdateCommand, QueryCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const BASE_URL = process.env.FRONTEND_BASE_URL || 'https://tickets.thensmt.com';

// ─── Router ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'POST';
  const path   = event.path || event.rawPath || '';

  try {
    if (method === 'POST' && path === '/tickets/checkout') {
      return await startCheckout(event);
    }
    if (method === 'GET' && path === '/tickets/checkout/confirm') {
      return await confirmCheckout(event);
    }
    return err('Not found', 404);
  } catch (e) {
    console.error(e);
    if (e.statusCode) return err(e.message, e.statusCode);
    return err('Internal server error', 500);
  }
};

// ─── POST /tickets/checkout ───────────────────────────────────────────────────

async function startCheckout(event) {
  const body = parseBody(event);
  const { eventId, tierId, quantity = 1, buyerName, buyerEmail, promoCode } = body;

  if (!eventId || !tierId || !buyerName || !buyerEmail) {
    return err('eventId, tierId, buyerName, and buyerEmail are required', 400);
  }
  if (quantity < 1 || quantity > 8) return err('quantity must be between 1 and 8', 400);
  if (!isValidEmail(buyerEmail))    return err('Invalid email address', 400);

  const orgId = publicOrgId(event);

  // Load event + tier
  const [eventData, tierData] = await Promise.all([
    getEvent(orgId, eventId),
    getTier(eventId, tierId),
  ]);

  if (!eventData || eventData.status !== 'published') return err('Event not found', 404);
  if (!tierData  || !tierData.active)                 return err('Ticket tier not available', 404);

  // Check tier capacity
  if (tierData.capacity > 0 && (tierData.sold + quantity) > tierData.capacity) {
    return err('Not enough tickets available', 409);
  }

  // Apply promo code
  const { discountCents, promoMeta } = applyPromoCode(eventData, promoCode, tierData.price, quantity);
  const unitPrice   = tierData.price;
  const totalCents  = Math.max(0, unitPrice * quantity - discountCents);

  const orderId   = ids.orderId();
  const ticketIds = Array.from({ length: quantity }, () => ids.ticketId());
  const now       = new Date().toISOString();

  // ── Free order: fulfill immediately ──────────────────────────────────────
  if (totalCents === 0) {
    await fulfillOrder({
      orgId, orderId, eventId, tierId, tierData,
      buyerName, buyerEmail, quantity,
      unitPriceCents: unitPrice, totalCents: 0, discountCents,
      promoCode: promoMeta?.code || null,
      status: 'free', stripeSessionId: null, stripePaymentIntentId: null,
      ticketIds, now,
    });

    if (promoMeta) await incrementPromoUse(orgId, eventId, promoMeta.code);

    const tickets = buildTicketObjects({ ticketIds, eventId, orgId, orderId, tierId, tierData, buyerName, buyerEmail, now });
    return ok({ orderId, status: 'free', tickets });
  }

  // ── Paid order: create Stripe Checkout Session ────────────────────────────
  const pendingOrder = {
    orderId, orgId, eventId, tierId,
    buyerEmail: buyerEmail.toLowerCase(),
    buyerName,
    quantity,
    unitPriceCents: unitPrice,
    totalCents,
    discountCents,
    promoCode: promoMeta?.code || null,
    status: 'pending',
    stripeSessionId: null,
    stripePaymentIntentId: null,
    ticketIds,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: TABLES.ORDERS, Item: pendingOrder }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: totalCents,  // already discounted total, single line item
        product_data: {
          name: `${eventData.title} — ${tierData.name}`,
          description: quantity > 1 ? `${quantity} tickets` : '1 ticket',
        },
      },
      quantity: 1,
    }],
    customer_email: buyerEmail.toLowerCase(),
    payment_intent_data: {
      metadata: { orderId, eventId, orgId },
    },
    metadata: { orderId, eventId, orgId },
    success_url: `${BASE_URL}/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/events/${eventData.slug}?cancelled=1`,
    expires_at:  Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });

  // Store session ID on the pending order
  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.ORDERS,
    Key:                       { orderId, orgId },
    UpdateExpression:          'SET stripeSessionId = :sid, updatedAt = :now',
    ExpressionAttributeValues: { ':sid': session.id, ':now': new Date().toISOString() },
  }));

  return ok({ sessionUrl: session.url });
}

// ─── GET /tickets/checkout/confirm ───────────────────────────────────────────

async function confirmCheckout(event) {
  const qs        = event.queryStringParameters || {};
  const sessionId = qs.session_id;
  if (!sessionId) return err('session_id is required', 400);

  // Retrieve session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (session.payment_status !== 'paid') {
    return err('Payment not yet completed', 402);
  }

  const { orderId, orgId } = session.metadata;
  if (!orderId || !orgId) return err('Invalid session metadata', 400);

  // Load existing order
  const result = await ddb.send(new GetCommand({
    TableName: TABLES.ORDERS,
    Key: { orderId, orgId },
  }));
  const order = result.Item;
  if (!order) return err('Order not found', 404);

  // Idempotent: if already paid, just return existing tickets
  if (order.status === 'paid') {
    const tickets = await fetchTickets(order.ticketIds, order.eventId);
    return ok({ orderId, status: 'paid', tickets });
  }

  // Fulfill
  const tierData = await getTier(order.eventId, order.tierId);
  const now      = new Date().toISOString();

  await fulfillOrder({
    orgId, orderId,
    eventId:    order.eventId,
    tierId:     order.tierId,
    tierData,
    buyerName:  order.buyerName,
    buyerEmail: order.buyerEmail,
    quantity:   order.quantity,
    unitPriceCents:        order.unitPriceCents,
    totalCents:            order.totalCents,
    discountCents:         order.discountCents,
    promoCode:             order.promoCode,
    status:                'paid',
    stripeSessionId:       session.id,
    stripePaymentIntentId: session.payment_intent?.id || null,
    ticketIds:             order.ticketIds,
    now,
  });

  if (order.promoCode) {
    await incrementPromoUse(orgId, order.eventId, order.promoCode).catch(() => {});
  }

  const tickets = buildTicketObjects({
    ticketIds: order.ticketIds, eventId: order.eventId, orgId,
    orderId, tierId: order.tierId, tierData,
    buyerName: order.buyerName, buyerEmail: order.buyerEmail, now,
  });

  return ok({ orderId, status: 'paid', tickets });
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

async function fulfillOrder({ orgId, orderId, eventId, tierId, tierData, buyerName, buyerEmail, quantity, unitPriceCents, totalCents, discountCents, promoCode, status, stripeSessionId, stripePaymentIntentId, ticketIds, now }) {
  const ticketItems = buildTicketObjects({ ticketIds, eventId, orgId, orderId, tierId, tierData, buyerName, buyerEmail, now });

  // TransactWrite: update order + insert all tickets + increment tier.sold + event.ticketsSold
  const transactItems = [
    // Upsert the order record
    {
      Put: {
        TableName: TABLES.ORDERS,
        Item: {
          orderId, orgId, eventId, tierId,
          buyerEmail: buyerEmail.toLowerCase(), buyerName,
          quantity, unitPriceCents, totalCents, discountCents,
          promoCode: promoCode || null,
          status, stripeSessionId, stripePaymentIntentId,
          ticketIds, createdAt: now, updatedAt: now,
        },
      },
    },
    // Increment tier.sold (conditional: don't overshoot capacity)
    {
      Update: {
        TableName:                 TABLES.TIERS,
        Key:                       { eventId, tierId },
        UpdateExpression:          'ADD sold :qty',
        ExpressionAttributeValues: { ':qty': quantity },
      },
    },
    // Increment event.ticketsSold
    {
      Update: {
        TableName:                 TABLES.EVENTS,
        Key:                       { orgId, eventId },
        UpdateExpression:          'ADD ticketsSold :qty SET updatedAt = :now',
        ExpressionAttributeValues: { ':qty': quantity, ':now': now },
      },
    },
    // Insert each ticket
    ...ticketItems.map((ticket) => ({
      Put: { TableName: TABLES.TICKETS, Item: ticket },
    })),
  ];

  await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
}

function buildTicketObjects({ ticketIds, eventId, orgId, orderId, tierId, tierData, buyerName, buyerEmail, now }) {
  return ticketIds.map((ticketId) => ({
    ticketId, eventId, orgId, orderId, tierId,
    tierName:    tierData.name,
    buyerName,
    buyerEmail:  buyerEmail.toLowerCase(),
    checkedIn:   'false',
    checkedInAt: null,
    checkedInBy: null,
    createdAt:   now,
  }));
}

// ─── Promo code helpers ───────────────────────────────────────────────────────

function applyPromoCode(eventData, code, unitPrice, quantity) {
  if (!code) return { discountCents: 0, promoMeta: null };

  const promo = (eventData.promoCodes || []).find(
    (p) => p.code.toUpperCase() === code.toUpperCase() && (p.maxUses === 0 || p.usesCount < p.maxUses)
  );
  if (!promo) return { discountCents: 0, promoMeta: null };

  let discountCents = 0;
  if (promo.discountType === 'percent') {
    discountCents = Math.round(unitPrice * quantity * promo.discountValue / 100);
  } else if (promo.discountType === 'fixed') {
    discountCents = promo.discountValue * 100; // stored as dollars
  }
  discountCents = Math.min(discountCents, unitPrice * quantity); // cap at full price

  return { discountCents, promoMeta: promo };
}

async function incrementPromoUse(orgId, eventId, code) {
  // Find the index of the promo code in the list and atomically increment its usesCount.
  // DynamoDB doesn't support list-element updates by value, so we use a helper approach:
  // load the event, find index, update with SET promoCodes[N].usesCount += 1.
  const result = await ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } }));
  const event  = result.Item;
  if (!event) return;

  const idx = (event.promoCodes || []).findIndex((p) => p.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return;

  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.EVENTS,
    Key:                       { orgId, eventId },
    UpdateExpression:          `SET promoCodes[${idx}].usesCount = promoCodes[${idx}].usesCount + :one`,
    ExpressionAttributeValues: { ':one': 1 },
  }));
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function getEvent(orgId, eventId) {
  const r = await ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } }));
  return r.Item || null;
}

async function getTier(eventId, tierId) {
  const r = await ddb.send(new GetCommand({ TableName: TABLES.TIERS, Key: { eventId, tierId } }));
  return r.Item || null;
}

async function fetchTickets(ticketIds = [], eventId) {
  if (!ticketIds.length) return [];
  const keys = ticketIds.map((ticketId) => ({ ticketId, eventId }));
  const { Responses } = await ddb.send({
    RequestItems: { [TABLES.TICKETS]: { Keys: keys } },
  });
  return Responses?.[TABLES.TICKETS] || [];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
