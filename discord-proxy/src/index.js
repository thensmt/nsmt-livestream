/**
 * NSMT Discord Webhook Proxy
 *
 * Cloudflare Worker that accepts authenticated POSTs from NSMT Apps Script
 * and forwards them to the Discord webhook. Exists because Discord's
 * Cloudflare WAF rate-limits Apps Script's default User-Agent, but accepts
 * a clean UA from any other source.
 *
 * Architecture:
 *   Apps Script
 *     --POST(body, X-NSMT-Auth: SHARED_SECRET)-->
 *   This worker
 *     --POST(body, User-Agent: NSMT-Proxy)-->
 *   Discord webhook
 *
 * Required secrets (set via `wrangler secret put`):
 *   DISCORD_WEBHOOK_URL  - full webhook URL including token
 *   SHARED_SECRET        - random string Apps Script also knows
 */

const PROXY_USER_AGENT = 'NSMT-Proxy/1.0 (https://nsmtsports.com)';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const auth = request.headers.get('X-NSMT-Auth');
    if (!auth || auth !== env.SHARED_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response('Worker misconfigured: DISCORD_WEBHOOK_URL not set', { status: 500 });
    }

    const body = await request.text();

    const upstream = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': PROXY_USER_AGENT,
      },
      body,
    });

    const upstreamBody = await upstream.text();

    return new Response(upstreamBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
