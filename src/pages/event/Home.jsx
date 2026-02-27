import React, { useEffect, useRef, useState } from 'react';
import { Image, DoorOpen, Music, Coffee, Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
import { functions, httpsCallable } from '../../api/firebase';
import AudienceEntry from '../../components/AudienceEntry';
import classes from './Home.module.css';

const Home = () => {
    const { eventId, eventData } = useEvent();
    const { user, updateNickname, authInitialized } = useAuth();
    const [rotationBase, setRotationBase] = useState(0);
    const [dragRotation, setDragRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [hintSpin, setHintSpin] = useState(false);
    const [checkinStatus, setCheckinStatus] = useState(null);
    const [nickname, setNickname] = useState('');
    const [nicknameSaved, setNicknameSaved] = useState(false);
    const touchStartX = useRef(null);
    const cardWidth = useRef(0);
    const flipCardRef = useRef(null);

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

    return (
        <div className={classes.home}>

            {/* Logic: Show Entry Form if not logged in. Else show Content */}
            {!user ? (
                <AudienceEntry />
            ) : (
                <>
                    {/* Poster or Ticket Section */}
                    <section className={classes.posterSection}>
                        {user.isVerified ? (
                            <>
                                <div
                                    className={`${classes.flipCard} ${hintSpin ? classes.hintSpin : ''}`}
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
                                        className={`${classes.flipInner} ${isDragging ? classes.dragging : ''}`}
                                        style={{ transform: `rotateY(${rotationBase + dragRotation}deg) translateZ(0)` }}
                                    >
                                        <div className={`${classes.flipFace} ${classes.flipFront}`}>
                                            <div className={classes.posterCard}>
                                                {eventData?.posterUrl && (
                                                    <img src={eventData.posterUrl} alt="공연 포스터" className={classes.posterImage} />
                                                )}
                                            </div>
                                        </div>
                                        <div className={`${classes.flipFace} ${classes.flipBack}`}>
                                            <div className={classes.ticketCard}>
                                                {checkinStatus?.checkedIn && (
                                                    <div className={classes.checkinBadge}>
                                                        입장 인증 완료
                                                    </div>
                                                )}
                                                <div className={classes.ticketHeader}>
                                                    <span className={classes.ticketTitle}>{eventData?.title || '공연 티켓'}</span>
                                                </div>
                                                <div className={classes.ticketBody}>
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(user.token || user.uid)}`}
                                                        alt="Ticket QR"
                                                        className={classes.qrCode}
                                                    />
                                                    <p className={classes.ticketName}>{user.name} 님</p>
                                                    <p className={classes.ticketInfo}>{eventData?.date} {eventData?.time} | {eventData?.location}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </>
                        ) : (
                            <div className={classes.posterCard}>
                                {eventData?.posterUrl && (
                                    <img src={eventData.posterUrl} alt="공연 포스터" className={classes.posterImage} />
                                )}
                            </div>
                        )}
                    </section>
                    {user.isVerified && (
                        <section className={classes.nicknameSection}>
                            <form className={classes.nicknameForm} onSubmit={handleNicknameSubmit}>
                                <label className={classes.nicknameLabel} htmlFor="nickname">
                                    응원 게시판 닉네임
                                </label>
                                <div className={classes.nicknameControls}>
                                    <input
                                        id="nickname"
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="닉네임을 입력하세요"
                                        maxLength={12}
                                    />
                                    <button type="submit">변경</button>
                                </div>
                                {nicknameSaved && (
                                    <p className={classes.nicknameSaved}>닉네임이 변경되었습니다.</p>
                                )}
                            </form>
                        </section>
                    )}

                    <section className={classes.timelineSection}>
                        <div className={classes.timelineHeader}>
                            <h2>공연 타임라인</h2>
                        </div>

                        <div className={classes.timelineContainer}>
                            <div className={classes.timelineLine}></div>

                            {(() => {
                                const items = (eventData?.timeline && eventData.timeline.length > 0)
                                    ? eventData.timeline
                                    : [
                                        { id: '1', time: '17:00', title: '관객 입장', icon: 'door' },
                                        { id: '2', time: '17:30', title: 'Wave 공연', icon: 'music' },
                                        { id: '3', time: '18:10', title: '특별 게스트', icon: 'mic' },
                                        { id: '4', time: '18:40', title: 'Posta 공연', icon: 'flame' }
                                    ];

                                return items.map((item, index) => {
                                    const isLeft = index % 2 === 0;
                                    const alignClass = isLeft ? classes.leftAlign : classes.rightAlign;

                                    let IconComp = Music;
                                    let iconColorClass = classes.iconBlue;
                                    if (item.icon === 'door') { IconComp = DoorOpen; iconColorClass = classes.iconGreen; }
                                    else if (item.icon === 'coffee') { IconComp = Coffee; iconColorClass = classes.iconYellow; }
                                    else if (item.icon === 'flame') { IconComp = Flame; iconColorClass = classes.iconPrimary; }

                                    return (
                                        <div key={item.id} className={`${classes.timelineItem} ${alignClass}`}>
                                            {isLeft ? (
                                                <>
                                                    <div className={classes.contentBox}>
                                                        <span className={classes.timeText}>{item.time}</span>
                                                        <div className={classes.itemTitle}>{item.title}</div>
                                                    </div>
                                                    <div className={`${classes.centerIcon} ${iconColorClass}`}>
                                                        <IconComp size={16} />
                                                    </div>
                                                    <div className={classes.dummyBox}></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={classes.dummyBox}></div>
                                                    <div className={`${classes.centerIcon} ${iconColorClass}`}>
                                                        <IconComp size={16} />
                                                    </div>
                                                    <div className={classes.contentBox}>
                                                        <span className={classes.timeText}>{item.time}</span>
                                                        <div className={classes.itemTitle}>{item.title}</div>
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
            )
            }
        </div>
    );
};

export default Home;
