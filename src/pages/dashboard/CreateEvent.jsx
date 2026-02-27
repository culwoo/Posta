import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, doc, getDoc, writeBatch } from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';

const CreateEvent = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const finalSlug = slug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(finalSlug)) {
            alert('주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
            setLoading(false);
            return;
        }

        try {
            const eventRef = doc(db, "events", finalSlug);
            const snap = await getDoc(eventRef);
            if (snap.exists()) {
                alert('이미 사용 중인 주소입니다. 다른 주소를 입력해주세요.');
                setLoading(false);
                return;
            }

            let defaultPayment = {
                bankName: '',
                accountNumber: '',
                accountHolder: '',
                ticketPrice: '',
                onsitePrice: '',
                isFreeEvent: false
            };

            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const savedDefaults = userSnap.data()?.settings?.defaults?.payment || {};
                    defaultPayment = {
                        bankName: savedDefaults.bankName || '',
                        accountNumber: savedDefaults.accountNumber || '',
                        accountHolder: savedDefaults.accountHolder || '',
                        ticketPrice: savedDefaults.ticketPrice || '',
                        onsitePrice: savedDefaults.onsitePrice || '',
                        isFreeEvent: false
                    };
                }
            } catch (defaultsError) {
                console.warn("Failed to load user payment defaults:", defaultsError);
            }

            const batch = writeBatch(db);

            // Create minimal event doc
            batch.set(eventRef, {
                title,
                date,
                location,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                isReservationClosed: false,
                payment: defaultPayment,
                theme: { primary: '#000000', secondary: '#ffffff' } // Default theme
            });

            // Auto mapping: Add to user's myEvents subcollection
            batch.set(doc(db, "users", user.uid, "myEvents", finalSlug), {
                eventId: finalSlug,
                role: 'organizer',
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            // Redirect to dashboard after creation
            alert(`이벤트 "${title}" 생성 완료!\n주소: /e/${finalSlug}`);
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to create event:", error);
            alert("이벤트 생성 실패: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>새 이벤트 만들기</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #eee' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>이벤트 제목</label>
                    <input
                        type="text" value={title} onChange={e => setTitle(e.target.value)} required
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>고유 주소 (URL Slug) *중요</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#666' }}>posta.com/e/</span>
                        <input
                            type="text" value={slug} onChange={e => setSlug(e.target.value)} required
                            placeholder="my-cool-band-2026"
                            style={{ flex: 1, padding: '0.5rem' }}
                        />
                    </div>
                    <small style={{ color: '#888', marginTop: '0.3rem', display: 'block' }}>영문 소문자, 숫자, 하이픈(-)만 가능하며 생성 후 변경할 수 없습니다.</small>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>날짜 (예: 2026-01-31)</label>
                    <input
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>장소</label>
                    <input
                        type="text" value={location} onChange={e => setLocation(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <button
                    type="submit" disabled={loading}
                    style={{ padding: '0.8rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {loading ? '생성 중...' : '이벤트 생성'}
                </button>
            </form>
        </div>
    );
};

export default CreateEvent;
