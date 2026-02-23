import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // organizer 또는 performer role이면 접근 허용
  if (!user || (user.role !== 'performer' && user.role !== 'organizer')) {
    return <Navigate to="performer/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
