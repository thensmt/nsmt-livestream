'use strict';

/**
 * tickets-admin Lambda (Cognito JWT required on all routes)
 * Routes:
 *   GET    /tickets/admin/events
 *   POST   /tickets/admin/events
 *   PUT    /tickets/admin/events/{eventId}
 *   DELETE /tickets/admin/events/{eventId}
 *   POST   /tickets/admin/events/{eventId}/tiers
 *   PUT    /tickets/admin/events/{eventId}/tiers/{tierId}
 *   DELETE /tickets/admin/events/{eventId}/tiers/{tierId}
 *   GET    /tickets/admin/events/{eventId}/orders
 *   GET    /tickets/admin/events/{eventId}/summary
 *   POST   /tickets/admin/events/{eventId}/promocodes
 *   DELETE /tickets/admin/events/{eventId}/promocodes/{code}
 *   GET    /tickets/admin/events/{eventId}/ticketIds    (used by check-in PWA on load)
 *   POST   /tickets/admin/orders/{orderId}/refund
 */

const { ddb, TABLES } = require('../shared/db');
const { requireAuth } = require('../shared/auth');
const ids             = require('../shared/ids');
const { ok, err }     = require('../shared/response');

const {
  QueryCommand, GetCommand, PutCommand,
  UpdateCommand, DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Router ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  try {
    const caller = await requireAuth(event);
    return await route(event, caller);
  } catch (e) {
    console.error(e);
    if (e.statusCode) return err(e.message, e.statusCode);
    return err('Internal server error', 500);
  }
};

async function route(event, caller) {
  const method  = event.httpMethod || event.requestContext?.http?.method;
  const path    = event.path || event.rawPath || '';
  const { orgId } = caller;

  // Parse path segments after /tickets/admin/
  const tail = path.replace(/^\/tickets\/admin\//, '');
  const segs = tail.split('/');

  // /tickets/admin/events
  if (segs[0] === 'events') {
    const eventId = segs[1];
    const sub     = segs[2]; // "tiers" | "orders" | "summary" | "promocodes" | "ticketIds"
    const subId   = segs[3];

    if (!eventId) {
      if (method === 'GET')  return listEvents(orgId);
      if (method === 'POST') return createEvent(orgId, event);
    }
    if (eventId && !sub) {
      if (method === 'GET')    return getEvent(orgId, eventId);
      if (method === 'PUT')    return updateEvent(orgId, eventId, event);
      if (method === 'DELETE') return deleteEvent(orgId, eventId);
    }
    if (eventId && sub === 'tiers') {
      if (!subId && method === 'POST') return createTier(orgId, eventId, event);
      if (subId  && method === 'PUT')  return updateTier(eventId, subId, event);
      if (subId  && method === 'DELETE') return deleteTier(eventId, subId);
    }
    if (eventId && sub === 'orders' && method === 'GET') {
      return listOrders(eventId, event);
    }
    if (eventId && sub === 'summary' && method === 'GET') {
      return eventSummary(orgId, eventId);
    }
    if (eventId && sub === 'promocodes') {
      if (method === 'POST')   return addPromoCode(orgId, eventId, event);
      if (method === 'DELETE' && subId) return removePromoCode(orgId, eventId, decodeURIComponent(subId));
    }
    if (eventId && sub === 'ticketIds' && method === 'GET') {
      return listTicketIds(eventId);
    }
  }

  // /tickets/admin/orders/{orderId}/refund
  if (segs[0] === 'orders' && segs[2] === 'refund' && method === 'POST') {
    return refundOrder(orgId, segs[1]);
  }

  return err('Not found', 404);
}

// ─── Event CRUD ───────────────────────────────────────────────────────────────

async function listEvents(orgId) {
  const result = await ddb.send(new QueryCommand({
    TableName:                 TABLES.EVENTS,
    KeyConditionExpression:    'orgId = :org',
    ExpressionAttributeValues: { ':org': orgId },
  }));
  const events = (result.Items || []).sort((a, b) => a.startDateTime?.localeCompare(b.startDateTime));
  return ok({ events });
}

async function getEvent(orgId, eventId) {
  const r = await ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } }));
  if (!r.Item) return err('Event not found', 404);
  const tiers = await listTiersForEvent(eventId);
  return ok({ event: r.Item, tiers });
}

