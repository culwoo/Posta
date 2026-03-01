import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar } from 'lucide-react';
import { getManagedEvents } from '../../utils/dashboardData';
import AdBanner from '../../components/AdBanner';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

// Firestore Timestamp → 문자열 변환
const formatDate = (val) => {
    if (!val) return '날짜 미정';
    if (typeof val === 'string') return val;
    if (val?.toDate) return val.toDate().toLocaleDateString('ko-KR');
    if (val?.seconds) return new Date(val.seconds * 1000).toLocaleDateString('ko-KR');
    return String(val);
};

const EventList = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const eventsArray = await getManagedEvents(user.uid);
                setEvents(eventsArray);
            } catch (e) {
                console.error("Failed to fetch events:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [user]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-main)',
            }}>
                로딩 중...
            </div>
        );
    }

    return (
        <div>
            {/* Title Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                color: 'var(--text-primary)',
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-main)',
                    color: 'var(--text-primary)',
                }}>
                    내 이벤트 목록
                </h2>
                <Link to="create" style={{ textDecoration: 'none' }}>
                    <GlassButton variant="secondary" size="sm">
                        <Plus size={16} />
                        새 이벤트 만들기
                    </GlassButton>
                </Link>
            </div>

            {/* Event Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
            }}>
                {events.length === 0 ? (
                    <GlassCard level={1} style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                        <p style={{
                            margin: 0,
                            color: 'var(--text-secondary)',
                            fontSize: '1.05rem',
                            fontFamily: 'var(--font-main)',
                        }}>
                            생성된 이벤트가 없습니다.
                        </p>
                    </GlassCard>
                ) : (
                    events.map(event => (
                        <Link
                            to={`event/${event.id}`}
                            key={event.id}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <GlassCard
                                level={1}
                                hover
                                style={{ padding: '1.5rem', cursor: 'pointer', height: '100%' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '0.5rem',
                                    gap: '0.5rem',
                                }}>
                                    <h3 style={{
                                        margin: 0,
                                        color: 'var(--text-primary)',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '-0.02em',
                                        fontFamily: 'var(--font-main)',
                                        lineHeight: 1.3,
                                    }}>
                                        {event.title || '제목 없음'}
                                    </h3>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        color: event.userRole === 'organizer' ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-main)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        background: event.userRole === 'organizer'
                                            ? 'linear-gradient(135deg, var(--primary-color), rgba(246,196,88,0.8))'
                                            : 'var(--ui-surface-soft)',
                                        border: event.userRole === 'organizer'
                                            ? 'none'
                                            : '1px solid var(--ui-border-soft)',
                                        backdropFilter: event.userRole !== 'organizer' ? 'blur(4px)' : 'none',
                                    }}>
                                        {event.userRole === 'organizer' ? '관리자' : (event.userRole === 'performer' ? '공연진' : '참여자')}
                                    </span>
                                </div>

                                <p style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    margin: '0.5rem 0 0 0',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'var(--font-main)',
                                }}>
                                    <Calendar size={13} />
                                    {formatDate(event.date)}
                                </p>

                                <p style={{
                                    margin: '0.75rem 0 0 0',
                                    fontSize: '0.85rem',
                                    color: 'var(--accent-color)',
                                    wordBreak: 'break-all',
                                    fontWeight: 500,
                                    fontFamily: 'var(--font-main)',
                                }}>
                                    🌐 posta.systems/e/{event.id}
                                </p>
                            </GlassCard>
                        </Link>
                    ))
                )}
            </div>

            {/* 하단 광고 영역 */}
            <AdBanner placement="event-list" style={{ marginTop: '2rem' }} />
        </div>
    );
};

export default EventList;
