import React, { useMemo, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Home, BarChart2, Settings, User, Users, Menu, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
const makeSidebarStyle = (collapsed) => ({
    width: collapsed ? '68px' : '250px',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 100,
    flexShrink: 0,
    transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
    overflow: 'hidden',
});

const navItemBase = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '0.9rem 1.5rem',
    margin: '0 0.5rem',
    color: 'var(--ui-text-weak)',
    textDecoration: 'none',
    fontWeight: 500,
    borderRadius: '10px',
    transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-main)',
    letterSpacing: '-0.01em',
    position: 'relative',
};

const navItemActive = {
    ...navItemBase,
    background: 'var(--ui-surface-soft)',
    color: 'var(--text-primary)',
    boxShadow: 'inset 0 0 0 1px var(--ui-border-soft)',
};

const DashboardLayout = () => {
    const { user, loading, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const currentPath = location.pathname;
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        { to: '/dashboard/more', label: '더보기', icon: Menu, match: (path) => path.startsWith('/dashboard/more') || path.startsWith('/dashboard/settings') || path.startsWith('/dashboard/pricing') }
    ]), [desktopNavItems]);

    if (!loading && !user) {
        return <DashboardLogin />;
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
                로딩 중...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', color: 'var(--text-primary)' }}>
            {/* Desktop Sidebar */}
            <nav style={makeSidebarStyle(sidebarCollapsed)} className="dashboard-sidebar">
                <GlassCard
                    level={2}
                    style={{
                        borderRadius: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderTop: 'none',
                        borderBottom: 'none',
                        borderLeft: 'none',
                    }}
                >
                    {/* Logo */}
                    <div style={{ padding: sidebarCollapsed ? '1.5rem 0.8rem' : '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {!sidebarCollapsed && (
                            <Link
                                to="/dashboard"
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    letterSpacing: '-0.03em',
                                    fontFamily: 'var(--font-main)',
                                    background: 'linear-gradient(135deg, var(--text-primary), var(--accent-color))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Posta
                            </Link>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--ui-text-muted)',
                                padding: '0.4rem',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ui-surface-soft)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
                        >
                            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>
                    </div>

                    {/* Nav Items */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.5rem 0', gap: '2px' }}>
                        {desktopNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.match(currentPath);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    style={isActive ? navItemActive : navItemBase}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'var(--ui-surface-hover)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--ui-text-weak)';
                                        }
                                    }}
                                >
                                    {isActive && (
                                        <span style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: '20%',
                                            bottom: '20%',
                                            width: '3px',
                                            borderRadius: '0 3px 3px 0',
                                            background: 'linear-gradient(180deg, var(--primary-color), rgba(246,196,88,0.7))',
                                            boxShadow: '0 0 8px rgba(208,76,49,0.4)',
                                        }} />
                                    )}
                                    <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                                    {!sidebarCollapsed && <span style={{ lineHeight: 1 }}>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Sidebar Footer */}
                    <div style={{
                        padding: '1.5rem',
                        borderTop: '1px solid var(--ui-border-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}>
                        {!sidebarCollapsed && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                color: 'var(--ui-text-muted)',
                                fontSize: '0.88rem',
                                fontFamily: 'var(--font-main)',
                            }}>
                                <User size={18} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.name || 'User'}
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={toggleTheme}
                                title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                                style={{ padding: '0.5rem', minWidth: 'unset' }}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </GlassButton>
                            <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={() => logout()}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    color: 'rgba(255,107,107,0.8)',
                                    gap: '0.5rem',
                                    flex: 1,
                                }}
                            >
                                <LogOut size={18} />
                                {!sidebarCollapsed && <span style={{ fontSize: '0.88rem', fontFamily: 'var(--font-main)' }}>로그아웃</span>}
                            </GlassButton>
                        </div>
                    </div>
                </GlassCard>
            </nav>

            {/* Main Wrapper */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: 'var(--mobile-bottom-nav-offset, 0)' }} className="dashboard-main-wrapper">
                {/* Mobile Top Header */}
                <header className="dashboard-mobile-header" style={{ display: 'none' }}>
                    <GlassCard
                        level={2}
                        style={{
                            borderRadius: 0,
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderTop: 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.9rem 1rem',
                            position: 'sticky',
                            top: 0,
                            zIndex: 90,
                        }}
                    >
                        <div>
                            <Link
                                to="/dashboard"
                                style={{
                                    fontWeight: 800,
                                    fontSize: '1.05rem',
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                    fontFamily: 'var(--font-main)',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                Posta
                            </Link>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={toggleTheme}
                                title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                                style={{ padding: '0.4rem', minWidth: 'unset', color: 'var(--ui-text-muted)' }}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </GlassButton>
                            <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={() => logout()}
                                style={{ padding: '0.4rem', minWidth: 'unset', color: 'var(--ui-text-muted)' }}
                            >
                                <LogOut size={18} />
                            </GlassButton>
                        </div>
                    </GlassCard>
                </header>

                <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }} className="dashboard-main-content">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="dashboard-mobile-bottom-nav" style={{ display: 'none' }}>
                <GlassCard
                    level={2}
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 0,
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4,1fr)',
                        zIndex: 95,
                        height: '64px',
                        padding: 0,
                    }}
                >
                    {mobileNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.match(currentPath);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                style={{
                                    color: isActive ? 'var(--text-primary)' : 'var(--ui-text-weak)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.2rem',
                                    textDecoration: 'none',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-main)',
                                    transition: 'all 0.2s ease',
                                    background: isActive ? 'var(--ui-surface-soft)' : 'transparent',
                                }}
                            >
                                <Icon size={19} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </GlassCard>
            </nav>

            {/* Responsive styles injected via a style tag */}
            <style>{`
                @media (max-width: 768px) {
                    .dashboard-sidebar { display: none !important; }
                    .dashboard-mobile-header { display: block !important; }
                    .dashboard-mobile-bottom-nav { display: block !important; }
                    .dashboard-main-wrapper { padding-bottom: 64px !important; }
                    .dashboard-main-content { padding: 1rem !important; }
                }
            `}</style>
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
        }}>
            <GlassCard level={3} style={{ width: '340px', padding: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '2rem',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            fontFamily: 'var(--font-main)',
                            color: 'var(--text-primary)',
                        }}>
                            Posta
                        </h2>
                        <p style={{
                            margin: '0.5rem 0 0 0',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            lineHeight: 1.5,
                            fontFamily: 'var(--font-main)',
                        }}>
                            안전한 관리자 접근을 위해<br />Google 계정으로 로그인해주세요.
                        </p>
                    </div>

                    {error && (
                        <div style={{ color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <GlassButton
                        variant="secondary"
                        size="md"
                        onClick={handleGoogleLogin}
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google Logo"
                            style={{ width: '20px', height: '20px' }}
                        />
                        Google로 로그인하기
                    </GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};

export default DashboardLayout;
