import React, { useEffect, useState } from 'react';
import {
    addDoc,
    auth,
    collection,
    db,
    doc,
    functions,
    getDoc,
    getDownloadURL,
    httpsCallable,
    storage,
    storageRef,
    updateDoc,
    uploadBytes
} from '../../api/firebase';
import AIProgressTimer from '../../components/AIProgressTimer';
import { useEvent } from '../../contexts/EventContext';
import classes from './Reservation.module.css';

const Reservation = () => {
    const { eventId, eventData } = useEvent();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [ticketCount, setTicketCount] = useState(1);

    const [step, setStep] = useState(1);
    const [reservationId, setReservationId] = useState(null);
    const [reservationToken, setReservationToken] = useState(null);
    const [receiptUrl, setReceiptUrl] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [depositConfirmed, setDepositConfirmed] = useState(false);
    const [verifyingAI, setVerifyingAI] = useState(false);

    const [isReservationClosed, setIsReservationClosed] = useState(false);
    const [isFreeEvent, setIsFreeEvent] = useState(false);
    const [skipLocalRestore, setSkipLocalRestore] = useState(false);

    const payment = eventData?.payment || {};
    const bankName = payment.bankName || '';
    const accountNum = payment.accountNumber || '';
    const accountHolder = payment.accountHolder || '';
    const ticketPrice = Number(payment.ticketPrice || 0);
    const displayAccount = bankName && accountNum ? `${bankName} ${accountNum}` : '';

    const resetReservationState = () => {
        setDepositConfirmed(false);
        setVerifyingAI(false);
        setUploadingReceipt(false);
        setReservationId(null);
        setReservationToken(null);
        setReceiptUrl(null);
        setName('');
        setPhone('');
        setEmail('');
        setTicketCount(1);
        setStep(1);
        setIsSubmitting(false);
    };

    useEffect(() => {
        if (!eventData) return;
        setIsReservationClosed(eventData.isReservationClosed === true);
        setIsFreeEvent(eventData.payment?.isFreeEvent === true);
    }, [eventData]);

    useEffect(() => {
        const verifyLocalReservation = async () => {
            if (!eventId || skipLocalRestore) return;
            const savedRaw = localStorage.getItem(`reserved_${eventId}`);
            if (!savedRaw) return;

            try {
                const parsed = JSON.parse(savedRaw);
                if (!parsed.reservationId) return;

                const snap = await getDoc(doc(db, 'events', eventId, 'reservations', parsed.reservationId));
                if (!snap.exists()) {
                    localStorage.removeItem(`reserved_${eventId}`);
                    return;
                }

                const data = snap.data();
                setName(parsed.name || '');
                setPhone(parsed.phone || '');
                setEmail(parsed.email || '');
                setTicketCount(parsed.ticketCount || 1);
                setReservationId(parsed.reservationId);
                setReservationToken(parsed.token || data.token || null);
                setReceiptUrl(parsed.receiptUrl || data.receiptUrl || null);
                setDepositConfirmed(Boolean(data.depositConfirmed));
                setStep(2);
            } catch (error) {
                console.error('Failed to load local reservation:', error);
            }
        };

        verifyLocalReservation();
    }, [eventId, skipLocalRestore]);

    const handleReceiptUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !eventId || !reservationId) return;

        const uploaderUid = auth.currentUser?.uid;
        if (!uploaderUid) {
            alert('로그인 상태를 확인 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        setUploadingReceipt(true);
        try {
            const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const fileName = `receipts/${eventId}/${uploaderUid}/${reservationId}_${Date.now()}.${fileExt}`;
            const imageRef = storageRef(storage, fileName);

            await uploadBytes(imageRef, file);
            const downloadedUrl = await getDownloadURL(imageRef);

            await updateDoc(doc(db, 'events', eventId, 'reservations', reservationId), {
                receiptUrl: downloadedUrl,
                updatedAt: new Date().toISOString()
            });

            setReceiptUrl(downloadedUrl);
            const savedRaw = localStorage.getItem(`reserved_${eventId}`);
            if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                localStorage.setItem(`reserved_${eventId}`, JSON.stringify({ ...parsed, receiptUrl: downloadedUrl }));
            }
            alert('입금 캡처 이미지가 업로드되었습니다.');
        } catch (error) {
            console.error('Receipt upload failed:', error);
            alert('업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setUploadingReceipt(false);
            event.target.value = '';
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (!eventId) {
            alert('이벤트 정보가 없습니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                ticketCount: Number(ticketCount) || 1
            };

            if (reservationId) {
                const savedRaw = localStorage.getItem(`reserved_${eventId}`);
                const parsed = savedRaw ? JSON.parse(savedRaw) : {};
                await updateDoc(doc(db, 'events', eventId, 'reservations', reservationId), {
                    ...payload,
                    updatedAt: new Date().toISOString()
                });
                localStorage.setItem(
                    `reserved_${eventId}`,
                    JSON.stringify({
                        ...parsed,
                        ...payload,
                        reservationId,
                        token: reservationToken || parsed.token || null
                    })
                );
            } else {
                setDepositConfirmed(false);
                setVerifyingAI(false);
                setUploadingReceipt(false);
                setReceiptUrl(null);

                const createdByUid = auth.currentUser?.uid;
                if (!createdByUid) {
                    alert('로그인 상태를 확인 중입니다. 잠시 후 다시 시도해주세요.');
                    return;
                }

                const token = `r_${Math.random().toString(36).slice(2, 11)}`;
                const docRef = await addDoc(collection(db, 'events', eventId, 'reservations'), {
                    ...payload,
                    token,
                    createdByUid,
                    status: 'reserved',
                    depositConfirmed: false,
                    createdAt: new Date().toISOString()
                });

                setReservationId(docRef.id);
                setReservationToken(token);
                setSkipLocalRestore(false);
                localStorage.setItem(`reserved_${eventId}`, JSON.stringify({ ...payload, reservationId: docRef.id, token }));
            }

            setStep(2);
        } catch (error) {
            console.error('Reservation failed:', error);
            alert('예매 요청 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAIVerify = async () => {
        if (!eventId || !reservationId || !receiptUrl) return;
        setVerifyingAI(true);
        try {
            const verifyReceiptFn = httpsCallable(functions, 'verifyDepositReceipt');
            const response = await verifyReceiptFn({
                eventId,
                reservationId,
                reservationToken: reservationToken || undefined,
                originUrl: window.location.origin
            });
            const result = response.data || {};

            if (result.isValid) {
                setDepositConfirmed(true);
                alert('입금 확인이 완료되었습니다. 안내 메일을 확인해주세요.');
            } else {
                alert(`AI 확인 실패: ${result.reason || '수동 확인이 필요합니다.'}`);
            }
        } catch (error) {
            console.error('AI verification failed:', error);
            if (error?.code === 'unauthenticated') {
                alert('로그인이 필요합니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
            } else if (error?.code === 'permission-denied') {
                alert('이 예약 확인 권한이 없습니다. 동일 브라우저에서 다시 시도해주세요.');
            } else {
                alert('AI 검증 중 오류가 발생했습니다. 관리자가 수동 확인할 예정입니다.');
            }
        } finally {
            setVerifyingAI(false);
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
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
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

    const handleNewReservation = () => {
        if (window.confirm('기존 예약을 유지한 채 새 티켓 예매를 시작할까요?')) {
            setSkipLocalRestore(true);
            localStorage.removeItem(`reserved_${eventId}`);
            resetReservationState();
        }
    };

    return (
        <div className={classes.container}>
            {isReservationClosed ? (
                <div className={classes.closedContainer} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <h2 className={classes.title}>사전 예매가 마감되었습니다.</h2>
                    <p className={classes.subtitle} style={{ marginTop: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
                        온라인 예매가 종료되었습니다.
                        <br />
                        <strong>현장 결제</strong>를 이용해주세요.
                    </p>
                </div>
            ) : step === 1 ? (
                <>
                    <h2 className={classes.title}>공연 예매하기</h2>
                    <p className={classes.subtitle}>
                        입력하신 이메일로 예약 확인 안내가 발송됩니다.
                        <br />
                        정확하게 작성해주세요.
                    </p>
                    <form onSubmit={handleSubmit} className={classes.form}>
                        <div className={classes.inputGroup}>
                            <label>이름(입금명)</label>
                            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 홍길동" required />
                        </div>
                        <div className={classes.inputGroup}>
                            <label>연락처</label>
                            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01012345678" required />
                        </div>
                        <div className={classes.inputGroup}>
                            <label>이메일</label>
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" required />
                        </div>
                        <div className={classes.inputGroup}>
                            <label>수량(장)</label>
                            <input type="number" min="1" max="10" value={ticketCount} onChange={(event) => setTicketCount(event.target.value)} required />
                        </div>
                        <button type="submit" className={classes.submitBtn} disabled={isSubmitting}>
                            {reservationId ? '정보 수정 저장' : '예매 요청하기'}
                        </button>
                    </form>
                </>
            ) : (
                <div className={classes.successStep}>
                    <h3 className={classes.successTitle}>
                        {isFreeEvent || depositConfirmed
                            ? '🎉 예매가 확정되었습니다!'
                            : receiptUrl
                                ? '업로드가 완료되었습니다. 입금을 확인해주세요!'
                                : '💳 입금을 진행해주세요!'}
                    </h3>

                    <div className={classes.infoBox}>
                        <div className={classes.infoHeader}>
                            <h4 className={classes.infoTitle}>예약 정보</h4>
                            <button type="button" className={classes.editBtn} onClick={() => setStep(1)}>
                                예약 정보 수정
                            </button>
                        </div>
                        <div className={classes.infoList}>
                            <div className={classes.infoRow}>
                                <span className={classes.infoLabel}>이름</span>
                                <span className={classes.infoValue}>{name || '-'}</span>
                            </div>
                            <div className={classes.infoRow}>
                                <span className={classes.infoLabel}>연락처</span>
                                <span className={classes.infoValue}>{phone || '-'}</span>
                            </div>
                            <div className={classes.infoRow}>
                                <span className={classes.infoLabel}>이메일</span>
                                <span className={classes.infoValue}>{email || '-'}</span>
                            </div>
                            <div className={classes.infoRow}>
                                <span className={classes.infoLabel}>수량</span>
                                <span className={classes.infoValue}>{ticketCount}장</span>
                            </div>
                        </div>
                    </div>

                    {!isFreeEvent && displayAccount && (
                        <div className={classes.accountBox}>
                            {ticketPrice > 0 && (
                                <p className={classes.amount}>
                                    입금 금액: <strong>{(ticketPrice * Number(ticketCount || 1)).toLocaleString()}원</strong>
                                </p>
                            )}
                            <button type="button" className={classes.bankNameButton} onClick={handleCopyAccount}>
                                {displayAccount}
                            </button>
                            {accountHolder && <p className={classes.accountName}>예금주: {accountHolder} (터치하여 복사)</p>}
                            <p className={classes.warningText}>반드시 예약하신 “{name}” 이름으로 입금해주세요.</p>

                            <div
                                style={{
                                    marginTop: '1.5rem',
                                    padding: '1.2rem 1rem',
                                    backgroundColor: depositConfirmed ? 'rgba(0, 212, 170, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    border: depositConfirmed ? '1px solid rgba(0, 212, 170, 0.25)' : '1px solid var(--ui-border-soft)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                }}
                            >
                                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'center' }}>
                                    {depositConfirmed ? '🎉 입금 확인 완료' : '🧾 입금 캡처본 업로드 및 인증'}
                                </h4>
                                {receiptUrl ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#00d4aa', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                                            {depositConfirmed ? '결제가 확인되었습니다. 메일을 확인해주세요.' : '업로드 완료! AI 확인을 진행해주세요.'}
                                        </p>
                                        <img
                                            src={receiptUrl}
                                            alt="입금 내역"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '220px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--ui-border-soft)',
                                                objectFit: 'contain',
                                                objectPosition: 'center',
                                                display: 'block',
                                                margin: '0 auto 1rem'
                                            }}
                                        />

                                        {!depositConfirmed && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    onClick={handleAIVerify}
                                                    disabled={verifyingAI}
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: '300px',
                                                        padding: '0.8rem',
                                                        background: verifyingAI
                                                            ? 'rgba(255, 255, 255, 0.08)'
                                                            : 'linear-gradient(135deg, rgba(246, 196, 88, 0.9), rgba(246, 196, 88, 0.75))',
                                                        color: verifyingAI ? 'var(--ui-text-muted)' : '#1a1a2e',
                                                        border: '1px solid ' + (verifyingAI ? 'var(--ui-border-soft)' : 'rgba(246, 196, 88, 0.4)'),
                                                        borderRadius: '10px',
                                                        fontWeight: 'bold',
                                                        cursor: verifyingAI ? 'not-allowed' : 'pointer',
                                                        fontSize: '0.95rem',
                                                        boxShadow: verifyingAI ? 'none' : '0 4px 16px rgba(246, 196, 88, 0.2)',
                                                    }}
                                                >
                                                    {verifyingAI ? '분석 중...' : '🤖 입금 확인 후 예약 확정하기!'}
                                                </button>

                                                <label
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '0.5rem 0.8rem',
                                                        backgroundColor: 'transparent',
                                                        color: 'var(--ui-text-muted)',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    {uploadingReceipt ? '업로드 중...' : '다른 이미지로 다시 올리기'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleReceiptUpload}
                                                        disabled={uploadingReceipt || verifyingAI}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>

                                                <AIProgressTimer
                                                    active={verifyingAI}
                                                    title="AI 영수증 분석 중"
                                                    icon="🧾"
                                                    estimatedSeconds={20}
                                                    steps={[
                                                        { label: '영수증 이미지를 전송 중...' },
                                                        { label: 'AI가 입금 내역을 분석 중...' },
                                                        { label: '금액과 입금자명을 대조 중...' },
                                                        { label: '결과를 확인하고 있습니다...' }
                                                    ]}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', marginBottom: '1rem', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                                            입금 후 아래 버튼으로 이체 완료 화면을 업로드해주세요.
                                        </p>
                                        <label
                                            style={{
                                                display: 'inline-block',
                                                padding: '0.6rem 1rem',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                color: 'var(--text-primary)',
                                                textAlign: 'center',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                border: '1px solid var(--ui-border-soft)',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                backdropFilter: 'blur(8px)',
                                                WebkitBackdropFilter: 'blur(8px)',
                                            }}
                                        >
                                            {uploadingReceipt ? '업로드 중...' : '이미지 선택 및 업로드'}
                                            <input type="file" accept="image/*" onChange={handleReceiptUpload} disabled={uploadingReceipt} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <p className={classes.guideText}>
                        {isFreeEvent || depositConfirmed
                            ? '입력하신 이메일로 예약 안내가 발송되었습니다.'
                            : <span style={{ color: 'var(--primary-color, #d04c31)', fontWeight: 'bold' }}>AI 검증 또는 관리자 수동 확인 후 메일이 발송됩니다.</span>}
                    </p>
                    <p className={classes.guideText}>공연 당일 이름과 연락처 확인 후 입장합니다.</p>

                    <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--ui-border-soft)', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', marginBottom: '0.8rem' }}>다른 관객으로 새 예약을 진행할까요?</p>
                        <button
                            onClick={handleNewReservation}
                            style={{
                                padding: '0.6rem 1.2rem',
                                backgroundColor: 'transparent',
                                color: 'var(--primary-color, #d04c31)',
                                border: '1px solid var(--primary-color, #d04c31)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                            }}
                        >
                            + 새 티켓 추가 예매하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reservation;