async function createEvent(orgId, event) {
  const body = parseBody(event);
  const { title, slug, description, startDateTime, endDateTime, venue, capacity = 0, coverImageUrl = '' } = body;
  if (!title || !slug || !startDateTime) return err('title, slug, and startDateTime are required', 400);

  const eventId = ids.eventId();
  const now     = new Date().toISOString();
  const item    = {
    orgId, eventId, title, slug, description: description || '',
    startDateTime, endDateTime: endDateTime || null,
    venue: venue || {}, status: 'draft', coverImageUrl,
    capacity, ticketsSold: 0, promoCodes: [],
    createdAt: now, updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: TABLES.EVENTS, Item: item }));
  return ok({ event: item }, 201);
}

async function updateEvent(orgId, eventId, event) {
  const body = parseBody(event);
  const allowed = ['title', 'slug', 'description', 'startDateTime', 'endDateTime', 'venue', 'status', 'coverImageUrl', 'capacity'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return err('No updatable fields provided', 400);

  updates.updatedAt = new Date().toISOString();

  const { expr, names, values } = buildUpdateExpr(updates);
  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.EVENTS,
    Key:                       { orgId, eventId },
    UpdateExpression:          expr,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values,
  }));
  return ok({ updated: true });
}

async function deleteEvent(orgId, eventId) {
  await ddb.send(new DeleteCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } }));
  return ok({ deleted: true });
}

// ─── Tier CRUD ────────────────────────────────────────────────────────────────

async function createTier(orgId, eventId, event) {
  const body = parseBody(event);
  const { name, description = '', price = 0, capacity = 0, sortOrder = 0 } = body;
  if (!name) return err('name is required', 400);

  const tierId = ids.tierId();
  const item   = { eventId, tierId, orgId, name, description, price, capacity, sold: 0, sortOrder, active: true };
  await ddb.send(new PutCommand({ TableName: TABLES.TIERS, Item: item }));
  return ok({ tier: item }, 201);
}

async function updateTier(eventId, tierId, event) {
  const body    = parseBody(event);
  const allowed = ['name', 'description', 'price', 'capacity', 'sortOrder', 'active'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return err('No updatable fields provided', 400);

  const { expr, names, values } = buildUpdateExpr(updates);
  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.TIERS,
    Key:                       { eventId, tierId },
    UpdateExpression:          expr,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values,
  }));
  return ok({ updated: true });
}

async function deleteTier(eventId, tierId) {
  await ddb.send(new DeleteCommand({ TableName: TABLES.TIERS, Key: { eventId, tierId } }));
  return ok({ deleted: true });
}

async function listTiersForEvent(eventId) {
  const result = await ddb.send(new QueryCommand({
    TableName:                 TABLES.TIERS,
    KeyConditionExpression:    'eventId = :eid',
    ExpressionAttributeValues: { ':eid': eventId },
  }));
  return (result.Items || []).sort((a, b) => a.sortOrder - b.sortOrder);
}

// ─── Orders ──────────────────────────────────────────────────────────────────

async function listOrders(eventId, event) {
  const qs = event.queryStringParameters || {};
  const result = await ddb.send(new QueryCommand({
    TableName:                 TABLES.ORDERS,
    IndexName:                 'event-index',
    KeyConditionExpression:    'eventId = :eid',
    ExpressionAttributeValues: { ':eid': eventId },
    ScanIndexForward:          false, // newest first
    Limit:                     parseInt(qs.limit || '100', 10),
    ...(qs.cursor ? { ExclusiveStartKey: JSON.parse(Buffer.from(qs.cursor, 'base64url').toString()) } : {}),
  }));
  const cursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
    : null;
  return ok({ orders: result.Items || [], cursor });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

async function eventSummary(orgId, eventId) {
  const [eventResult, tiers, checkedIn, total] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } })),
    listTiersForEvent(eventId),
    countTickets(eventId, 'true'),
    countTickets(eventId, 'false').then((n) => n), // will add to checked-in below
  ]);

  const event = eventResult.Item;
  const totalTickets = checkedIn + total;
  const revenueCents = tiers.reduce((sum, t) => sum + (t.price * t.sold), 0);

  return ok({
    title:        event?.title,
    ticketsSold:  event?.ticketsSold || 0,
    checkedIn,
    totalTickets,
    revenueCents,
    tiers: tiers.map(({ tierId, name, price, sold, capacity }) => ({ tierId, name, price, sold, capacity })),
  });
}

