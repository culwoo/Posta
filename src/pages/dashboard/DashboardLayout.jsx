import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import classes from './DashboardLayout.module.css';

const DashboardLayout = () => {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();

    // Redirect to login if not authenticated (and not loading)
    // We assume Dashboard is only for Organizers/Performers
    if (!loading && !user) {
        // Since we don't have a dedicated Global Login page, 
        // we might redirect to a login component or render it here.
        // For v1.0, let's render a simple Login form if not logged in.
        return <DashboardLogin />;
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div className={classes.dashboardContainer}>
            <header className={classes.header}>
                <div className={classes.logo}>
                    <Link to="/dashboard">Posta Dashboard</Link>
                </div>
                <div className={classes.userMenu}>
                    <span>{user.name} ({user.email})</span>
                    <button onClick={() => logout()} className={classes.logoutBtn}>
                        <LogOut size={16} />
                    </button>
                </div>
            </header>
            <main className={classes.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

// Internal Login Component for Dashboard
const DashboardLogin = () => {
    const { performerLogin, performerSignup } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await performerLogin(email, password);
            } else {
                await performerSignup(email, password, 'Organizer');
            }
        } catch (err) {
            let msg = err.message;
            if (err.code === 'auth/weak-password') msg = '비밀번호는 최소 6자리 이상이어야 합니다.';
            else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
            else if (err.code === 'auth/user-not-found') msg = '가입되지 않은 이메일입니다.';
            setError(msg);
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            backgroundColor: '#111', color: '#fff', fontFamily: 'sans-serif'
        }}>
            <form onSubmit={handleSubmit} style={{
                display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '340px',
                padding: '2.5rem', backgroundColor: '#222', borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8)', border: '1px solid #333'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Posta</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#888', fontSize: '0.9rem' }}>
                        {isLogin ? "대시보드 로그인" : "새 대시보드 관리자 가입"}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 500 }}>이메일</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{
                            padding: '0.9rem', borderRadius: '8px', border: '1px solid #444',
                            backgroundColor: '#1a1a1a', color: '#fff', fontSize: '1rem', outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 500 }}>비밀번호</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{
                            padding: '0.9rem', borderRadius: '8px', border: '1px solid #444',
                            backgroundColor: '#1a1a1a', color: '#fff', fontSize: '1rem', outline: 'none'
                        }}
                    />
                </div>

                {error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}

                <button type="submit" style={{
                    padding: '0.9rem', borderRadius: '8px', border: 'none',
                    backgroundColor: '#d04c31', color: '#fff', fontSize: '1rem',
                    fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem',
                    boxShadow: '0 4px 12px rgba(208, 76, 49, 0.3)'
                }}>
                    {isLogin ? "로그인" : "가입하기"}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                    <button type="button" onClick={() => setIsLogin(!isLogin)} style={{
                        background: 'none', border: 'none', color: '#888',
                        cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline'
                    }}>
                        {isLogin ? "새 관리자 계정이 필요하신가요?" : "이미 계정이 있으신가요?"}
                    </button>
                </div>
            </form>
        </div>
    );
}


export default DashboardLayout;
