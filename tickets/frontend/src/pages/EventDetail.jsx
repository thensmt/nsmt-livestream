import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../App';
import '../styles.css';

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function centsToDisplay(cents) {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
}

export default function EventDetail() {
  const { slug } = useParams();
  const [ev, setEv]             = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showDrawer, setShowDrawer]     = useState(false);

  useEffect(() => {
    fetch(api(`/events/${slug}`))
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => { setEv(d.event); if (d.event.tiers?.length) setSelectedTier(d.event.tiers[0]); })
      .catch(() => setEv(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <><Nav /><div className="loading">Loading…</div></>
  );
  if (!ev) return (
    <><Nav /><div className="not-found"><h2>Event not found</h2><p>This event may no longer be available.</p></div></>
  );

  const availableTiers = (ev.tiers || []).filter((t) => t.active !== false);

  return (
    <>
      <Nav />
      <div className="page">
        {ev.coverImageUrl && <img className="event-hero" src={ev.coverImageUrl} alt={ev.title} />}
        <h1 className="event-title">{ev.title}</h1>
        <div className="event-meta">
          <span>📅 {fmtDateTime(ev.startDateTime)}</span>
          {ev.venue?.name && (
            <span>📍 {ev.venue.mapUrl
              ? <a href={ev.venue.mapUrl} target="_blank" rel="noopener noreferrer">{ev.venue.name}, {ev.venue.city}</a>
              : `${ev.venue.name}, ${ev.venue.city}`
            }</span>
          )}
        </div>
        {ev.description && <p className="event-description">{ev.description}</p>}

        {availableTiers.length > 0 && (
          <>
            <div className="section-label">Select Tickets</div>
            {availableTiers.map((tier) => {
              const soldOut = tier.capacity > 0 && tier.sold >= tier.capacity;
              const lowStock = !soldOut && tier.capacity > 0 && (tier.capacity - tier.sold) <= Math.ceil(tier.capacity * 0.2);
              return (
                <div
                  key={tier.tierId}
                  className={`tier-card${selectedTier?.tierId === tier.tierId ? ' selected' : ''}${soldOut ? ' sold-out' : ''}`}
                  onClick={() => !soldOut && setSelectedTier(tier)}
                >
                  <div className="tier-row">
                    <span className="tier-name">{tier.name}</span>
                    <span className="tier-price">{centsToDisplay(tier.price)}</span>
                  </div>
                  {tier.description && <div className="tier-desc">{tier.description}</div>}
                  {soldOut && <div className="tier-avail">Sold out</div>}
                  {lowStock && <div className="tier-avail low">Only {tier.capacity - tier.sold} left</div>}
                </div>
              );
            })}

            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              disabled={!selectedTier}
              onClick={() => setShowDrawer(true)}
            >
              Get Tickets
            </button>
          </>
        )}

        {availableTiers.length === 0 && (
          <div className="not-found"><p>Tickets are not available for this event.</p></div>
        )}
      </div>

      {showDrawer && (
        <CheckoutDrawer
          event={ev}
          tier={selectedTier}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </>
  );
}

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand"><span className="blue">NSMT</span> Tickets</div>
      <Link to="/" className="nav-back">← All Events</Link>
    </nav>
  );
}

// ── Checkout Drawer ────────────────────────────────────────────────────────────

function CheckoutDrawer({ event: ev, tier, onClose }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [qty, setQty]           = useState(1);
  const [promo, setPromo]       = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const unitPrice  = tier.price;
  const subtotal   = unitPrice * qty;
  const total      = Math.max(0, subtotal - discount);

  async function applyPromo() {
    if (!promo) return;
    setPromoMsg('Checking…');
    setDiscount(0);
    try {
      const r = await fetch(api('/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.eventId, tierId: tier.tierId, quantity: qty, buyerName: name || 'Preview', buyerEmail: email || 'preview@example.com', promoCode: promo, dryRun: true }),
      });
      const d = await r.json();
      if (d.discountCents) {
        setDiscount(d.discountCents);
        setPromoMsg(`✓ Code applied — saving $${(d.discountCents / 100).toFixed(2)}`);
      } else {
        setPromoMsg('Invalid or expired code');
      }
    } catch {
      setPromoMsg('Could not validate code');
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await fetch(api('/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.eventId, tierId: tier.tierId, quantity: qty, buyerName: name.trim(), buyerEmail: email.trim(), promoCode: promo || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Something went wrong.'); setLoading(false); return; }

      if (d.sessionUrl) {
        window.location.href = d.sessionUrl; // redirect to Stripe
      } else {
        // Free order fulfilled inline
        window.location.href = `/orders?orderId=${d.orderId}&email=${encodeURIComponent(email.trim())}`;
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <h2>Get Tickets — {ev.title}</h2>

        <div className="form-field">
          <label>Quantity</label>
          <div className="qty-row">
            <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="qty-val">{qty}</span>
            <button className="qty-btn" onClick={() => setQty((q) => Math.min(8, q + 1))}>+</button>
            <span style={{ marginLeft: 8, color: '#71717a', fontSize: 14 }}>{tier.name}</span>
          </div>
        </div>

        <div className="form-field">
          <label>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" />
        </div>

        <div className="form-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" autoComplete="email" />
        </div>

        <div className="form-field">
          <label>Promo Code (optional)</label>
          <div className="promo-row">
            <input type="text" value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoMsg(''); setDiscount(0); }} placeholder="NSMT10" autoComplete="off" autoCapitalize="characters" />
            <button className="promo-apply" onClick={applyPromo}>Apply</button>
          </div>
          {promoMsg && <div className={`discount-badge`} style={{ color: discount > 0 ? '#22c55e' : '#ef4444' }}>{promoMsg}</div>}
        </div>

        <div className="order-summary">
          <div className="order-row"><span>{qty}× {tier.name}</span><span>${(subtotal / 100).toFixed(2)}</span></div>
          {discount > 0 && <div className="order-row" style={{ color: '#22c55e' }}><span>Discount</span><span>−${(discount / 100).toFixed(2)}</span></div>}
          <div className="order-row total"><span>Total</span><span>{total === 0 ? 'Free' : `$${(total / 100).toFixed(2)}`}</span></div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Processing…' : total === 0 ? 'Get Free Tickets' : `Pay $${(total / 100).toFixed(2)}`}
        </button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
