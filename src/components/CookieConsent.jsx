import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'posta_cookie_consent';

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_KEY);
        if (!consent) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem(COOKIE_KEY, 'accepted');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.banner}>
                <p style={styles.text}>
                    이 사이트는 서비스 제공 및 사용자 경험 향상을 위해 쿠키와 Google Analytics, Google AdSense를 사용합니다.
                    자세한 내용은 <Link to="/privacy" style={styles.link}>개인정보처리방침</Link>을 확인해 주세요.
                </p>
                <button onClick={accept} style={styles.button}>
                    동의
                </button>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px',
        pointerEvents: 'none',
    },
    banner: {
        maxWidth: '640px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'rgba(15, 16, 32, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
    },
    text: {
        flex: 1,
        fontSize: '0.82rem',
        color: 'rgba(240, 240, 245, 0.7)',
        lineHeight: 1.6,
        margin: 0,
    },
    link: {
        color: '#d04c31',
        fontWeight: 600,
        textDecoration: 'none',
    },
    button: {
        flexShrink: 0,
        padding: '8px 24px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #d04c31, #e86040)',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-main)',
        transition: 'opacity 0.2s',
    },
};