async function countTickets(eventId, checkedIn) {
  const r = await ddb.send(new QueryCommand({
    TableName:                 TABLES.TICKETS,
    IndexName:                 'event-checkin-index',
    KeyConditionExpression:    'eventId = :eid AND checkedIn = :ci',
    ExpressionAttributeValues: { ':eid': eventId, ':ci': checkedIn },
    Select:                    'COUNT',
  }));
  return r.Count || 0;
}

// ─── Promo codes ──────────────────────────────────────────────────────────────

async function addPromoCode(orgId, eventId, event) {
  const body = parseBody(event);
  const { code, discountType, discountValue, maxUses = 0 } = body;
  if (!code || !discountType || discountValue == null) return err('code, discountType, and discountValue are required', 400);
  if (!['percent', 'fixed'].includes(discountType)) return err("discountType must be 'percent' or 'fixed'", 400);

  const promo = { code: code.toUpperCase(), discountType, discountValue, maxUses, usesCount: 0 };

  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.EVENTS,
    Key:                       { orgId, eventId },
    UpdateExpression:          'SET promoCodes = list_append(if_not_exists(promoCodes, :empty), :promo), updatedAt = :now',
    ExpressionAttributeValues: { ':promo': [promo], ':empty': [], ':now': new Date().toISOString() },
  }));
  return ok({ promoCode: promo }, 201);
}

async function removePromoCode(orgId, eventId, code) {
  const r = await ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } }));
  if (!r.Item) return err('Event not found', 404);

  const idx = (r.Item.promoCodes || []).findIndex((p) => p.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return err('Promo code not found', 404);

  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.EVENTS,
    Key:                       { orgId, eventId },
    UpdateExpression:          `REMOVE promoCodes[${idx}]`,
    ExpressionAttributeValues: {},
  }));
  return ok({ deleted: true });
}

// ─── Ticket ID list (for check-in PWA session init) ──────────────────────────

async function listTicketIds(eventId) {
  // Paginate to get all ticket IDs for this event
  const ids = [];
  let cursor;
  do {
    const result = await ddb.send(new QueryCommand({
      TableName:                 TABLES.TICKETS,
      IndexName:                 'event-checkin-index',
      KeyConditionExpression:    'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
      ProjectionExpression:      'ticketId',
      ...(cursor ? { ExclusiveStartKey: cursor } : {}),
    }));
    (result.Items || []).forEach((item) => ids.push(item.ticketId));
    cursor = result.LastEvaluatedKey;
  } while (cursor);

  return ok({ ticketIds: ids });
}

// ─── Refund ───────────────────────────────────────────────────────────────────

async function refundOrder(orgId, orderId) {
  const r = await ddb.send(new GetCommand({ TableName: TABLES.ORDERS, Key: { orderId, orgId } }));
  const order = r.Item;
  if (!order) return err('Order not found', 404);
  if (order.status === 'refunded') return err('Order already refunded', 409);
  if (order.status !== 'paid')     return err('Only paid orders can be refunded', 400);
  if (!order.stripePaymentIntentId) return err('No Stripe payment intent on this order', 400);

  await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });

  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.ORDERS,
    Key:                       { orderId, orgId },
    UpdateExpression:          'SET #st = :refunded, updatedAt = :now',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':refunded': 'refunded', ':now': new Date().toISOString() },
  }));

  return ok({ refunded: true });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

function buildUpdateExpr(updates) {
  const names  = {};
  const values = {};
  const parts  = [];
  for (const [key, val] of Object.entries(updates)) {
    const k = `#f_${key}`;
    const v = `:v_${key}`;
    names[k]  = key;
    values[v] = val;
    parts.push(`${k} = ${v}`);
  }
  return { expr: `SET ${parts.join(', ')}`, names, values };
}
