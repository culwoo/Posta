import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authInitialized } = useAuth();

  if (!authInitialized || loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
