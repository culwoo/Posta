import React, { useState } from 'react';
import { addDoc, auth, collection, db } from '../../api/firebase';
import { useEvent } from '../../contexts/EventContext';
import classes from './Onsite.module.css';

const Onsite = () => {
    const { eventId, eventData } = useEvent();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [ticketCount, setTicketCount] = useState(1);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const payment = eventData?.payment || {};
    const bankName = payment.bankName || '';
    const accountNumber = payment.accountNumber || '';
    const accountHolder = payment.accountHolder || '';
    const onsitePrice = Number(payment.onsitePrice || 0);
    const displayAccount = bankName && accountNumber ? `${bankName} ${accountNumber}` : '';

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting || !eventId) return;

        setIsSubmitting(true);
        try {
            const token = `o_${Math.random().toString(36).slice(2, 11)}`;
            const createdByUid = auth.currentUser?.uid || null;
            await addDoc(collection(db, 'events', eventId, 'reservations'), {
                name: name.trim(),
                phone: phone.trim(),
                ticketCount: Number(ticketCount) || 1,
                token,
                createdByUid,
                status: 'onsite',
                depositConfirmed: false,
                createdAt: new Date().toISOString(),
                description: '현장 결제'
            });
            setStep(2);
        } catch (error) {
            console.error('Submission failed:', error);
            alert('요청 중 오류가 발생했습니다. 스태프에게 문의해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyAccount = async () => {
        if (!displayAccount) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(displayAccount);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = displayAccount;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            alert('계좌번호가 복사되었습니다.');
        } catch {
            alert('복사에 실패했습니다.');
        }
    };

    return (
        <div className={classes.container}>
            {step === 1 ? (
                <>
                    <h2 className={classes.title}>현장 결제</h2>
                    <p className={classes.subtitle}>
                        이름, 연락처, 수량을 입력하고
                        <br />
                        현장 결제를 요청해주세요.
                    </p>
                    <form onSubmit={handleSubmit} className={classes.form}>
                        <div className={classes.inputGroup}>
                            <label>이름</label>
                            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 홍길동" required />
                        </div>
                        <div className={classes.inputGroup}>
                            <label>연락처</label>
                            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01012345678" required />
                        </div>
                        <div className={classes.inputGroup}>
                            <label>수량(장)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={ticketCount}
                                onChange={(event) => setTicketCount(event.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className={classes.submitBtn} disabled={isSubmitting}>
                            현장 결제 요청하기
                        </button>
                    </form>
                </>
            ) : (
                <div className={classes.successStep}>
                    <h3 className={classes.successTitle}>요청이 접수되었습니다</h3>

                    {onsitePrice > 0 && (
                        <p className={classes.amount}>
                            결제 금액: <strong>{(onsitePrice * Number(ticketCount || 1)).toLocaleString()}원</strong>
                        </p>
                    )}

                    {displayAccount && (
                        <div className={classes.bankBox}>
                            <button type="button" className={classes.bankCopyBtn} onClick={handleCopyAccount}>
                                {displayAccount}
                            </button>
                            {accountHolder && <p className={classes.bankOwner}>예금주: {accountHolder} (터치하여 복사)</p>}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '1.5rem',
                            width: '100%',
                            maxWidth: '320px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                            marginBottom: '1rem'
                        }}
                    >
                        <a
                            href="supertoss://"
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '12px',
                                background: '#3182f6',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                fontSize: '0.95rem'
                            }}
                        >
                            토스로 송금
                        </a>
                        <a
                            href="kakaotalk://kakaopay"
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '12px',
                                background: '#fee500',
                                color: '#191919',
                                textDecoration: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                fontSize: '0.95rem'
                            }}
                        >
                            카카오페이
                        </a>
                    </div>

                    <p className={classes.guideText}>
                        입금 후 스태프에게 입금 완료를 말씀해주세요.
                        <br />
                        확인되면 바로 입장 가능합니다.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Onsite;
