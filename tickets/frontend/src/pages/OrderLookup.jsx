import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../App';
import '../styles.css';

export default function OrderLookup() {
  const [params]  = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [email,   setEmail]   = useState(params.get('email')   || '');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const qrRefs = useRef({});

  // Auto-lookup if params are pre-filled (e.g. from confirmation email link)
  useEffect(() => {
    if (params.get('orderId') && params.get('email')) lookup();
  }, []);

  useEffect(() => {
    if (!data?.tickets) return;
    data.tickets.forEach((t) => {
      const canvas = qrRefs.current[t.ticketId];
      if (canvas) {
        QRCode.toCanvas(canvas, t.ticketId, { width: 160, margin: 1 });
      }
    });
  }, [data]);

  async function lookup() {
    if (!orderId.trim() || !email.trim()) { setError('Both fields are required.'); return; }
    setError('');
    setLoading(true);
    setData(null);
    try {
      const resp = await fetch(api(`/order/${orderId.trim()}?email=${encodeURIComponent(email.trim())}`));
      const d = await resp.json();
      if (!resp.ok) { setError(d.error || 'Order not found.'); setLoading(false); return; }
      setData(d);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-brand"><span className="blue">NSMT</span> Tickets</div>
        <Link to="/" className="nav-back">All Events</Link>
      </nav>
      <div className="page" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 28, marginBottom: 6 }}>My Tickets</h1>
        <p style={{ color: '#71717a', marginBottom: 24 }}>Enter your order ID and email to retrieve your tickets.</p>

        <div className="form-field">
          <label>Order ID</label>
          <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ord_..." autoCapitalize="none" autoCorrect="off" />
        </div>
        <div className="form-field">
          <label>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" autoComplete="email" />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" style={{ marginTop: 8 }} onClick={lookup} disabled={loading}>
          {loading ? 'Looking up…' : 'Find My Tickets'}
        </button>

        {data && (
          <div style={{ marginTop: 32 }}>
            <div className="section-label">Your Tickets</div>
            {(data.tickets || []).map((t) => (
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
        )}
      </div>
    </>
  );
}
