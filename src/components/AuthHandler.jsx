import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthHandler = () => {
    const [searchParams, setSearchParams] = useSearchParams();
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
                searchParams.delete('auth');
                searchParams.delete('token');
                const cleanPath = location.pathname + (searchParams.toString() ? `?${searchParams}` : '');
                navigate(cleanPath, { replace: true });
            });
        }
    }, [searchParams, verifyToken, navigate]);

    return null; // Invisible component
};

export default AuthHandler;
