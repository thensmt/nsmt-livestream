import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { useAuth } from '../AuthContext';
import '../styles.css';

function priceRange(tiers) {
  if (!tiers?.length) return 'Free';
  const prices = tiers.filter((t) => t.active !== false).map((t) => t.price);
  if (!prices.length) return 'Free';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === 0 && max === 0) return 'Free';
  if (min === max) return `$${(min / 100).toFixed(0)}`;
  if (min === 0) return `Free – $${(max / 100).toFixed(0)}`;
  return `From $${(min / 100).toFixed(0)}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EventList() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api('/events'))
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <nav className="nav">
        <div className="nav-brand"><span className="blue">NSMT</span> Tickets</div>
        {!authLoading && (
          user
            ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to="/orders" className="nav-back" style={{ fontSize: 14 }}>My Tickets</Link>
                <button onClick={signOut} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                  Sign out
                </button>
              </div>
            )
            : (
              <button onClick={signIn} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <GoogleIcon /> Sign in with Google
              </button>
            )
        )}
      </nav>

      <div className="page">
        {loading && <div className="loading">Loading events…</div>}

        {!loading && events.length === 0 && (
          <div className="not-found" style={{ paddingTop: 60 }}>
            <h2>No upcoming events</h2>
            <p>Check back soon.</p>
          </div>
        )}

        <div className="event-grid">
          {events.map((ev) => (
            <Link key={ev.eventId} to={`/events/${ev.slug}`} className="event-card">
              {ev.coverImageUrl
                ? <img className="event-card-img" src={ev.coverImageUrl} alt={ev.title} />
                : <div className="event-card-img placeholder">🏀</div>
              }
              <div className="event-card-body">
                <div className="event-card-title">{ev.title}</div>
                <div className="event-card-date">{fmtDate(ev.startDateTime)}</div>
                <div className="event-card-venue">{ev.venue?.name}{ev.venue?.city ? `, ${ev.venue.city}` : ''}</div>
                <div className="event-card-price">{priceRange(ev.tiers)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
