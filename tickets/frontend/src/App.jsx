import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import EventList   from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Confirm     from './pages/Confirm';
import OrderLookup from './pages/OrderLookup';

const API = import.meta.env.VITE_API_BASE || '/tickets';

export const api = (path) => `${API}${path}`;

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"             element={<EventList />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/confirm"      element={<Confirm />} />
        <Route path="/orders"       element={<OrderLookup />} />
      </Routes>
    </AuthProvider>
  );
}
