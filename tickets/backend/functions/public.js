'use strict';

/**
 * tickets-public Lambda
 * Routes:
 *   GET /tickets/events               — list published events for an org
 *   GET /tickets/events/{slug}        — event detail + tiers
 *   GET /tickets/orders?email=        — list all orders for an email (My Tickets / signed-in view)
 *   GET /tickets/order/{orderId}      — single order lookup (requires ?email=)
 */

const { ddb, TABLES } = require('../shared/db');
const { publicOrgId }  = require('../shared/auth');
const { ok, err }      = require('../shared/response');

const {
  QueryCommand,
  GetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');

// ─── Router ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const path   = event.path || event.rawPath || '';

  try {
    if (method === 'GET' && path === '/tickets/events') {
      return await listEvents(event);
    }
    if (method === 'GET' && path.startsWith('/tickets/events/')) {
      const slug = decodeURIComponent(path.split('/tickets/events/')[1]);
      return await getEvent(event, slug);
    }
    if (method === 'GET' && path === '/tickets/orders') {
      return await listOrdersByEmail(event);
    }
    if (method === 'GET' && path.startsWith('/tickets/order/')) {
      const orderId = path.split('/tickets/order/')[1];
      return await getOrder(event, orderId);
    }
    return err('Not found', 404);
  } catch (e) {
    console.error(e);
    if (e.statusCode) return err(e.message, e.statusCode);
    return err('Internal server error', 500);
  }
};

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listEvents(event) {
  const orgId = publicOrgId(event);

  const result = await ddb.send(new QueryCommand({
    TableName:                 TABLES.EVENTS,
    KeyConditionExpression:    'orgId = :org',
    FilterExpression:          '#st = :published',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':org': orgId, ':published': 'published' },
  }));

  const events = await Promise.all((result.Items || []).map(enrichWithTiers));
  // Sort ascending by startDateTime
  events.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

  return ok({ events });
}

async function getEvent(event, slug) {
  const orgId = publicOrgId(event);

  // Resolve slug → eventId via GSI
  const slugResult = await ddb.send(new QueryCommand({
    TableName:                 TABLES.EVENTS,
    IndexName:                 'slug-index',
    KeyConditionExpression:    'orgId = :org AND slug = :slug',
    FilterExpression:          '#st = :published',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':org': orgId, ':slug': slug, ':published': 'published' },
    Limit: 1,
  }));

  if (!slugResult.Items?.length) return err('Event not found', 404);

  const eventData = slugResult.Items[0];
  const enriched  = await enrichWithTiers(eventData);
  return ok({ event: enriched });
}

async function getOrder(event, orderId) {
  const qs    = event.queryStringParameters || {};
  const email = (qs.email || '').toLowerCase().trim();

  if (!orderId || !email) return err('orderId and email are required', 400);

  const orgId = publicOrgId(event);

  const result = await ddb.send(new GetCommand({
    TableName: TABLES.ORDERS,
    Key: { orderId, orgId },
  }));

  const order = result.Item;
  if (!order) return err('Order not found', 404);
  if (order.buyerEmail.toLowerCase() !== email) return err('Order not found', 404); // don't leak existence

  if (!['paid', 'free'].includes(order.status)) {
    return err('Order not yet fulfilled', 400);
  }

  // Fetch associated tickets
  const tickets = await fetchTickets(order.ticketIds, order.eventId);
  return ok({ order: sanitizeOrder(order), tickets });
}

// ── GET /tickets/orders?email= ────────────────────────────────────────────────

async function listOrdersByEmail(event) {
  const qs    = event.queryStringParameters || {};
  const email = (qs.email || '').toLowerCase().trim();

  if (!email) return err('email is required', 400);

  const result = await ddb.send(new QueryCommand({
    TableName:                 TABLES.ORDERS,
    IndexName:                 'email-index',
    KeyConditionExpression:    'buyerEmail = :email',
    FilterExpression:          '#st IN (:paid, :free)',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':email': email, ':paid': 'paid', ':free': 'free' },
    ScanIndexForward:          false, // newest first
  }));

  const rawOrders = result.Items || [];

  // Fetch tickets for each order in parallel (batched per order)
  const orders = await Promise.all(
    rawOrders.map(async (order) => {
      const tickets = await fetchTickets(order.ticketIds || [], order.eventId);
      return { order: sanitizeOrder(order), tickets };
    })
  );

  return ok({ orders });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function enrichWithTiers(eventData) {
  const tiersResult = await ddb.send(new QueryCommand({
    TableName:                 TABLES.TIERS,
    KeyConditionExpression:    'eventId = :eid',
    FilterExpression:          'active = :t',
    ExpressionAttributeValues: { ':eid': eventData.eventId, ':t': true },
  }));

  const tiers = (tiersResult.Items || [])
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ tierId, name, description, price, capacity, sold, sortOrder }) => ({
      tierId, name, description, price, capacity, sold, sortOrder,
      available: capacity === 0 ? null : Math.max(0, capacity - sold),
    }));

  // Strip internal fields before returning publicly
  const { promoCodes: _pc, ...pub } = eventData;
  return { ...pub, tiers };
}

async function fetchTickets(ticketIds = [], eventId) {
  if (!ticketIds.length) return [];
  // BatchGet — max 100 per call; tickets per order are always small
  const keys = ticketIds.map((ticketId) => ({ ticketId, eventId }));
  const { Responses } = await ddb.send({
    RequestItems: { [TABLES.TICKETS]: { Keys: keys } },
  });
  return (Responses?.[TABLES.TICKETS] || []).map(({ ticketId, tierId, tierName, buyerName, checkedIn }) => ({
    ticketId, tierId, tierName, buyerName, checkedIn: checkedIn === 'true',
  }));
}

function sanitizeOrder({ orderId, eventId, tierId, buyerName, buyerEmail, quantity, totalCents, discountCents, status, createdAt }) {
  return { orderId, eventId, tierId, buyerName, buyerEmail, quantity, totalCents, discountCents, status, createdAt };
}
