import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
    collection,
    db,
    functions,
    httpsCallable,
    onSnapshot,
    orderBy,
    query
} from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLATFORM_ADMIN_EMAIL } from '../../config/admins';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const formatWon = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;

const formatDate = (value) => {
    if (!value) return '-';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const statusInfo = {
    pending: { label: '승인 대기', color: '#f59e0b', icon: Clock3 },
    completed: { label: '승인 완료', color: '#10b981', icon: CheckCircle2 },
};

const PlatformAdminDashboard = () => {
    const { user } = useAuth();
    const [requests, setRequests] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [approvingId, setApprovingId] = React.useState('');

    const isPlatformAdmin = user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL;

    React.useEffect(() => {
        if (!isPlatformAdmin) {
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        setError('');
        const paymentsQuery = query(collection(db, 'payments'), orderBy('requestedAt', 'desc'));
        const unsubscribe = onSnapshot(
            paymentsQuery,
            (snapshot) => {
                const items = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .filter((item) => item.provider === 'bank_transfer');
                setRequests(items);
                setLoading(false);
            },
            (err) => {
                console.error('Failed to load bank transfer requests:', err);
                setError('입금 요청 목록을 불러오지 못했습니다. 권한 또는 Firestore 규칙을 확인해주세요.');
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [isPlatformAdmin]);

    const handleApprove = async (request) => {
        if (!request?.eventId || approvingId) return;
        const confirmed = window.confirm(
            `"${request.eventTitle || request.eventId}" Plus Pass를 승인할까요?\n\n승인 후에는 관리자 화면에서 승인 전 상태로 되돌릴 수 없습니다. 실제 입금을 확인한 경우에만 승인하세요.`
        );
        if (!confirmed) return;

        setApprovingId(request.id);
        try {
            const approve = httpsCallable(functions, 'approvePlusBankTransfer');
            await approve({ eventId: request.eventId });
            window.alert('Plus Pass가 승인되었습니다.');
        } catch (err) {
            console.error('Failed to approve bank transfer:', err);
            window.alert('승인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setApprovingId('');
        }
    };

    const pendingCount = requests.filter((item) => item.status === 'pending').length;
    const completedCount = requests.filter((item) => item.status === 'completed').length;

    if (!isPlatformAdmin) {
        return (
            <GlassCard level={2} style={{ padding: '2rem', textAlign: 'center' }}>
                <ShieldCheck size={28} style={{ color: 'var(--text-tertiary)', marginBottom: '0.75rem' }} />
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>관리자 전용 페이지</h2>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    이 페이지는 {PLATFORM_ADMIN_EMAIL} 계정으로만 접근할 수 있습니다.
                </p>
            </GlassCard>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        fontFamily: 'var(--font-main)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <ShieldCheck size={22} /> 관리자
                    </h2>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                        Plus Pass 무통장 입금 요청을 확인하고 수동 승인합니다.
                    </p>
                </div>
                <GlassButton variant="secondary" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCcw size={15} /> 새로고침
                </GlassButton>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <GlassCard level={2} style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'var(--font-main)' }}>승인 대기</div>
                    <strong style={{ display: 'block', marginTop: '0.25rem', fontSize: '1.5rem', color: '#f59e0b' }}>{pendingCount}</strong>
                </GlassCard>
                <GlassCard level={2} style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'var(--font-main)' }}>승인 완료</div>
                    <strong style={{ display: 'block', marginTop: '0.25rem', fontSize: '1.5rem', color: '#10b981' }}>{completedCount}</strong>
                </GlassCard>
            </div>

            <GlassCard level={1} style={{
                padding: '1rem',
                border: '1px solid rgba(245,158,11,0.22)',
                background: 'rgba(245,158,11,0.05)',
            }}>
                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.6, fontFamily: 'var(--font-main)' }}>
                        승인 버튼은 실제 입금을 확인한 뒤에만 누르세요. 승인 후 이벤트는 즉시 Plus 상태가 되며, 이 관리자 화면에서는 승인 전 상태로 되돌릴 수 없습니다.
                    </div>
                </div>
            </GlassCard>

            <GlassCard level={1} style={{ padding: '0.8rem' }}>
                {error && (
                    <div style={{ color: '#ff6b6b', padding: '0.8rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ color: 'var(--text-tertiary)', padding: '1.2rem', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
                ) : requests.length === 0 ? (
                    <div style={{ color: 'var(--text-tertiary)', padding: '1.2rem', fontFamily: 'var(--font-main)' }}>입금 요청이 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {requests.map((request) => {
                            const info = statusInfo[request.status] || statusInfo.pending;
                            const StatusIcon = info.icon;
                            const isCompleted = request.status === 'completed';
                            const isApproving = approvingId === request.id;

                            return (
                                <div
                                    key={request.id}
                                    style={{
                                        border: '1px solid var(--ui-border-soft)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem',
                                        background: 'var(--ui-surface-soft)',
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(190px, 0.8fr) auto',
                                        gap: '1rem',
                                        alignItems: 'center',
                                    }}
                                    className="platform-admin-payment-row"
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontFamily: 'var(--font-main)' }}>
                                                {request.eventTitle || '(제목 없음)'}
                                            </strong>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                color: info.color,
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                            }}>
                                                <StatusIcon size={13} /> {info.label}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: '0.35rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                                            eventId: {request.eventId}
                                        </div>
                                        <div style={{ marginTop: '0.25rem', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                                            신청자: {request.requesterEmail || request.userId || '-'}
                                        </div>
                                    </div>

                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.65 }}>
                                        <div>입금자명: <strong>{request.depositorName || '-'}</strong></div>
                                        <div>금액: <strong>{formatWon(request.amount)}</strong></div>
                                        <div>신청일: {formatDate(request.requestedAt)}</div>
                                        {request.completedAt && <div>승인일: {formatDate(request.completedAt)}</div>}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <Link to={`/dashboard/event/${request.eventId}`} style={{ textDecoration: 'none' }}>
                                            <GlassButton variant="secondary" size="sm">
                                                <ExternalLink size={14} /> 이벤트
                                            </GlassButton>
                                        </Link>
                                        <GlassButton
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleApprove(request)}
                                            disabled={isCompleted || isApproving}
                                            style={isCompleted ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                                        >
                                            {isCompleted ? '승인 완료' : isApproving ? '승인 중...' : '승인'}
                                        </GlassButton>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>

            <style>{`
                @media (max-width: 900px) {
                    .platform-admin-payment-row {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PlatformAdminDashboard;
