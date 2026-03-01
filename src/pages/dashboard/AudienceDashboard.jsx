import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getManagedEvents,
    getReservationsForEvents,
    isReservationPaid,
    normalizeTicketCount,
    parseTimestamp
} from '../../utils/dashboardData';
import { downloadCsvFile } from '../../utils/csv';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const CSV_HEADERS = [
    'eventId', 'eventTitle', 'reservationId', 'name', 'phone', 'email',
    'ticketCount', 'status', 'depositConfirmed', 'checkedIn', 'visitedFor', 'createdAt'
];

const formatDateTime = (value) => {
    const parsed = parseTimestamp(value);
    if (!parsed) return '-';
    return parsed.toLocaleString('ko-KR');
};

const glassSelectStyle = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: 'var(--ui-surface-soft)',
    border: '1px solid var(--ui-border-soft)',
    borderTop: '1px solid var(--ui-border-strong)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
    boxSizing: 'border-box',
};

const glassInputStyle = {
    ...glassSelectStyle,
    cursor: 'text',
};

const badgeStyle = (bg, color, borderColor) => ({
    display: 'inline-block',
    padding: '0.2rem 0.55rem',
    borderRadius: '999px',
    background: bg,
    color,
    fontSize: '0.72rem',
    fontWeight: 700,
    border: `1px solid ${borderColor}`,
    fontFamily: 'var(--font-main)',
});

const AudienceDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const eventTitleMap = useMemo(
        () => new Map(events.map((eventItem) => [eventItem.id, eventItem.title || '제목 없음'])),
        [events]
    );

    const loadData = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        setError('');
        try {
            const managedEvents = await getManagedEvents(user.uid);
            const allReservations = await getReservationsForEvents(managedEvents);
            const sortedReservations = [...allReservations].sort((a, b) => {
                const aTime = parseTimestamp(a.createdAt)?.getTime() || 0;
                const bTime = parseTimestamp(b.createdAt)?.getTime() || 0;
                return bTime - aTime;
            });
            setEvents(managedEvents);
            setReservations(sortedReservations);
        } catch (err) {
            console.error('Failed to load audience dashboard:', err);
            setError('관객 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const summary = useMemo(() => {
        const total = reservations.length;
        const paid = reservations.filter((item) => isReservationPaid(item)).length;
        const checked = reservations.filter((item) => item.checkedIn).length;
        const emails = reservations.filter((item) => String(item.email || '').trim()).length;
        return { total, paid, checked, emails };
    }, [reservations]);

    const filteredReservations = useMemo(() => {
        return reservations.filter((item) => {
            if (eventFilter !== 'all' && item.eventId !== eventFilter) return false;
            const paid = isReservationPaid(item);
            if (statusFilter === 'paid' && !paid) return false;
            if (statusFilter === 'unpaid' && paid) return false;
            if (statusFilter === 'checkedin' && !item.checkedIn) return false;

            const query = search.trim().toLowerCase();
            if (!query) return true;

            return [item.name, item.phone, item.email]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [reservations, eventFilter, statusFilter, search]);

    const toCsvRows = useCallback((items) => {
        return items.map((item) => ({
            eventId: item.eventId || '',
            eventTitle: item.eventTitle || eventTitleMap.get(item.eventId) || '제목 없음',
            reservationId: item.reservationId || '',
            name: item.name || '',
            phone: item.phone || '',
            email: item.email || '',
            ticketCount: normalizeTicketCount(item.ticketCount),
            status: item.status || '',
            depositConfirmed: item.depositConfirmed ? 'true' : 'false',
            checkedIn: item.checkedIn ? 'true' : 'false',
            visitedFor: item.visitedFor || '',
            createdAt: item.createdAt || '',
        }));
    }, [eventTitleMap]);

    const handleExportRawCsv = () => {
        const rows = toCsvRows(filteredReservations);
        downloadCsvFile({
            filename: `posta-audience-raw-${new Date().toISOString().slice(0, 10)}.csv`,
            headers: CSV_HEADERS,
            rows,
        });
    };

    const handleExportDedupCsv = () => {
        const dedupMap = new Map();

        filteredReservations.forEach((item) => {
            const emailKey = String(item.email || '').trim().toLowerCase();
            const phoneKey = String(item.phone || '').replace(/\D/g, '');
            const key = emailKey || phoneKey || `reservation:${item.reservationId}`;

            if (!dedupMap.has(key)) {
                dedupMap.set(key, item);
                return;
            }

            const prev = dedupMap.get(key);
            const prevTime = parseTimestamp(prev.createdAt)?.getTime() || 0;
            const currentTime = parseTimestamp(item.createdAt)?.getTime() || 0;
            if (currentTime > prevTime) dedupMap.set(key, item);
        });

        const rows = toCsvRows(Array.from(dedupMap.values()));
        downloadCsvFile({
            filename: `posta-audience-dedup-${new Date().toISOString().slice(0, 10)}.csv`,
            headers: CSV_HEADERS,
            rows,
        });
    };

    const kpiItems = [
        { label: '총 예약 건수', value: `${summary.total.toLocaleString()}건` },
        { label: '결제 완료', value: `${summary.paid.toLocaleString()}건` },
        { label: '체크인 완료', value: `${summary.checked.toLocaleString()}건` },
        { label: '수집 이메일', value: `${summary.emails.toLocaleString()}개` },
    ];

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
                    }}>
                        관객 관리
                    </h2>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--ui-text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                        이벤트 예약자 데이터를 검색하고 CSV로 내보낼 수 있습니다.
                    </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <GlassButton variant="secondary" size="sm" onClick={loadData}>
                        <RefreshCcw size={15} /> 새로고침
                    </GlassButton>
                    <GlassButton variant="secondary" size="sm" onClick={handleExportRawCsv}>
                        <Download size={15} /> 원본 CSV
                    </GlassButton>
                    <GlassButton variant="primary" size="sm" onClick={handleExportDedupCsv}>
                        <Download size={15} /> 중복 제거 CSV
                    </GlassButton>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(255, 71, 87, 0.08)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(255, 71, 87, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.75rem',
            }}>
                {kpiItems.map(({ label, value }) => (
                    <GlassCard key={label} level={2} hover style={{ padding: '1.1rem' }}>
                        <div style={{
                            color: 'var(--ui-text-muted)',
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: 'var(--font-main)',
                            fontWeight: 500,
                        }}>
                            {label}
                        </div>
                        <div style={{
                            marginTop: '0.3rem',
                            color: 'var(--text-primary)',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-main)',
                            letterSpacing: '-0.02em',
                        }}>
                            {value}
                        </div>
                    </GlassCard>
                ))}
            </div>

            <GlassCard level={1} style={{ padding: '1.2rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                    필터
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--ui-text-muted)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                    이벤트, 상태, 검색어를 조합해 필요한 관객만 빠르게 찾을 수 있습니다.
                </p>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }} className="audience-filters">
                    <select style={glassSelectStyle} value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                        <option value="all">전체 이벤트</option>
                        {events.map((eventItem) => (
                            <option key={eventItem.id} value={eventItem.id}>
                                {eventItem.title || '제목 없음'}
                            </option>
                        ))}
                    </select>
                    <select style={glassSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">전체 상태</option>
                        <option value="paid">결제완료</option>
                        <option value="unpaid">미완료</option>
                        <option value="checkedin">체크인완료</option>
                    </select>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', top: 11, left: 10, color: 'var(--ui-text-muted)' }} />
                        <input
                            style={{ ...glassInputStyle, paddingLeft: '2rem' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="이름/연락처/이메일 검색"
                        />
                    </div>
                </div>
            </GlassCard>

            <GlassCard level={1} style={{ padding: '1.2rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                    관객 목록
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--ui-text-muted)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                    현재 {filteredReservations.length.toLocaleString()}건 표시 중
                </p>

                {loading ? (
                    <div style={{ color: 'var(--ui-text-muted)', padding: '0.8rem 0', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
                ) : filteredReservations.length === 0 ? (
                    <div style={{ color: 'var(--ui-text-muted)', textAlign: 'center', padding: '1.5rem', fontFamily: 'var(--font-main)' }}>
                        조건에 맞는 예약자가 없습니다.
                    </div>
                ) : (
                    <div style={{
                        width: '100%',
                        overflowX: 'auto',
                        marginTop: '0.7rem',
                        border: '1px solid var(--ui-border-soft)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--ui-surface-soft)',
                    }}>
                        <table style={{
                            width: '100%',
                            minWidth: '920px',
                            borderCollapse: 'collapse',
                            fontSize: '0.85rem',
                            fontFamily: 'var(--font-main)',
                        }}>
                            <thead>
                                <tr>
                                    {['이벤트', '이름', '연락처', '이메일', '예매', '결제', '체크인', '방문목적', '접수일시'].map((header) => (
                                        <th key={header} style={{
                                            borderBottom: '1px solid var(--ui-border-soft)',
                                            padding: '0.65rem',
                                            textAlign: 'left',
                                            background: 'var(--ui-surface-hover)',
                                            color: 'var(--ui-text-muted)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.05em',
                                        }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReservations.map((item) => {
                                    const paid = isReservationPaid(item);
                                    const rowCells = [
                                        item.eventTitle || eventTitleMap.get(item.eventId) || '제목 없음',
                                        item.name || '-',
                                        item.phone || '-',
                                        item.email || '-',
                                        `${normalizeTicketCount(item.ticketCount)}매`,
                                    ];

                                    return (
                                        <tr key={`${item.eventId}-${item.reservationId}`} style={{ transition: 'background 0.15s ease' }}>
                                            {rowCells.map((cell, idx) => (
                                                <td key={idx} style={{ borderBottom: '1px solid var(--ui-border-soft)', padding: '0.65rem', color: 'var(--text-primary)' }}>
                                                    {cell}
                                                </td>
                                            ))}
                                            <td style={{ borderBottom: '1px solid var(--ui-border-soft)', padding: '0.65rem' }}>
                                                {paid ? (
                                                    <span style={badgeStyle('rgba(0,212,170,0.15)', '#00d4aa', 'rgba(0,212,170,0.2)')}>결제완료</span>
                                                ) : (
                                                    <span style={badgeStyle('rgba(255,71,87,0.12)', '#ff6b6b', 'rgba(255,71,87,0.2)')}>미완료</span>
                                                )}
                                            </td>
                                            <td style={{ borderBottom: '1px solid var(--ui-border-soft)', padding: '0.65rem', color: 'var(--text-primary)' }}>
                                                {item.checkedIn ? (
                                                    <span style={badgeStyle('rgba(84,160,255,0.12)', '#54a0ff', 'rgba(84,160,255,0.2)')}>완료</span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ borderBottom: '1px solid var(--ui-border-soft)', padding: '0.65rem', color: 'var(--text-primary)' }}>
                                                {item.visitedFor || '-'}
                                            </td>
                                            <td style={{ borderBottom: '1px solid var(--ui-border-soft)', padding: '0.65rem', color: 'var(--text-primary)' }}>
                                                {formatDateTime(item.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>

            <style>{`
                @media (max-width: 900px) {
                    .audience-filters { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default AudienceDashboard;
