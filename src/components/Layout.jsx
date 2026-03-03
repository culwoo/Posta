import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import classes from './Layout.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { TierBadge } from './features/TierBadge';
import GoogleAd from './GoogleAd';
import { AD_SLOTS } from '../config/adsense';

const Layout = () => {
    const { user, logout } = useAuth();
    const { eventData, billing } = useEvent();
    const navigate = useNavigate();
    const { eventId } = useParams();

    const isIframe = window.self !== window.top;

    // 모바일 미리보기 (iframe) 환경일 때 마우스 드래그를 터치 스와이프로 변환하는 로직
    useEffect(() => {
        if (!isIframe) return;

        const ele = document.body;
        let pos = { windowLeft: 0, windowTop: 0, x: 0, y: 0 };
        let isDragging = false;
        let dragged = false;

        let scrollXElement = null;
        let scrollYElement = null;
        let scrollAxis = null;

        const mouseDownHandler = function (e) {
            isDragging = true;
            dragged = false;
            scrollAxis = null;
            scrollXElement = null;
            scrollYElement = null;

            let current = e.target;
            while (current && current !== document.body && current !== document.documentElement && current.nodeType === 1) {
                const style = window.getComputedStyle(current);
                const isScrollableX = (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'overlay') && current.scrollWidth > current.clientWidth;
                const isScrollableY = (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') && current.scrollHeight > current.clientHeight;

                if (!scrollXElement && isScrollableX) {
                    scrollXElement = { el: current, start: current.scrollLeft };
                }
                if (!scrollYElement && isScrollableY) {
                    scrollYElement = { el: current, start: current.scrollTop };
                }
                current = current.parentNode;
            }

            pos = {
                windowLeft: window.scrollX,
                windowTop: window.scrollY,
                x: e.clientX,
                y: e.clientY,
            };

            ele.style.cursor = 'grabbing';
            ele.style.userSelect = 'none';
        };

        const mouseMoveHandler = function (e) {
            if (!isDragging) return;

            const dx = e.clientX - pos.x;
            const dy = e.clientY - pos.y;

            if (!dragged) {
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    dragged = true;
                    scrollAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
                } else {
                    return;
                }
            }

            if (scrollAxis === 'x') {
                if (scrollXElement) {
                    scrollXElement.el.scrollLeft = scrollXElement.start - dx;
                } else {
                    window.scrollTo(pos.windowLeft - dx, window.scrollY);
                }
            } else if (scrollAxis === 'y') {
                if (scrollYElement) {
                    scrollYElement.el.scrollTop = scrollYElement.start - dy;
                } else {
                    window.scrollTo(window.scrollX, pos.windowTop - dy);
                }
            }
        };

        const mouseUpHandler = function () {
            isDragging = false;
            ele.style.cursor = 'default';
            ele.style.userSelect = '';
        };

        const clickCaptureHandler = function (e) {
            if (dragged) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        ele.addEventListener('mousedown', mouseDownHandler);
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('click', clickCaptureHandler, true);

        return () => {
            ele.removeEventListener('mousedown', mouseDownHandler);
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
            window.removeEventListener('click', clickCaptureHandler, true);
        };
    }, [isIframe]);

    const handleRoleSwitch = () => {
        if (user?.role === 'performer') {
            logout();
            navigate('.');
        } else {
            navigate(`/e/${eventId}/performer/login`);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('.');
    };

    const location = useLocation();
    const isReservePage = location.pathname.endsWith('/reserve');
    const isAdminPage = location.pathname.endsWith('/admin');
    const isCheckinPage = location.pathname.endsWith('/checkin');
    const hideStatusBar = isReservePage || isAdminPage || isCheckinPage || user?.isVerified || isIframe;
    const displayName = user?.role === 'performer' ? (user?.boardDisplayName || user?.name) : user?.name;

    return (
        <div className={classes.container}>
            <nav className={classes.navbar}>
                <div className={classes.logo}>
                    <Link to="." style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>🎵 {eventData?.title || '공연'} <TierBadge tier={billing?.tier} /></Link>
                </div>
                <div className={classes.navLinks} style={isReservePage ? { pointerEvents: 'none', opacity: 0.3 } : {}}>
                    <Link to="." className={classes.link}>홈</Link>
                    <Link to="info" className={classes.link}>공연 정보</Link>
                    <Link to="board" className={classes.link}>응원 게시판</Link>
                </div>
            </nav>

            {!hideStatusBar ? (
                <div className={classes.statusBar}>
                    {user ? (
                        <>
                            <span className={classes.statusText}>
                                현재 접속: <span className={classes.nickname}>{displayName}</span> (
                                {user.role === 'audience' ? '관객' : '공연진'})
                            </span>
                            {user.role === 'audience' && user.isVerified ? (
                                <span className={classes.statusHint}>티켓 인증 상태에서는 로그아웃할 수 없습니다.</span>
                            ) : (
                                <button className={classes.roleSwitchBtn} onClick={handleLogout}>로그아웃</button>
                            )}
                        </>
                    ) : (
                        <>
                            <span className={classes.statusText}>로그인 필요</span>
                            <button className={classes.roleSwitchBtn} onClick={handleRoleSwitch}>공연진 로그인</button>
                        </>
                    )}
                </div>
            ) : null}

            <main className={classes.main}>
                <Outlet />
            </main>

            {!isAdminPage && !isCheckinPage && (
                <footer style={{ padding: '0 1rem 1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    <GoogleAd
                        slotId={AD_SLOTS.EVENT_FOOTER.slotId}
                        format={AD_SLOTS.EVENT_FOOTER.format}
                        label={AD_SLOTS.EVENT_FOOTER.label}
                    />
                </footer>
            )}
        </div>
    );
};

export default Layout;
