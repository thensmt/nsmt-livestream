/**
 * NSMT Discord Webhook Proxy
 *
 * Cloudflare Worker that accepts authenticated POSTs from NSMT Apps Script
 * and forwards them to a Discord webhook. Exists because Discord's
 * Cloudflare WAF rate-limits Apps Script's default User-Agent, but accepts
 * a clean UA from any other source.
 *
 * Architecture:
 *   Apps Script
 *     --POST(body, X-NSMT-Auth: SHARED_SECRET, [X-NSMT-Target: name])-->
 *   This worker
 *     --POST(body, User-Agent: NSMT-Proxy)-->
 *   Discord webhook (chosen by target header)
 *
 * Routing:
 *   X-NSMT-Target: <NAME> selects the secret DISCORD_WEBHOOK_URL_<NAME>.
 *   No header (or unknown target) falls back to DISCORD_WEBHOOK_URL.
 *   Add a new target: `wrangler secret put DISCORD_WEBHOOK_URL_<NAME>`.
 *
 * Required secrets (set via `wrangler secret put`):
 *   SHARED_SECRET             - random string Apps Script also knows
 *   DISCORD_WEBHOOK_URL       - default webhook (currently #applications)
 *   DISCORD_WEBHOOK_URL_<X>   - per-target webhooks (e.g. CRITIQUE)
 */

const PROXY_USER_AGENT = 'NSMT-Proxy/1.0 (https://nsmtsports.com)';

export default {
  async fetch(request, env) {
    try {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      const auth = request.headers.get('X-NSMT-Auth');
      if (!auth || auth !== env.SHARED_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Pick the upstream webhook. X-NSMT-Target selects DISCORD_WEBHOOK_URL_<NAME>.
      // Sanitize to [A-Z0-9_] so a header can't trigger arbitrary env lookups.
      const rawTarget = (request.headers.get('X-NSMT-Target') || '').toUpperCase();
      const target = rawTarget.replace(/[^A-Z0-9_]/g, '');
      const targetedKey = target ? `DISCORD_WEBHOOK_URL_${target}` : null;
      const webhookUrl = (targetedKey && env[targetedKey]) || env.DISCORD_WEBHOOK_URL;

      if (!webhookUrl) {
        const label = targetedKey || 'DISCORD_WEBHOOK_URL';
        return new Response(`Worker misconfigured: ${label} not set`, { status: 500 });
      }

      // Strip accidental whitespace/newlines that may have been pasted into
      // the secret. fetch() throws TypeError if the URL has any.
      const upstreamUrl = webhookUrl.trim();

      const body = await request.text();

      const upstream = await fetch(upstreamUrl, {
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
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      const stack = err && err.stack ? err.stack : '';
      return new Response(
        'Worker exception: ' + msg + '\n\n' + stack,
        { status: 500, headers: { 'Content-Type': 'text/plain' } }
      );
    }
  },
};
