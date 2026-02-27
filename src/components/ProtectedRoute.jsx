import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { eventId } = useParams();

  // organizer 또는 performer role이면 접근 허용
  if (!user || (user.role !== 'performer' && user.role !== 'organizer' && !user.isAdmin)) {
    return <Navigate to={`/e/${eventId}/performer/login`} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
