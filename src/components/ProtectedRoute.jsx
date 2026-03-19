import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  // ★ AdSense 승인용: 로그인 체크 임시 비활성화
  return children;
};

export default ProtectedRoute;
