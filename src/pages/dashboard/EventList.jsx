import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, query, where, getDocs } from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar } from 'lucide-react';

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
            try {
                const q = query(collection(db, "events"), where("ownerId", "==", user.uid));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEvents(list);
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
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title || '제목 없음'}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={14} />
                                    {formatDate(event.date)}
                                </p>
                                <p style={{ fontSize: '0.8rem', color: '#0066cc', marginTop: '1rem', wordBreak: 'break-all' }}>
                                    🌐 posta.com/e/{event.id}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventList;
