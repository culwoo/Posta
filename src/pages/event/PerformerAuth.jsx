import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import classes from './PerformerAuth.module.css';

const PerformerAuth = () => {
    const [error, setError] = useState('');
    const { performerLogin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleGoogleLogin = async () => {
        setError('');
        try {
            await performerLogin();

            // Navigate back to where they came from if state.from exists
            const destination = location.state?.from?.pathname || '..';
            navigate(destination, { replace: true });
        } catch (err) {
            setError(err.message || '로그인에 실패했습니다.');
        }
    };

    return (
        <div className={classes.container} style={{ backgroundColor: 'var(--bg-secondary, #fff)' }}>
            <h2 className={classes.title}>
                공연진 / 스태프 로그인
            </h2>

            <div className={classes.form} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' }}>
                    Posta는 글로벌 확장과 보안을 위해<br />Google 계정으로만 안전하게 로그인하실 수 있습니다.
                </p>

                {error && <p className={classes.error}>{error}</p>}

                <button
                    onClick={handleGoogleLogin}
                    className={classes.submitBtn}
                    style={{
                        backgroundColor: '#fff',
                        color: '#757575',
                        border: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: '24px', height: '24px' }} />
                    Google 계정으로 로그인 / 가입
                </button>
            </div>
        </div>
    );
};

export default PerformerAuth;
