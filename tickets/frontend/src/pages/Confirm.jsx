import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { api } from '../App';
import '../styles.css';

export default function Confirm() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const orderId   = params.get('orderId');   // for free orders redirected from checkout
  const email     = params.get('email');

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const qrRefs = useRef({});

  useEffect(() => {
    async function load() {
      try {
        let resp;
        if (sessionId) {
          resp = await fetch(api(`/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`));
        } else if (orderId && email) {
          resp = await fetch(api(`/order/${orderId}?email=${encodeURIComponent(email)}`));
        } else {
          setError('Invalid confirmation link.');
          setLoading(false);
          return;
        }
        const d = await resp.json();
        if (!resp.ok) { setError(d.error || 'Could not load order.'); setLoading(false); return; }
        setData(d);
      } catch {
        setError('Network error loading your tickets.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, orderId, email]);

  // Render QR codes after tickets load
  useEffect(() => {
    if (!data?.tickets) return;
    data.tickets.forEach((t) => {
      const canvas = qrRefs.current[t.ticketId];
      if (canvas) {
        QRCode.toCanvas(canvas, t.ticketId, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } });
      }
    });
  }, [data]);

  async function downloadPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const tickets = data.tickets || [];

    for (let i = 0; i < tickets.length; i++) {
      if (i > 0) doc.addPage();
      const t = tickets[i];

      // QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(t.ticketId, { width: 300, margin: 1 });

      // NSMT header bar
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 612, 72, 'F');
      doc.setTextColor(14, 128, 252);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('NSMT', 36, 46);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Tickets', 100, 46);

      // Event info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(data.event?.title || 'Event', 36, 120);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      if (data.event?.startDateTime) {
        const d = new Date(data.event.startDateTime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
        doc.text(d, 36, 142);
      }
      if (data.event?.venue?.name) {
        doc.text(`${data.event.venue.name}, ${data.event.venue.city || ''} ${data.event.venue.state || ''}`, 36, 158);
      }

      // Tier + name
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(t.tierName || 'General Admission', 36, 200);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(t.buyerName || '', 36, 218);

      // QR code centered
      doc.addImage(qrDataUrl, 'PNG', 156, 240, 300, 300);

      // Ticket ID below QR
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(t.ticketId, 306, 568, { align: 'center' });

      // Footer
      doc.setDrawColor(220, 220, 220);
      doc.line(36, 590, 576, 590);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Valid for one-time entry only · tickets.thensmt.com', 306, 608, { align: 'center' });
    }

    doc.save(`nsmt-tickets-${data.orderId || 'order'}.pdf`);
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-brand"><span className="blue">NSMT</span> Tickets</div>
        <Link to="/" className="nav-back">All Events</Link>
      </nav>
      <div className="page">
        {loading && <div className="loading">Loading your tickets…</div>}

        {error && (
          <div className="not-found">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <p style={{ marginTop: 12 }}><Link to="/" className="nav-back">← Back to events</Link></p>
          </div>
        )}

        {data && (
          <>
            <div className="success-header">
              <div className="success-icon">🎟️</div>
              <div className="success-title">You're in!</div>
              <div className="success-sub">
                Your tickets are confirmed. A confirmation email has been sent.
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 8 }}>Your Tickets</div>

            {(data.tickets || []).map((t) => (
              <div key={t.ticketId} className="ticket-card">
                <div className="ticket-info">
                  <div className="ticket-tier">{t.tierName}</div>
                  <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{t.buyerName}</div>
                  <div className="ticket-id">{t.ticketId}</div>
                </div>
                <div className="ticket-qr">
                  <canvas ref={(el) => el && (qrRefs.current[t.ticketId] = el)} />
                </div>
              </div>
            ))}

            <button className="dl-btn" onClick={downloadPDF}>
              ↓ Download PDF Tickets
            </button>

            <p style={{ marginTop: 20, fontSize: 13, color: '#71717a' }}>
              Order ID: <code>{data.orderId}</code><br />
              Need to look up your tickets later? Visit <Link to="/orders" className="nav-back">My Tickets</Link>.
            </p>
          </>
        )}
      </div>
    </>
  );
}
