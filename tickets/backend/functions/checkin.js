'use strict';

/**
 * tickets-checkin Lambda
 * Route: POST /tickets/checkin
 *
 * This is the latency-critical path — must complete in <300ms.
 * Uses a DynamoDB conditional UpdateItem to atomically mark a ticket
 * as checked in, preventing double-scan race conditions.
 */

const { ddb, TABLES } = require('../shared/db');
const { ok, err }     = require('../shared/response');

const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb');

exports.handler = async (event) => {
  try {
    const body     = parseBody(event);
    const { ticketId, eventId, deviceId } = body;

    if (!ticketId || !eventId) return err('ticketId and eventId are required', 400);

    return await scanTicket(ticketId, eventId, deviceId || 'unknown');
  } catch (e) {
    console.error(e);
    return err('Internal server error', 500);
  }
};

async function scanTicket(ticketId, eventId, deviceId) {
  // Step 1: Fetch ticket (O(1) PK lookup)
  const result = await ddb.send(new GetCommand({
    TableName: TABLES.TICKETS,
    Key:       { ticketId, eventId },
  }));

  const ticket = result.Item;
  if (!ticket) {
    return ok({ result: 'invalid', message: 'Ticket not found' });
  }

  // Step 2: Already checked in — return info without writing
  if (ticket.checkedIn === 'true') {
    return ok({
      result:      'already_used',
      buyerName:   ticket.buyerName,
      tierName:    ticket.tierName,
      checkedInAt: ticket.checkedInAt,
      checkedInBy: ticket.checkedInBy,
    });
  }

  // Step 3: Atomically mark as checked in — condition prevents race with a second scanner
  const now = new Date().toISOString();
  try {
    await ddb.send(new UpdateCommand({
      TableName:                 TABLES.TICKETS,
      Key:                       { ticketId, eventId },
      UpdateExpression:          'SET checkedIn = :t, checkedInAt = :now, checkedInBy = :device',
      ConditionExpression:       'checkedIn = :f',  // only succeed if still unchecked
      ExpressionAttributeValues: { ':t': 'true', ':f': 'false', ':now': now, ':device': deviceId },
    }));
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      // Another scanner checked them in between our read and write — re-fetch for info
      const reread = await ddb.send(new GetCommand({ TableName: TABLES.TICKETS, Key: { ticketId, eventId } }));
      const t = reread.Item;
      return ok({
        result:      'already_used',
        buyerName:   t?.buyerName,
        tierName:    t?.tierName,
        checkedInAt: t?.checkedInAt,
        checkedInBy: t?.checkedInBy,
      });
    }
    throw e;
  }

  return ok({
    result:    'ok',
    buyerName: ticket.buyerName,
    tierName:  ticket.tierName,
    checkedInAt: now,
  });
}

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}
