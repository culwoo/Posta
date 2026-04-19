import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthHandler = () => {
    const [searchParams] = useSearchParams();
    const { verifyToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = searchParams.get('auth') || searchParams.get('token');
        if (token) {
            verifyToken(token).then(success => {
                if (!success) {
                    alert("유효하지 않거나 만료된 티켓 링크입니다.");
                }
                // Remove auth param and stay on current page
                const cleanParams = new URLSearchParams(searchParams);
                cleanParams.delete('auth');
                cleanParams.delete('token');
                const cleanPath = location.pathname + (cleanParams.toString() ? `?${cleanParams}` : '');
                navigate(cleanPath, { replace: true });
            });
        }
    }, [location.pathname, navigate, searchParams, verifyToken]);

    return null; // Invisible component
};

export default AuthHandler;
