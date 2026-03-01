import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, doc, getDoc, writeBatch } from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const glassInputStyle = {
    width: '100%',
    padding: '0.7rem 0.9rem',
    background: 'var(--ui-surface-soft)',
    border: '1px solid var(--ui-border-soft)',
    borderTop: '1px solid var(--ui-border-strong)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-main)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-main)',
    letterSpacing: '-0.01em',
};

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

            batch.set(eventRef, {
                title,
                date,
                location,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                isReservationClosed: false,
                payment: defaultPayment,
                theme: { primary: '#000000', secondary: '#ffffff' }
            });

            batch.set(doc(db, "users", user.uid, "myEvents", finalSlug), {
                eventId: finalSlug,
                role: 'organizer',
                createdAt: new Date().toISOString()
            });

            await batch.commit();

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
            <Link
                to="/dashboard"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    marginBottom: '1.5rem',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.9rem',
                }}
            >
                <ArrowLeft size={16} /> 목록으로 돌아가기
            </Link>

            <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-main)',
                color: 'var(--text-primary)',
            }}>
                새 이벤트 만들기
            </h2>

            <GlassCard level={1} style={{ padding: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}>이벤트 제목</label>
                        <input
                            type="text" value={title} onChange={e => setTitle(e.target.value)} required
                            style={glassInputStyle}
                            placeholder="공연 제목을 입력하세요"
                        />
                    </div>
                    <div>
                        <label style={{ ...labelStyle, fontWeight: 600 }}>고유 주소 (URL Slug)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-main)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>posta.systems/e/</span>
                            <input
                                type="text" value={slug} onChange={e => setSlug(e.target.value)} required
                                placeholder="my-cool-band-2026"
                                style={{ ...glassInputStyle, flex: 1 }}
                            />
                        </div>
                        <small style={{ color: 'var(--text-tertiary)', marginTop: '0.4rem', display: 'block', fontSize: '0.8rem', fontFamily: 'var(--font-main)' }}>
                            영문 소문자, 숫자, 하이픈(-)만 가능하며 생성 후 변경할 수 없습니다.
                        </small>
                    </div>
                    <div>
                        <label style={labelStyle}>날짜</label>
                        <input
                            type="date" value={date} onChange={e => setDate(e.target.value)}
                            style={glassInputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>장소</label>
                        <input
                            type="text" value={location} onChange={e => setLocation(e.target.value)}
                            style={glassInputStyle}
                            placeholder="공연 장소를 입력하세요"
                        />
                    </div>
                    <GlassButton
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        {loading ? '생성 중...' : '이벤트 생성'}
                    </GlassButton>
                </form>
            </GlassCard>
        </div>
    );
};

export default CreateEvent;
