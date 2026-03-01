import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Music, Coffee, Flame, Mic2, Camera, Star, Heart, Gift, Sparkles, Megaphone, Utensils } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
import { functions, httpsCallable } from '../../api/firebase';
import AudienceEntry from '../../components/AudienceEntry';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { ensureContrast, hexToRgba, hexToHsl, hslToHex, adjustForIconBg } from '../../utils/color';

/* ?? reusable inline styles ?? */
const glassInputStyle = {
    flex: 1,
    padding: '0.6rem 0.7rem',
    borderRadius: '10px',
    border: '1px solid var(--ui-border-soft)',
    background: 'var(--ui-surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-main)',
    minWidth: 0,
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
};

const posterCardStyle = {
    width: '100%',
    maxWidth: 280,
    aspectRatio: '2382 / 3369',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: 'var(--glass-shadow)',
    border: '1px solid var(--glass-border-light)',
};

const ticketCardStyle = {
    width: '100%',
    maxWidth: 280,
    aspectRatio: '2382 / 3369',
    background: 'var(--glass-bg-card)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--glass-shadow-lg)',
    border: '1px solid var(--glass-border)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
};

const iconBaseStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    zIndex: 2,
    margin: '0 1rem',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
};

const ICON_HUE_OFFSETS = {
    door: 0, music: 30, coffee: 60, flame: 90,
    mic: 120, camera: 150, star: 180, heart: 210,
    gift: 240, sparkles: 270, megaphone: 300, utensils: 330,
};

const ICON_COMPONENTS = {
    door: DoorOpen, music: Music, coffee: Coffee, flame: Flame,
    mic: Mic2, camera: Camera, star: Star, heart: Heart,
    gift: Gift, sparkles: Sparkles, megaphone: Megaphone, utensils: Utensils,
};

