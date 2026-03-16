import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../App';
import { useAuth } from '../AuthContext';
import '../styles.css';

export default function OrderLookup() {
  const [params]  = useSearchParams();
  const { user, loading: authLoading, signIn } = useAuth();

  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [email,   setEmail]   = useState(params.get('email')   || '');
  const [orders,  setOrders]  = useState(null);  // array of {order, tickets} when signed in
  const [data,    setData]    = useState(null);   // single order lookup result
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const qrRefs = useRef({});

  // When signed in: auto-load all orders for this user's email
  useEffect(() => {
    if (authLoading || !user) return;
    loadAllOrders(user.email);
  }, [user, authLoading]);

  // Auto-lookup if URL params are pre-filled (from confirmation email link)
  useEffect(() => {
    if (params.get('orderId') && params.get('email') && !user) {
      lookupSingle(params.get('orderId'), params.get('email'));
    }
  }, []);

  // Render QR codes whenever ticket data changes
  useEffect(() => {
    const allTickets = [
      ...(data?.tickets || []),
      ...(orders || []).flatMap((o) => o.tickets || []),
    ];
    allTickets.forEach((t) => {
      const canvas = qrRefs.current[t.ticketId];
      if (canvas) QRCode.toCanvas(canvas, t.ticketId, { width: 160, margin: 1 });
    });
  }, [data, orders]);

  async function loadAllOrders(emailAddr) {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(api(`/orders?email=${encodeURIComponent(emailAddr)}`));
      const d = await resp.json();
      if (!resp.ok) { setError(d.error || 'Could not load orders.'); return; }
      setOrders(d.orders || []);
    } catch {
      setError('Network error loading your tickets.');
    } finally {
      setLoading(false);
    }
  }

  async function lookupSingle(oid, em) {
    if (!oid?.trim() || !em?.trim()) { setError('Both fields are required.'); return; }
    setError('');
    setLoading(true);
    setData(null);
    try {
      const resp = await fetch(api(`/order/${oid.trim()}?email=${encodeURIComponent(em.trim())}`));
      const d = await resp.json();
      if (!resp.ok) { setError(d.error || 'Order not found.'); return; }
      setData(d);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Signed-in view ──────────────────────────────────────────────────────────
  if (!authLoading && user) {
    return (
      <>
        <NavBar user={user} />
        <div className="page" style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 20 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>My Tickets</h1>
            <span style={{ fontSize: 14, color: '#71717a' }}>{user.email}</span>
          </div>

          {loading && <div className="loading">Loading your tickets…</div>}
          {error   && <div className="error-msg">{error}</div>}

          {orders?.length === 0 && !loading && (
            <div className="not-found">
              <p>No tickets found for this account.</p>
              <Link to="/" className="nav-back" style={{ display: 'inline-block', marginTop: 12 }}>Browse events →</Link>
            </div>
          )}

          {(orders || []).map((o) => (
            <OrderSection key={o.order.orderId} order={o.order} tickets={o.tickets} qrRefs={qrRefs} />
          ))}
        </div>
      </>
    );
  }

  // ── Signed-out view: manual lookup ──────────────────────────────────────────
  return (
    <>
      <NavBar user={null} signIn={signIn} />
      <div className="page" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 28, marginBottom: 6 }}>My Tickets</h1>
        <p style={{ color: '#71717a', marginBottom: 20 }}>
          Sign in with Google to see all your tickets automatically, or enter your order details below.
        </p>

        <button
          onClick={signIn}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '12px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <GoogleIcon /> Sign in with Google
        </button>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 24, marginBottom: 16, color: '#71717a', fontSize: 13 }}>
          Or look up by order ID:
        </div>

        <div className="form-field">
          <label>Order ID</label>
          <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ord_..." autoCapitalize="none" autoCorrect="off" />
        </div>
        <div className="form-field">
          <label>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" autoComplete="email" />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => lookupSingle(orderId, email)} disabled={loading}>
          {loading ? 'Looking up…' : 'Find My Tickets'}
        </button>

        {data && (
          <div style={{ marginTop: 32 }}>
            <OrderSection order={data.order} tickets={data.tickets} qrRefs={qrRefs} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Shared order/ticket display ────────────────────────────────────────────────

function OrderSection({ order, tickets, qrRefs }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, color: '#71717a', marginBottom: 8 }}>
        Order <code>{order.orderId}</code> · {new Date(order.createdAt).toLocaleDateString()}
      </div>
      {(tickets || []).map((t) => (
        <div key={t.ticketId} className="ticket-card">
          <div className="ticket-info">
            <div className="ticket-tier">{t.tierName}</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{t.buyerName}</div>
            <div className="ticket-id">{t.ticketId}</div>
            {t.checkedIn && <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>✓ Checked in</div>}
          </div>
          <div className="ticket-qr">
            <canvas ref={(el) => el && (qrRefs.current[t.ticketId] = el)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NavBar({ user, signIn }) {
  return (
    <nav className="nav">
      <div className="nav-brand"><span className="blue">NSMT</span> Tickets</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" className="nav-back">All Events</Link>
        {!user && signIn && (
          <button onClick={signIn} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>Sign in</button>
        )}
      </div>
    </nav>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
