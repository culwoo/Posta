import React, { useState } from 'react';
import { db, auth, collection, addDoc } from '../../../api/firebase';

const AdminReservationForm = ({ eventId }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [ticketCount, setTicketCount] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;
        if (!eventId || !auth.currentUser) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'events', eventId, 'reservations'), {
                name: name.trim(),
                phone: phone.replace(/[-.\s]/g, '').trim(),
                email: email.trim(),
                ticketCount: Number(ticketCount) || 1,
                token: `a_${Math.random().toString(36).slice(2, 11)}`,
                createdByUid: auth.currentUser.uid,
                status: 'reserved',
                depositConfirmed: false,
                source: 'admin',
                createdAt: new Date().toISOString(),
            });
            setSuccessMsg(`${name.trim()} 추가 완료!`);
            setName('');
            setPhone('');
            setEmail('');
            setTicketCount(1);
            setTimeout(() => setSuccessMsg(''), 2000);
        } catch (err) {
            console.error('Manual reservation failed:', err);
            alert('예약 추가에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    placeholder="이름 *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ ...inputStyle, width: '5.5em', flex: 'none' }}
                />
                <input
                    type="tel"
                    placeholder="연락처 *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{ ...inputStyle, flex: '1 1 0', minWidth: 0 }}
                />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                    type="email"
                    placeholder="이메일 (선택)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 0', minWidth: 0 }}
                />
                <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="수량"
                    value={ticketCount}
                    onChange={(e) => setTicketCount(e.target.value)}
                    style={{ ...inputStyle, flex: '0 0 3.5rem', textAlign: 'center' }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                    type="submit"
                    disabled={isSubmitting || !name.trim() || !phone.trim()}
                    style={{
                        padding: '0.5rem 1.2rem',
                        backgroundColor: isSubmitting ? '#555' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                    }}
                >
                    {isSubmitting ? '추가 중...' : '예약 추가'}
                </button>
                {successMsg && (
                    <span style={{ color: '#00d4aa', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {successMsg}
                    </span>
                )}
            </div>
        </form>
    );
};

const inputStyle = {
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
};

export default AdminReservationForm;