const Home = () => {
    const { eventId, eventData } = useEvent();
    const { user, updateNickname, authInitialized, updatePerformerBoardName } = useAuth();
    const [rotationBase, setRotationBase] = useState(0);
    const [dragRotation, setDragRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [hintSpin, setHintSpin] = useState(false);
    const [checkinStatus, setCheckinStatus] = useState(null);
    const [nickname, setNickname] = useState('');
    const [nicknameSaved, setNicknameSaved] = useState(false);
    const [performerBoardName, setPerformerBoardName] = useState('');
    const [performerNameSaved, setPerformerNameSaved] = useState(false);
    const touchStartX = useRef(null);
    const cardWidth = useRef(0);
    const flipCardRef = useRef(null);

    // Dynamic timeline colors derived from poster theme
    const theme = eventData?.theme;
    const primaryHex = theme?.primary || '#6c5ce7';
    const secondaryHex = theme?.secondary || '#e0b02a';
    const bgPrimary = theme?.bgPrimary || '#3e402d';

    const timeColor = useMemo(() => ensureContrast(primaryHex, bgPrimary, 3.0), [primaryHex, bgPrimary]);
    const timeShadowRgba = useMemo(() => hexToRgba(timeColor, 0.25), [timeColor]);

    const getIconGradient = useMemo(() => {
        const baseHue = hexToHsl(primaryHex)[0];
        return (iconValue) => {
            const offset = ICON_HUE_OFFSETS[iconValue] ?? 0;
            const c = adjustForIconBg(hslToHex((baseHue + offset) % 360, 0.65, 0.45));
            return `linear-gradient(135deg, ${hexToRgba(c, 0.85)}, ${hexToRgba(c, 0.95)})`;
        };
    }, [primaryHex]);

    useEffect(() => {
        if (!user?.isVerified) return;
        setHintSpin(true);
        const timer = setTimeout(() => {
            setHintSpin(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, [user?.isVerified]);

    useEffect(() => {
        if (user?.isVerified) {
            setNickname(user.name || '');
        }
    }, [user?.isVerified, user?.name]);

    useEffect(() => {
        if (user?.role === 'performer') {
            setPerformerBoardName(user.boardDisplayName || user.name || '');
        }
    }, [user?.boardDisplayName, user?.name, user?.role]);

    useEffect(() => {
        if (!user?.isVerified || !authInitialized || !eventId) {
            setCheckinStatus(null);
            return;
        }
        if (!user?.token) return;

        let cancelled = false;
        const verifyTicketFn = httpsCallable(functions, "verifyTicket");

        const refreshStatus = async () => {
            try {
                const response = await verifyTicketFn({
                    token: user.token,
                    eventId
                });
                const result = response.data || {};
                if (cancelled) return;

                if (!result.success) {
                    setCheckinStatus(null);
                    return;
                }

                setCheckinStatus({
                    checkedIn: Boolean(result.checkedIn),
                    checkedInAt: result.checkedInAt || null
                });
            } catch (err) {
                if (!cancelled) {
                    console.error("Ticket status refresh failed:", err);
                }
            }
        };

        refreshStatus();
        const interval = setInterval(refreshStatus, 15000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [user?.isVerified, user?.token, authInitialized, eventId]);

    const handleFlip = () => {
        if (!user?.isVerified) return;
        setRotationBase((prev) => prev + 180);
    };

    const handleTouchStart = (event) => {
        if (!user?.isVerified) return;
        if (event.touches && event.touches.length > 0) {
            touchStartX.current = event.touches[0].clientX;
            cardWidth.current = flipCardRef.current?.offsetWidth || 0;
            setIsDragging(true);
        }
    };

    const handleTouchMove = (event) => {
        if (!user?.isVerified) return;
        if (touchStartX.current === null || !cardWidth.current) return;
        const moveX = event.touches && event.touches.length > 0
            ? event.touches[0].clientX
            : null;
        if (moveX === null) return;
        const deltaX = moveX - touchStartX.current;
        const rotation = (deltaX / cardWidth.current) * 180;
        const clamped = Math.max(-180, Math.min(180, rotation));
        setDragRotation(clamped);
    };

    const handleTouchEnd = (event) => {
        if (!user?.isVerified) return;
        if (touchStartX.current === null) return;
        const endX = event.changedTouches && event.changedTouches.length > 0
            ? event.changedTouches[0].clientX
            : null;
        if (endX === null) return;
        touchStartX.current = null;
        setIsDragging(false);
        if (Math.abs(dragRotation) < 40) {
            setDragRotation(0);
            return;
        }
        setRotationBase((prev) => prev + (dragRotation > 0 ? 180 : -180));
        setDragRotation(0);
    };

    const handleTouchCancel = () => {
        if (!user?.isVerified) return;
        touchStartX.current = null;
        setIsDragging(false);
        setDragRotation(0);
    };

    const handleNicknameSubmit = (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;
        updateNickname(nickname.trim());
        setNicknameSaved(true);
        setTimeout(() => setNicknameSaved(false), 1500);
    };

    const handlePerformerNameSubmit = async (e) => {
        e.preventDefault();
        if (!performerBoardName.trim()) return;
        const success = await updatePerformerBoardName(performerBoardName.trim());
        if (success) {
            setPerformerNameSaved(true);
            setTimeout(() => setPerformerNameSaved(false), 1500);
        }
    };

    const getIconComp = (icon) => ICON_COMPONENTS[icon] || Music;

    return (
        <div style={{ paddingBottom: 32, fontFamily: 'var(--font-main)' }}>
            <style>{`
                .home-flip-card{width:100%;max-width:280px;perspective:2000px;cursor:pointer}
                .home-flip-inner{position:relative;width:100%;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.8,.2,1);-webkit-transform-style:preserve-3d}
                .home-flip-inner.dragging{transition:none}
                .home-flip-card.hint-spin .home-flip-inner{animation:homeFlipHint 1.2s ease}
                .home-flip-face{position:relative;width:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;-webkit-font-smoothing:antialiased;transform:translateZ(0)}
                .home-flip-front{transform:rotateY(0deg);z-index:2}
                .home-flip-back{position:absolute;top:0;left:0;transform:rotateY(180deg);z-index:1}
                @keyframes homeFlipHint{0%{transform:rotateY(0deg) translateZ(0)}40%{transform:rotateY(180deg) translateZ(0)}100%{transform:rotateY(360deg) translateZ(0)}}
                .home-ticket-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,rgba(208,76,49,.8),rgba(246,196,88,.6));box-shadow:0 0 12px rgba(208,76,49,.3)}
                @media(max-width:600px){
                    .home-center-icon{margin:0 .5rem!important;width:32px!important;height:32px!important}
                    .home-time-text{font-size:.8rem!important}
                    .home-item-title{font-size:.9rem!important}
                    .home-timeline-container{padding:0 10px}
                }
            `}</style>

            {!user && window.self === window.top ? (
                <AudienceEntry />
            ) : (
                <>
                    {/* ?? Poster / Ticket Section ?? */}
                    <section style={{ padding: '0.5rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
                        {user?.isVerified ? (
                            <div
                                className={`home-flip-card${hintSpin ? ' hint-spin' : ''}`}
                                onClick={handleFlip}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchCancel}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') handleFlip();
                                }}
                                ref={flipCardRef}
                            >
                                <div
                                    className={`home-flip-inner${isDragging ? ' dragging' : ''}`}
                                    style={{ transform: `rotateY(${rotationBase + dragRotation}deg) translateZ(0)` }}
                                >
                                    <div className="home-flip-face home-flip-front">
                                        <div style={posterCardStyle}>
                                            {eventData?.posterUrl && (
                                                <img src={eventData.posterUrl} alt="공연 포스터" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="home-flip-face home-flip-back">
                                        <div className="home-ticket-card" style={ticketCardStyle}>
                                            {checkinStatus?.checkedIn && (
                                                <div style={{
                                                    position: 'absolute', top: 12, right: 12,
                                                    background: 'linear-gradient(135deg, rgba(0,212,170,0.9), rgba(0,212,170,0.7))',
                                                    color: 'var(--text-on-primary)', fontSize: '0.75rem', fontWeight: 700,
                                                    padding: '6px 12px', borderRadius: 999,
                                                    boxShadow: '0 4px 12px rgba(0,212,170,0.3)', zIndex: 2,
                                                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                }}>
                                                    입장 완료됨
                                                </div>
                                            )}
                                            <div style={{
                                                width: '100%', padding: '1rem 1.5rem',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                borderBottom: '1px solid var(--ui-border-soft)',
                                            }}>
                                                <span style={{
                                                    fontWeight: 'bold', color: 'var(--text-primary)',
                                                    fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                }}>
                                                    {eventData?.title || '공연 제목'}
                                                </span>
                                            </div>
                                            <div style={{
                                                padding: '1.4rem 1.2rem', display: 'flex',
                                                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                background: 'var(--ui-scrim)', width: '100%', flex: 1,
                                            }}>
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(user.token || user.uid)}`}
                                                    alt="Ticket QR"
                                                    style={{
                                                        width: 200, height: 200, marginBottom: '1.5rem',
                                                        border: '3px solid var(--ui-border-soft)',
                                                        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                                    }}
                                                />
                                                <p style={{
                                                    fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)',
                                                    marginBottom: '0.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: 0,
                                                }}>
                                                    {user.name} 님
                                                </p>
                                                <p style={{
                                                    color: 'var(--ui-text-muted)', fontSize: '0.9rem',
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.6)', margin: 0,
                                                }}>
                                                    {eventData?.date} {eventData?.time} | {eventData?.location}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={posterCardStyle}>
                                {eventData?.posterUrl && (
                                    <img src={eventData.posterUrl} alt="공연 포스터" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                                )}
                            </div>
                        )}
                    </section>

                    {/* ?? Nickname Section ?? */}
                    {user?.isVerified && (
                        <section style={{ padding: '0.5rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
                            <GlassCard level={1} style={{ maxWidth: 280, width: '100%', padding: '0.85rem' }}>
                                <form onSubmit={handleNicknameSubmit}>
                                    <label
                                        htmlFor="nickname"
                                        style={{
                                            fontWeight: 700, color: 'var(--text-primary)',
                                            display: 'block', marginBottom: '0.6rem', fontSize: '0.95rem',
                                            fontFamily: 'var(--font-main)',
                                        }}
                                    >
                                        응원 게시판 닉네임
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                                        <input
                                            id="nickname"
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="닉네임을 입력하세요"
                                            maxLength={12}
                                            style={glassInputStyle}
                                        />
                                        <GlassButton type="submit" variant="primary" size="sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                                            변경
                                        </GlassButton>
                                    </div>
                                    {nicknameSaved && (
                                        <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#00d4aa', fontWeight: 600 }}>
                                            닉네임이 변경되었습니다.
                                        </p>
                                    )}
                                </form>
                            </GlassCard>
                        </section>
                    )}

                    {user?.role === 'performer' && (
                        <section style={{ padding: '0.5rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
                            <GlassCard level={1} style={{ maxWidth: 280, width: '100%', padding: '0.85rem' }}>
                                <form onSubmit={handlePerformerNameSubmit}>
                                    <label
                                        htmlFor="performer-board-name"
                                        style={{
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            display: 'block',
                                            marginBottom: '0.6rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'var(--font-main)'
                                        }}
                                    >
                                        게시판 표시 이름
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                                        <input
                                            id="performer-board-name"
                                            type="text"
                                            value={performerBoardName}
                                            onChange={(e) => setPerformerBoardName(e.target.value)}
                                            placeholder="관객에게 보여줄 이름"
                                            maxLength={20}
                                            style={glassInputStyle}
                                        />
                                        <GlassButton type="submit" variant="primary" size="sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                                            저장
                                        </GlassButton>
                                    </div>
                                    {performerNameSaved && (
                                        <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#00d4aa', fontWeight: 600 }}>
                                            표시 이름이 업데이트되었습니다.
                                        </p>
                                    )}
                                </form>
                            </GlassCard>
                        </section>
                    )}

                    {/* ?? Timeline Section ?? */}
                    <section style={{ padding: '1.5rem 1rem 2rem' }}>
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
                                공연 타임라인
                            </h2>
                        </div>

                        <div className="home-timeline-container" style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
                            {/* center line */}
                            <div style={{
                                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                                top: 0, bottom: 0, width: 2,
                                background: 'linear-gradient(180deg, var(--ui-border-strong), var(--ui-border-soft))',
                                zIndex: 0,
                            }} />

                            {(() => {
                                const items = (eventData?.timeline && eventData.timeline.length > 0)
                                    ? eventData.timeline
                                    : [
                                        { id: '1', time: '17:00', title: '관객 입장', icon: 'door' },
                                        { id: '2', time: '17:30', title: '1부 공연 시작', icon: 'music' },
                                        { id: '3', time: '18:10', title: '휴식', icon: 'music' },
                                        { id: '4', time: '18:40', title: '2부 공연 시작', icon: 'flame' }
                                    ];

                                return items.map((item, index) => {
                                    const isLeft = index % 2 === 0;
                                    const IconComp = getIconComp(item.icon);

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex', alignItems: 'center',
                                                marginBottom: '2rem', position: 'relative',
                                                zIndex: 1, width: '100%',
                                            }}
                                        >
                                            {isLeft ? (
                                                <>
                                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                                        <span className="home-time-text" style={{
                                                            display: 'block', fontWeight: 'bold',
                                                            color: timeColor, fontSize: '0.9rem',
                                                            marginBottom: 4, textShadow: `0 0 8px ${timeShadowRgba}`,
                                                        }}>
                                                            {item.time}
                                                        </span>
                                                        <div className="home-item-title" style={{
                                                            fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 'bold',
                                                        }}>
                                                            {item.title}
                                                        </div>
                                                    </div>
                                                    <div className="home-center-icon" style={{ ...iconBaseStyle, background: getIconGradient(item.icon) }}>
                                                        <IconComp size={16} />
                                                    </div>
                                                    <div style={{ flex: 1 }} />
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ flex: 1 }} />
                                                    <div className="home-center-icon" style={{ ...iconBaseStyle, background: getIconGradient(item.icon) }}>
                                                        <IconComp size={16} />
                                                    </div>
                                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                                        <span className="home-time-text" style={{
                                                            display: 'block', fontWeight: 'bold',
                                                            color: timeColor, fontSize: '0.9rem',
                                                            marginBottom: 4, textShadow: `0 0 8px ${timeShadowRgba}`,
                                                        }}>
                                                            {item.time}
                                                        </span>
                                                        <div className="home-item-title" style={{
                                                            fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 'bold',
                                                        }}>
                                                            {item.title}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Home;

