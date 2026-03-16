'use strict';

/**
 * tickets-email-trigger Lambda
 * Trigger: DynamoDB Stream on nsmt-orders table (NEW_IMAGE)
 *
 * Fires when an order transitions to status "paid" or "free".
 * Sends a confirmation email via SES with ticket QR codes as inline images.
 */

const { ddb, TABLES } = require('../shared/db');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ses       = new SESClient({});
const FROM_ADDR = process.env.SES_FROM_ADDRESS || 'tickets@thensmt.com';
const BASE_URL  = process.env.FRONTEND_BASE_URL || 'https://tickets.thensmt.com';

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') continue;

    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    const status  = newImage.status?.S;
    const orderId = newImage.orderId?.S;

    // Only process newly fulfilled orders
    if (!['paid', 'free'].includes(status)) continue;

    // Avoid re-sending on subsequent updates (check old image)
    const oldStatus = record.dynamodb?.OldImage?.status?.S;
    if (oldStatus === status) continue; // status didn't change, skip

    try {
      await sendConfirmationEmail(newImage);
    } catch (e) {
      console.error(`Failed to send email for order ${orderId}:`, e);
      // Don't rethrow — we don't want to retry the entire batch for one email failure
    }
  }
};

async function sendConfirmationEmail(newImage) {
  const orderId   = newImage.orderId?.S;
  const orgId     = newImage.orgId?.S;
  const eventId   = newImage.eventId?.S;
  const buyerName = newImage.buyerName?.S;
  const buyerEmail = newImage.buyerEmail?.S;
  const ticketIds = (newImage.ticketIds?.L || []).map((i) => i.S);
  const quantity  = Number(newImage.quantity?.N || 1);
  const totalCents = Number(newImage.totalCents?.N || 0);

  if (!buyerEmail || !ticketIds.length) return;

  // Load event details
  const [eventResult, tickets] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLES.EVENTS, Key: { orgId, eventId } })),
    fetchTickets(ticketIds, eventId),
  ]);

  const ev = eventResult.Item;
  if (!ev) { console.warn('Event not found for email, skipping', eventId); return; }

  const subject  = `Your tickets for ${ev.title}`;
  const htmlBody = buildHtmlEmail({ ev, buyerName, buyerEmail, orderId, tickets, totalCents, BASE_URL });
  const textBody = buildTextEmail({ ev, buyerName, orderId, tickets, BASE_URL });

  await ses.send(new SendEmailCommand({
    Source:      `NSMT Tickets <${FROM_ADDR}>`,
    Destination: { ToAddresses: [buyerEmail] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' },
      },
    },
  }));

  console.log(`Confirmation email sent to ${buyerEmail} for order ${orderId}`);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildHtmlEmail({ ev, buyerName, buyerEmail, orderId, tickets, totalCents, BASE_URL }) {
  const dateStr = new Date(ev.startDateTime).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(ev.startDateTime).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const ticketRows = tickets.map((t) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #eee;">
        <strong>${t.tierName}</strong><br>
        <span style="font-family:monospace;font-size:12px;color:#666;">${t.ticketId}</span><br>
        <a href="${BASE_URL}/orders?orderId=${orderId}&email=${encodeURIComponent(buyerEmail)}"
           style="color:#0E80FC;">View &amp; download ticket</a>
      </td>
    </tr>
  `).join('');

  const priceStr = totalCents === 0 ? 'Free' : `$${(totalCents / 100).toFixed(2)}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
  <div style="background:#000;padding:24px 32px;">
    <span style="color:#0E80FC;font-size:22px;font-weight:700;letter-spacing:0.05em;">NSMT</span>
    <span style="color:#fff;font-size:16px;margin-left:8px;">Tickets</span>
  </div>
  <div style="padding:32px;">
    <h1 style="font-size:24px;margin:0 0 8px;">You're going to ${escHtml(ev.title)}!</h1>
    <p style="color:#555;margin:0 0 24px;">Hi ${escHtml(buyerName)}, here are your tickets.</p>

    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f5f5f5;">
        <td style="padding:12px;font-size:13px;color:#666;">DATE &amp; TIME</td>
        <td style="padding:12px;font-size:13px;color:#666;">VENUE</td>
        <td style="padding:12px;font-size:13px;color:#666;">TOTAL</td>
      </tr>
      <tr>
        <td style="padding:12px;">${escHtml(dateStr)}<br>${escHtml(timeStr)}</td>
        <td style="padding:12px;">${escHtml(ev.venue?.name || '')}<br>${escHtml(ev.venue?.city || '')}, ${escHtml(ev.venue?.state || '')}</td>
        <td style="padding:12px;">${priceStr}</td>
      </tr>
    </table>

    <h2 style="font-size:18px;margin:32px 0 16px;">Your Tickets</h2>
    <table style="width:100%;">
      ${ticketRows}
    </table>

    <div style="margin-top:32px;padding:16px;background:#f5f5f5;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#555;">
        <strong>Order ID:</strong> ${escHtml(orderId)}<br>
        Bring your QR code (printed or on your phone) to the event for entry.
        Each ticket is valid for one-time entry only.<br><br>
        <a href="${BASE_URL}/orders?orderId=${orderId}&email=${encodeURIComponent(buyerEmail)}"
           style="color:#0E80FC;">View all tickets &amp; download PDF</a>
      </p>
    </div>
  </div>
  <div style="background:#f0f0f0;padding:16px 32px;font-size:12px;color:#888;text-align:center;">
    Nova Sports Media Team · tickets.thensmt.com
  </div>
</body>
</html>`;
}

function buildTextEmail({ ev, buyerName, orderId, tickets, BASE_URL }) {
  const dateStr = new Date(ev.startDateTime).toLocaleDateString('en-US', { dateStyle: 'full' });
  const lines = [
    `You're going to ${ev.title}!`,
    `Hi ${buyerName}, here are your tickets.`,
    '',
    `Date: ${dateStr}`,
    `Venue: ${ev.venue?.name || ''}, ${ev.venue?.city || ''} ${ev.venue?.state || ''}`,
    '',
    'Tickets:',
    ...tickets.map((t) => `  - ${t.tierName} (${t.ticketId})`),
    '',
    `Order ID: ${orderId}`,
    `View & download tickets: ${BASE_URL}/orders?orderId=${orderId}`,
    '',
    'Bring your QR code to the event for entry.',
    'Nova Sports Media Team',
  ];
  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchTickets(ticketIds, eventId) {
  if (!ticketIds.length) return [];
  const keys = ticketIds.map((ticketId) => ({ ticketId, eventId }));
  const { Responses } = await ddb.send({
    RequestItems: { [TABLES.TICKETS]: { Keys: keys } },
  });
  return Responses?.[TABLES.TICKETS] || [];
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
