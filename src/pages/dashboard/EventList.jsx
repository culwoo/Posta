import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar } from 'lucide-react';
import { getManagedEvents } from '../../utils/dashboardData';
import AdBanner from '../../components/AdBanner';
import classes from './EventList.module.css';

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
            <div className={classes.titleHeader}>
                <h2 style={{ margin: 0 }}>내 이벤트 목록</h2>
                <Link to="create" className={classes.createButton}>
                    <Plus size={16} /> 새 이벤트 만들기
                </Link>
            </div>

            <div className={classes.gridContainer}>
                {events.length === 0 ? (
                    <p className={classes.emptyState}>생성된 이벤트가 없습니다.</p>
                ) : (
                    events.map(event => (
                        <Link to={`event/${event.id}`} key={event.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className={classes.eventListEventCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3>{event.title || '제목 없음'}</h3>
                                    <span className={`${classes.eventListEventCardRole} ${event.userRole === 'organizer' ? classes.eventListEventCardRoleOrganizer : classes.eventListEventCardRoleOther}`}>
                                        {event.userRole === 'organizer' ? '관리자' : (event.userRole === 'performer' ? '공연진' : '참여자')}
                                    </span>
                                </div>
                                <p className={classes.eventListEventCardDate}>
                                    <Calendar size={14} />
                                    {formatDate(event.date)}
                                </p>
                                <p className={classes.eventListEventCardUrl}>
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
