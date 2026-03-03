import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthHandler from './components/AuthHandler';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GlassBackground from './components/GlassBackground';
import LandingPage from './pages/LandingPage';

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
import { FeatureGate } from './components/features/FeatureGate';
import { DevTierToggle } from './components/features/DevTierToggle';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import EventList from './pages/dashboard/EventList';
import CreateEvent from './pages/dashboard/CreateEvent';
import ManageEvent from './pages/dashboard/ManageEvent';
import AudienceDashboard from './pages/dashboard/AudienceDashboard';
import AnalyticsDashboard from './pages/dashboard/AnalyticsDashboard';
import SettingsDashboard from './pages/dashboard/SettingsDashboard';
import MoreDashboard from './pages/dashboard/MoreDashboard';
import PremiumDashboard from './pages/dashboard/PremiumDashboard';

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
      <ThemeProvider>
        <GlassBackground />
        <AuthProvider>
          <AuthHandler />
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<EventList />} />
              <Route path="create" element={<CreateEvent />} />
              <Route path="event/:eventId" element={<ManageEvent />} />
              <Route path="audience" element={<AudienceDashboard />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="settings" element={<SettingsDashboard />} />
              <Route path="premium" element={<PremiumDashboard />} />
              <Route path="more" element={<MoreDashboard />} />
            </Route>

            {/* Posta Event Site Routes - /e/ prefix for clean, short URLs */}
            <Route path="/e/:eventId" element={
              <EventProviderWrapper>
                <Layout />
                <DevTierToggle />
              </EventProviderWrapper>
            }>
              <Route index element={<Home />} />
              <Route path="info" element={<ConcertInfo />} />
              <Route path="board" element={<FeatureGate feature="board"><Board /></FeatureGate>} />
              <Route path="reserve" element={<Reservation />} />
              <Route path="onsite" element={<FeatureGate feature="onsite"><Onsite /></FeatureGate>} />
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
                    <FeatureGate feature="checkin">
                      <Checkin />
                    </FeatureGate>
                  </ProtectedRoute>
                )}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

