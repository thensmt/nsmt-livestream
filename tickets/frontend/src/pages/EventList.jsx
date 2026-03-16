import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
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
