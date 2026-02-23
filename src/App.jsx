import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthHandler from './components/AuthHandler';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

// Event Pages
import Home from './pages/event/Home';
import PerformerAuth from './pages/event/PerformerAuth';
import Board from './pages/event/Board';
import ConcertInfo from './pages/event/ConcertInfo';
import Reservation from './pages/event/Reservation';
import Admin from './pages/event/Admin';
import Checkin from './pages/event/Checkin';
import Onsite from './pages/event/Onsite';
import { EventProvider } from './contexts/EventContext';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import EventList from './pages/dashboard/EventList';
import CreateEvent from './pages/dashboard/CreateEvent';
import ManageEvent from './pages/dashboard/ManageEvent';

// Helper Wrapper to access useParams
const EventProviderWrapper = ({ children }) => {
  return (
    <EventProvider>
      {children}
    </EventProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthHandler />
        <Routes>
          {/* Posta Dashboard Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<EventList />} />
            <Route path="create" element={<CreateEvent />} />
            <Route path="event/:eventId" element={<ManageEvent />} />
          </Route>

          {/* Posta Event Site Routes - /e/ prefix for clean, short URLs */}
          <Route path="/e/:eventId" element={
            <EventProviderWrapper>
              <Layout />
            </EventProviderWrapper>
          }>
            <Route index element={<Home />} />
            <Route path="info" element={<ConcertInfo />} />
            <Route path="board" element={<Board />} />
            <Route path="reserve" element={<Reservation />} />
            <Route path="onsite" element={<Onsite />} />
            <Route path="performer/login" element={<PerformerAuth />} />
            <Route
              path="admin"
              element={(
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              )}
            />
            <Route
              path="checkin"
              element={(
                <ProtectedRoute>
                  <Checkin />
                </ProtectedRoute>
              )}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

