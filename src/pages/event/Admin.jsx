import React, { useState, useEffect } from 'react';
import {
    db,
    functions,
    httpsCallable,
    collection,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    getDocs
} from '../../api/firebase';
import { Search } from 'lucide-react';
import { useEvent } from '../../contexts/EventContext';
import classes from './Admin.module.css';

const Admin = () => {
    const { eventId, eventData } = useEvent();
    const [reservations, setReservations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [performers, setPerformers] = useState([]);
    const [performersLoading, setPerformersLoading] = useState(true);
    const [performersError, setPerformersError] = useState('');
    const [isReservationClosed, setIsReservationClosed] = useState(false);
    const [visitPurposes, setVisitPurposes] = useState([]);
    const [newPurpose, setNewPurpose] = useState('');

    useEffect(() => {
        if (eventData) {
            setIsReservationClosed(eventData.isReservationClosed === true);
            setVisitPurposes(eventData.visitPurposes || []);
        }
    }, [eventData]);

    const handleToggleReservation = async () => {
        if (!eventId) return;
        const newValue = !isReservationClosed;
        const message = newValue
            ? "예약을 마감하시겠습니까? 사용자들은 더 이상 예약할 수 없습니다."
            : "예약을 다시 여시겠습니까? 사용자들이 예약할 수 있게 됩니다.";

        if (!window.confirm(message)) return;

        try {
            await updateDoc(doc(db, "events", eventId), {
                isReservationClosed: newValue
            });
            // Update local state is handled by onSnapshot in EventContext -> eventData prop
        } catch (err) {
            console.error("Failed to update reservation status:", err);
            alert("상태 변경에 실패했습니다.");
        }
    };

    const [error, setError] = useState(null);

    useEffect(() => {
        if (!eventId) return;
        const q = query(collection(db, "events", eventId, "reservations"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            setReservations(list);
            setError(null);
        }, (err) => {
            console.error("Reservations fetch error:", err);
            setError("예약 정보를 불러오는데 실패했습니다: " + err.message);
        });
        return unsubscribe;
    }, [eventId]);

    useEffect(() => {
        if (!eventId) {
            setPerformers([]);
            setPerformersLoading(false);
            return undefined;
        }

        const q = query(
            collection(db, "events", eventId, "performers"),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs
                    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                setPerformers(list);
                setPerformersLoading(false);
                setPerformersError('');
            },
            (err) => {
                console.error("Failed to load performers:", err);
                setPerformersError("공연진 목록을 불러오지 못했습니다: " + err.message);
                setPerformersLoading(false);
            }
        );
        return unsubscribe;
    }, [eventId]);

    const [verifyingIds, setVerifyingIds] = useState({});

    const handleAIVerify = async (reservation) => {
        if (!eventId) return;
        if (!reservation.receiptUrl) {
            alert("확인할 영수증 이미지가 없습니다.");
            return;
        }

        setVerifyingIds(prev => ({ ...prev, [reservation.id]: true }));

        try {
            const verifyReceiptFn = httpsCallable(functions, "verifyDepositReceipt");
            const response = await verifyReceiptFn({
                eventId,
                reservationId: reservation.id,
                originUrl: window.location.origin
            });
            const result = response.data || {};

            if (result.isValid) {
                alert(`[AI 자동 승인 완료]\n이름: ${result.detectedName || reservation.name}\n금액: ${result.detectedAmount || '-'}원\n사유: ${result.reason || '-'}`);
            } else {
                alert(`[AI 검증 실패 - 수동 확인 필요]\n인식된 이름: ${result.detectedName || '없음'}\n인식된 금액: ${result.detectedAmount || '없음'}원\n사유: ${result.reason || '-'}\n\n영수증을 직접 확인해주세요.`);
            }

        } catch (err) {
            console.error("AI Verification failed:", err);
            alert("AI 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setVerifyingIds(prev => ({ ...prev, [reservation.id]: false }));
        }
    };

    const handleToggleDeposit = async (id) => {
        if (!eventId) return;
        const reservation = reservations.find(r => r.id === id);
        if (!reservation) return;
        const newDeposit = !reservation.depositConfirmed;
        await updateDoc(doc(db, "events", eventId, "reservations", id), {
            status: newDeposit ? "paid" : "reserved",
            depositConfirmed: newDeposit,
            depositConfirmedAt: newDeposit ? new Date().toISOString() : null,
            originUrl: window.location.origin
        });
    };

    const handleDeleteReservation = async (id) => {
        if (!window.confirm("이 예약을 삭제할까요? 되돌릴 수 없습니다.")) return;
        if (!eventId) return;

        const reservation = reservations.find(r => r.id === id);
        if (!reservation) return;

        await deleteDoc(doc(db, "events", eventId, "reservations", id));
        alert(`${reservation.name} 예약을 삭제했습니다.`);
    };

    const handleDeleteAllReservations = async () => {
        if (!window.confirm("모든 예약을 삭제할까요? 되돌릴 수 없습니다.")) return;
        if (!eventId) return;

        const snapshot = await getDocs(collection(db, "events", eventId, "reservations"));
        if (snapshot.empty) {
            alert("삭제할 예약이 없습니다.");
            return;
        }

        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "events", eventId, "reservations", docSnap.id));
        }

        alert("모든 예약을 삭제했습니다.");
    };

    const handleDeletePerformer = async (performer) => {
        if (!eventId) return;

        const confirmMessage = "이 공연진을 삭제할까요? 되돌릴 수 없습니다.";
        if (!window.confirm(confirmMessage)) return;

        try {
            await deleteDoc(doc(db, "events", eventId, "performers", performer.id));
            alert(`${performer.email || performer.name || '공연진'} 계정을 삭제했습니다.`);
        } catch (err) {
            console.error("Failed to delete performer:", err);
            setPerformersError("공연진 삭제에 실패했습니다.");
        }
    };


    const handleAddPurpose = async () => {
        const trimmed = newPurpose.trim();
        if (!trimmed || !eventId) return;
        if (visitPurposes.includes(trimmed)) {
            alert('이미 존재하는 항목입니다.');
            return;
        }
        const updated = [...visitPurposes, trimmed];
        await updateDoc(doc(db, "events", eventId), { visitPurposes: updated });
        setVisitPurposes(updated);
        setNewPurpose('');
    };

    const handleRemovePurpose = async (purpose) => {
        if (!eventId) return;
        if (!window.confirm(`"${purpose}" 항목을 삭제하시겠습니까?`)) return;
        const updated = visitPurposes.filter(p => p !== purpose);
        await updateDoc(doc(db, "events", eventId), { visitPurposes: updated });
        setVisitPurposes(updated);
    };

    const handleUpdateVisitedFor = async (id, value) => {
        if (!eventId) return;
        await updateDoc(doc(db, "events", eventId, "reservations", id), {
            visitedFor: value
        });
    };

    const getTimestampValue = (value) => {
        if (!value) return 0;
        const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
        const time = date.getTime();
        return Number.isNaN(time) ? 0 : time;
    };

    const formatTimestamp = (value) => {
        if (!value) return '-';
        const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR');
    };

    const getEmailStatusInfo = (reservation) => {
        if (reservation.emailStatus === 'success') return { label: '전송 완료', className: 'logSuccess' };
        if (reservation.emailStatus === 'error') return { label: '전송 실패', className: 'logError' };
        if (reservation.emailStatus === 'sending') return { label: '전송 중', className: 'logSending' };
        if (reservation.depositConfirmed) return { label: '대기', className: 'logPending' };
        return { label: '-', className: 'logIdle' };
    };

    const emailLogs = reservations
        .filter((res) => res.emailStatus || res.depositConfirmed)
        .map((res) => ({
            ...res,
            logTimestamp: res.emailSentAt || res.emailAttemptedAt || res.depositConfirmedAt || res.createdAt
        }))
        .sort((a, b) => getTimestampValue(b.logTimestamp) - getTimestampValue(a.logTimestamp));

    const filteredReservations = reservations.filter(r =>
        (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.phone && r.phone.includes(searchTerm))
    );

    return (
        <div className={classes.container}>
            <h2 className={classes.header}>
                관리자 대시보드
                <span className={classes.totalCount}>
                    (총 {reservations.length}명)
                </span>
            </h2>

            {error && (
                <div className={classes.errorBanner} style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', marginBottom: '1rem', borderRadius: '0.5rem' }}>
                    <strong>오류 발생:</strong> {error}
                    <br />
                    <small>Firebase 연결 상태나 권한을 확인해주세요.</small>
                </div>
            )}

            <div className={classes.grid}>
                <div className={classes.card}>
                    <h3>
                        예약 현황
                        <span className={classes.stats}>
                            (입금확인: {reservations.filter(r => r.depositConfirmed).length}명
                            / 제출 완료: {reservations.filter(r => !r.depositConfirmed && r.receiptUrl).length}명
                            / 미제출: {reservations.filter(r => !r.depositConfirmed && !r.receiptUrl).length}명
                            {visitPurposes.length > 0 && <> | 미선택: {reservations.filter(r => !r.visitedFor).length}명
                                {visitPurposes.map(p => (
                                    <span key={p}> / {p}: {reservations.filter(r => r.visitedFor === p).length}명</span>
                                ))}</>})
                        </span>
                        <button
                            onClick={handleToggleReservation}
                            style={{
                                marginLeft: '1rem',
                                padding: '0.3rem 0.8rem',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                backgroundColor: isReservationClosed ? '#4caf50' : '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                        >
                            {isReservationClosed ? "예약 다시 열기 (현재 마감됨)" : "예약 마감하기 (현재 오픈됨)"}
                        </button>
                    </h3>
                    <div className={classes.listActions}>
                        <button className={classes.deleteAllBtn} onClick={handleDeleteAllReservations}>
                            전체 삭제
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f5', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <Search size={18} color="#666" style={{ marginRight: '0.5rem' }} />
                        <input
                            type="text"
                            placeholder="이름이나 연락처로 검색해보세요"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', width: '100%' }}
                        />
                    </div>

                    <div className={classes.listContainer}>
                        <table className={classes.table}>
                            <thead>
                                <tr>
                                    <th>이름</th>
                                    <th>입금</th>
                                    <th>체크인</th>
                                    <th>방문 목적</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReservations.map(res => (
                                    <tr key={res.id} className={classes[res.status]}>
                                        <td>
                                            <div className={classes.reservationName}>
                                                {res.name} {res.ticketCount > 1 && <span style={{ color: '#4caf50', marginLeft: '4px', fontSize: '0.9rem' }}>({res.ticketCount}장)</span>}
                                                {res.depositConfirmed ? (
                                                    <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>예매 확정</span>
                                                ) : eventData?.payment?.isFreeEvent ? (
                                                    <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>예매 확정 (무료)</span>
                                                ) : res.receiptUrl ? (
                                                    <span style={{ backgroundColor: '#fff3e0', color: '#f57c00', fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>입금 확인 대기</span>
                                                ) : (
                                                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>가예약 (영수증 미제출)</span>
                                                )}
                                            </div>
                                            <div className={classes.reservationMeta}>
                                                <small>{res.phone}</small>
                                                <small className={classes.reservationTime}>
                                                    접수 {formatTimestamp(res.createdAt)}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleToggleDeposit(res.id)}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    fontSize: '0.8rem',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    backgroundColor: res.depositConfirmed ? '#4caf50' : '#666',
                                                    color: '#fff',
                                                    marginBottom: res.receiptUrl ? '0.4rem' : '0',
                                                    display: 'block',
                                                    width: '100%'
                                                }}
                                            >
                                                {res.depositConfirmed ? '✓ 입금완료' : '미확인'}
                                            </button>
                                            {res.receiptUrl && (
                                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                                    <a
                                                        href={res.receiptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            padding: '0.2rem 0.4rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: '#e2e8f0',
                                                            color: '#333',
                                                            textDecoration: 'none',
                                                            borderRadius: '4px',
                                                            display: 'block',
                                                            textAlign: 'center',
                                                            fontWeight: 'bold',
                                                            flex: 1
                                                        }}
                                                    >
                                                        🧾 캡처본
                                                    </a>
                                                    {!res.depositConfirmed && (
                                                        <button
                                                            onClick={() => handleAIVerify(res)}
                                                            disabled={verifyingIds[res.id]}
                                                            style={{
                                                                padding: '0.2rem 0.4rem',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: '#f6c458', // Posta Accent color
                                                                color: '#333',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: verifyingIds[res.id] ? 'not-allowed' : 'pointer',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            {verifyingIds[res.id] ? '⏳' : '🤖 AI 확인'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {res.aiVerified && (
                                                <div style={{ marginTop: '0.2rem', textAlign: 'center', fontSize: '0.7rem', color: '#f57c00', fontWeight: 'bold' }}>
                                                    ✨ AI 자동 승인
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {res.checkedIn ? (
                                                <div className={classes.checkinInfo}>
                                                    <span className={classes.checkinBadge}>완료</span>
                                                    <small>{(() => {
                                                        if (!res.checkedInAt) return '';
                                                        const date = res.checkedInAt.seconds ? new Date(res.checkedInAt.seconds * 1000) : new Date(res.checkedInAt);
                                                        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                                                    })()}</small>
                                                </div>
                                            ) : (
                                                <span className={classes.noCheckin}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                className={`${classes.visitSelect} ${!res.visitedFor ? classes.visitSelectUnselected : ''}`}
                                                value={res.visitedFor || ''}
                                                onChange={(e) => handleUpdateVisitedFor(res.id, e.target.value)}
                                            >
                                                <option value="">선택</option>
                                                {visitPurposes.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/e/${eventId}?auth=${res.token}`;
                                                        navigator.clipboard.writeText(link);
                                                        alert(`고유 링크가 복사되었습니다!\n${link}`);
                                                    }}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '0.8rem',
                                                        backgroundColor: '#f1f5f9',
                                                        color: '#475569',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title="관객용 모바일 티켓 링크 복사"
                                                >
                                                    🔗 링크
                                                </button>
                                                <button
                                                    className={classes.deleteBtn}
                                                    onClick={() => handleDeleteReservation(res.id)}
                                                    style={{ margin: 0, whiteSpace: 'nowrap' }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className={classes.card}>
                    <h3>방문 목적 관리</h3>
                    <p className={classes.sectionHint}>예약자의 방문 목적 선택 항목을 관리합니다.</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            value={newPurpose}
                            onChange={e => setNewPurpose(e.target.value)}
                            placeholder="새 방문 목적 입력"
                            style={{ flex: 1, padding: '0.5rem' }}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPurpose())}
                        />
                        <button
                            onClick={handleAddPurpose}
                            style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            추가
                        </button>
                    </div>
                    {visitPurposes.length === 0 ? (
                        <div className={classes.emptyState}>등록된 항목이 없습니다. 위에서 추가하세요.</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {visitPurposes.map(p => (
                                <div key={p} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.4rem 0.8rem', backgroundColor: '#f0f0f0',
                                    borderRadius: '20px', fontSize: '0.9rem', color: '#333'
                                }}>
                                    <span>{p}</span>
                                    <button
                                        onClick={() => handleRemovePurpose(p)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1rem', padding: 0 }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={classes.card}>
                    <h3>메일 발송 로그</h3>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {emailLogs.length === 0 ? (
                            <div className={classes.emptyState}>표시할 로그가 없습니다.</div>
                        ) : (
                            emailLogs.map((log) => {
                                const statusInfo = getEmailStatusInfo(log);
                                return (
                                    <div key={log.id} className={classes.logItem} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: '500' }}>{log.name || '이름 없음'}</span>
                                            <small style={{ color: '#888', marginLeft: '0.5rem' }}>{log.email || '-'}</small>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <small style={{ color: '#999' }}>{formatTimestamp(log.logTimestamp)}</small>
                                            <span className={`${classes.logBadge} ${classes[statusInfo.className]}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className={classes.card}>
                    <h3>공연진 관리</h3>
                    <p className={classes.sectionHint}>
                        팀원들을 초대하여 행사를 함께 관리하세요. 잘못 가입된 공연진 계정은 삭제할 수 있습니다.
                    </p>

                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#333' }}>팀원 초대 링크 발급</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.8rem', wordBreak: 'keep-all' }}>아래 링크를 복사하여 초대할 팀원(입장 확인, 명단 관리 스태프)에게 공유해주세요. 링크를 통해 가입하면 자동으로 공연진 권한이 부여됩니다.</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/e/${eventId}/performer/login`}
                                style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#555' }}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/e/${eventId}/performer/login`);
                                    alert('초대 링크가 복사되었습니다!');
                                }}
                                style={{ padding: '0 1rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                            >
                                링크 복사
                            </button>
                        </div>
                    </div>
                    {performersError && (
                        <p className={classes.errorText}>{performersError}</p>
                    )}
                    {performersLoading ? (
                        <div className={classes.emptyState}>불러오는 중...</div>
                    ) : performers.length === 0 ? (
                        <div className={classes.emptyState}>등록된 공연진이 없습니다.</div>
                    ) : (
                        <div className={classes.listContainer}>
                            <table className={classes.table}>
                                <thead>
                                    <tr>
                                        <th>이름</th>
                                        <th>이메일</th>
                                        <th>가입일</th>
                                        <th>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performers.map(performer => (
                                        <tr key={performer.id}>
                                            <td>{performer.name || '-'}</td>
                                            <td>{performer.email || '-'}</td>
                                            <td>{formatTimestamp(performer.createdAt)}</td>
                                            <td>
                                                <button
                                                    className={classes.deleteBtn}
                                                    onClick={() => handleDeletePerformer(performer)}
                                                >
                                                    삭제
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Admin;

