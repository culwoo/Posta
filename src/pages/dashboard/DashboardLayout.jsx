import React, { useMemo, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Home, BarChart2, Settings, User, Users, Menu } from 'lucide-react';
import classes from './DashboardLayout.module.css';

const DashboardLayout = () => {
    const { user, loading, logout } = useAuth();
    const location = useLocation();
    const currentPath = location.pathname;

    const desktopNavItems = useMemo(() => ([
        { to: '/dashboard', label: '내 이벤트', icon: Home, match: (path) => path === '/dashboard' || path.startsWith('/dashboard/event') || path === '/dashboard/create' },
        { to: '/dashboard/audience', label: '내 관객들', icon: Users, match: (path) => path.startsWith('/dashboard/audience') },
        { to: '/dashboard/analytics', label: '정산/인사이트', icon: BarChart2, match: (path) => path.startsWith('/dashboard/analytics') },
        { to: '/dashboard/settings', label: '설정', icon: Settings, match: (path) => path.startsWith('/dashboard/settings') }
    ]), []);

    const mobileNavItems = useMemo(() => ([
        { to: '/dashboard', label: '이벤트', icon: Home, match: desktopNavItems[0].match },
        { to: '/dashboard/audience', label: '관객', icon: Users, match: desktopNavItems[1].match },
        { to: '/dashboard/analytics', label: '정산', icon: BarChart2, match: desktopNavItems[2].match },
        { to: '/dashboard/more', label: '더보기', icon: Menu, match: (path) => path.startsWith('/dashboard/more') || path.startsWith('/dashboard/settings') || path.startsWith('/dashboard/premium') }
    ]), [desktopNavItems]);

    // Redirect to login if not authenticated (and not loading)
    if (!loading && !user) {
        return <DashboardLogin />;
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div className={classes.dashboardContainer}>
            {/* Desktop Sidebar / Mobile Bottom Nav */}
            <nav className={classes.sidebar}>
                <div className={classes.logo}>
                    <Link to="/dashboard">Posta</Link>
                </div>
                <div className={classes.navItems}>
                    {desktopNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.to} to={item.to} className={`${classes.navItem} ${item.match(currentPath) ? classes.active : ''}`}>
                                <Icon size={20} className={classes.navIcon} />
                                <span className={classes.navLabel}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
                <div className={classes.sidebarFooter}>
                    <div className={classes.userInfo}>
                        <User size={18} className={classes.userIcon} />
                        <span className={classes.userName}>{user?.name || 'User'}</span>
                    </div>
                    <button onClick={() => logout()} className={classes.logoutBtn}>
                        <LogOut size={18} />
                        <span className={classes.navLabel}>로그아웃</span>
                    </button>
                </div>
            </nav>

            <div className={classes.mainWrapper}>
                {/* Mobile Top Header (Visible only on mobile) */}
                <header className={classes.mobileHeader}>
                    <div className={classes.mobileLogo}>
                        <Link to="/dashboard">Posta Dashboard</Link>
                    </div>
                    <button onClick={() => logout()} className={classes.mobileLogoutBtn}>
                        <LogOut size={18} />
                    </button>
                </header>

                <main className={classes.mainContent}>
                    <Outlet />
                </main>
            </div>

            <nav className={classes.mobileBottomNav}>
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.to} to={item.to} className={`${classes.mobileNavItem} ${item.match(currentPath) ? classes.activeMobile : ''}`}>
                            <Icon size={19} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

// Internal Login Component for Dashboard
const DashboardLogin = () => {
    const { performerLogin } = useAuth();
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setError('');
        try {
            await performerLogin();
        } catch (err) {
            setError(err.message || '로그인에 실패했습니다.');
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            backgroundColor: '#111', color: '#fff', fontFamily: 'sans-serif'
        }}>
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '340px',
                padding: '2.5rem', backgroundColor: '#222', borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8)', border: '1px solid #333'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Posta</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#888', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        안전한 관리자 접근을 위해<br />Google 계정으로 로그인해주세요.
                    </p>
                </div>

                {error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}

                <button
                    onClick={handleGoogleLogin}
                    style={{
                        padding: '0.9rem', borderRadius: '8px', border: '1px solid #444',
                        backgroundColor: '#fff', color: '#333', fontSize: '1rem',
                        fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: '24px', height: '24px' }} />
                    Google로 로그인하기
                </button>
            </div>
        </div>
    );
}


export default DashboardLayout;
