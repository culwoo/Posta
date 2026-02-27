import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar } from 'lucide-react';
import { getManagedEvents } from '../../utils/dashboardData';
import AdBanner from '../../components/AdBanner';

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

    if (loading) return <div>Loading events...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>내 이벤트 목록</h2>
                <Link to="create" style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: '#333', color: '#fff',
                    padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none'
                }}>
                    <Plus size={16} /> 새 이벤트 만들기
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {events.length === 0 ? (
                    <p>생성된 이벤트가 없습니다.</p>
                ) : (
                    events.map(event => (
                        <Link to={`event/${event.id}`} key={event.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{
                                backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px',
                                border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'transform 0.2s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0 }}>{event.title || '제목 없음'}</h3>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px',
                                        backgroundColor: event.userRole === 'organizer' ? '#d04c31' : '#4b5563',
                                        color: '#fff', fontWeight: 'bold'
                                    }}>
                                        {event.userRole === 'organizer' ? '관리자' : (event.userRole === 'performer' ? '공연진' : '참여자')}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={14} />
                                    {formatDate(event.date)}
                                </p>
                                <p style={{ fontSize: '0.8rem', color: '#0066cc', marginTop: '1rem', wordBreak: 'break-all' }}>
                                    🌐 posta.systems/e/{event.id}
                                </p>
                            </div>
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
