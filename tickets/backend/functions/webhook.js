'use strict';

/**
 * tickets-stripe-webhook Lambda
 * Route: POST /tickets/stripe/webhook
 *
 * Handles:
 *   checkout.session.completed → fulfill paid order (idempotent)
 *   charge.refunded            → mark order as refunded
 */

const { ddb, TABLES } = require('../shared/db');
const { ok, err }     = require('../shared/response');

const { GetCommand, PutCommand, UpdateCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const Stripe = require('stripe');

const stripe        = Stripe(process.env.STRIPE_SECRET_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const sig  = (event.headers || {})['stripe-signature'];
  const body = event.body; // must be raw string — do NOT parse JSON first

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.warn('Webhook signature verification failed:', e.message);
    return err('Invalid signature', 400);
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleSessionCompleted(stripeEvent.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(stripeEvent.data.object);
        break;
      default:
        // Ignore other event types
        break;
    }
    return ok({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    // Return 200 to prevent Stripe from retrying non-recoverable errors.
    // For transient errors (DynamoDB throttle), return 500 so Stripe retries.
    if (e.name === 'ProvisionedThroughputExceededException') {
      return { statusCode: 500, body: JSON.stringify({ error: 'Throttled' }) };
    }
    return ok({ received: true, warning: e.message });
  }
};

// ─── checkout.session.completed ──────────────────────────────────────────────

async function handleSessionCompleted(session) {
  const { orderId, orgId } = session.metadata || {};
  if (!orderId || !orgId) {
    console.warn('checkout.session.completed missing orderId/orgId in metadata', session.id);
    return;
  }

  // Load the pending order
  const result = await ddb.send(new GetCommand({
    TableName: TABLES.ORDERS,
    Key:       { orderId, orgId },
  }));
  const order = result.Item;
  if (!order) {
    console.warn('Order not found for session', session.id, orderId);
    return;
  }

  // Idempotency: already fulfilled by the success_url redirect
  if (order.status === 'paid') {
    console.log('Order already paid, skipping webhook fulfillment', orderId);
    return;
  }

  const tierResult = await ddb.send(new GetCommand({ TableName: TABLES.TIERS, Key: { eventId: order.eventId, tierId: order.tierId } }));
  const tierData   = tierResult.Item;
  if (!tierData) {
    console.error('Tier not found for order', orderId, order.tierId);
    return;
  }

  const now      = new Date().toISOString();
  const ticketItems = buildTicketObjects({ ticketIds: order.ticketIds, eventId: order.eventId, orgId, orderId, tierId: order.tierId, tierData, buyerName: order.buyerName, buyerEmail: order.buyerEmail, now });

  const transactItems = [
    {
      Put: {
        TableName: TABLES.ORDERS,
        Item: {
          ...order,
          status:                'paid',
          stripeSessionId:       session.id,
          stripePaymentIntentId: session.payment_intent,
          updatedAt:             now,
        },
        // Idempotency: only write if still pending (race guard against confirm endpoint)
        ConditionExpression: '#st = :pending',
        ExpressionAttributeNames:  { '#st': 'status' },
        ExpressionAttributeValues: { ':pending': 'pending' },
      },
    },
    {
      Update: {
        TableName:                 TABLES.TIERS,
        Key:                       { eventId: order.eventId, tierId: order.tierId },
        UpdateExpression:          'ADD sold :qty',
        ExpressionAttributeValues: { ':qty': order.quantity },
      },
    },
    {
      Update: {
        TableName:                 TABLES.EVENTS,
        Key:                       { orgId, eventId: order.eventId },
        UpdateExpression:          'ADD ticketsSold :qty SET updatedAt = :now',
        ExpressionAttributeValues: { ':qty': order.quantity, ':now': now },
      },
    },
    ...ticketItems.map((ticket) => ({
      Put: { TableName: TABLES.TICKETS, Item: ticket },
    })),
  ];

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
    console.log('Order fulfilled via webhook:', orderId);
  } catch (e) {
    // ConditionalCheckFailed means the confirm endpoint already fulfilled it — fine
    if (e.name === 'TransactionCanceledException') {
      console.log('Order already fulfilled by confirm endpoint, skipping:', orderId);
      return;
    }
    throw e;
  }
}

// ─── charge.refunded ─────────────────────────────────────────────────────────

async function handleChargeRefunded(charge) {
  // Find order by payment intent ID — scan event-index GSI not ideal.
  // Alternative: store paymentIntentId in order during checkout, then look up.
  // We stored it in stripePaymentIntentId during fulfillment, so query via scan is needed
  // unless we add a GSI. For v1, scan orders by eventId from charge metadata.
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) return;

  // Retrieve the payment intent to get our metadata
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const { orderId, orgId } = pi.metadata || {};
  if (!orderId || !orgId) return;

  await ddb.send(new UpdateCommand({
    TableName:                 TABLES.ORDERS,
    Key:                       { orderId, orgId },
    UpdateExpression:          'SET #st = :refunded, updatedAt = :now',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':refunded': 'refunded', ':now': new Date().toISOString() },
  }));
  console.log('Order marked refunded via webhook:', orderId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
