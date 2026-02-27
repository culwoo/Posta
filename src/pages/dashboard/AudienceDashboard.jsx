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
import classes from './DashboardFeature.module.css';

const CSV_HEADERS = [
    'eventId',
    'eventTitle',
    'reservationId',
    'name',
    'phone',
    'email',
    'ticketCount',
    'status',
    'depositConfirmed',
    'checkedIn',
    'visitedFor',
    'createdAt'
];

const formatDateTime = (value) => {
    const parsed = parseTimestamp(value);
    if (!parsed) return '-';
    return parsed.toLocaleString('ko-KR');
};

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
            setError('관객 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
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
            createdAt: item.createdAt || ''
        }));
    }, [eventTitleMap]);

    const handleExportRawCsv = () => {
        const rows = toCsvRows(filteredReservations);
        downloadCsvFile({
            filename: `posta-audience-raw-${new Date().toISOString().slice(0, 10)}.csv`,
            headers: CSV_HEADERS,
            rows
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
            rows
        });
    };

    return (
        <div className={classes.page}>
            <div className={classes.headerRow}>
                <div className={classes.titleBlock}>
                    <h2>내 관객들</h2>
                    <p>이벤트별 예약자 정보를 검색하고 CSV로 내보낼 수 있습니다.</p>
                </div>
                <div className={classes.actionRow}>
                    <button className={classes.btnSecondary} onClick={loadData}>
                        <RefreshCcw size={15} /> 새로고침
                    </button>
                    <button className={classes.btnSecondary} onClick={handleExportRawCsv}>
                        <Download size={15} /> 원본 CSV
                    </button>
                    <button className={classes.btnPrimary} onClick={handleExportDedupCsv}>
                        <Download size={15} /> 중복 제거 CSV
                    </button>
                </div>
            </div>

            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}

            <div className={classes.cardGrid}>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>총 예약 건수</div>
                    <div className={classes.kpiValue}>{summary.total.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>결제 완료</div>
                    <div className={classes.kpiValue}>{summary.paid.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>체크인 완료</div>
                    <div className={classes.kpiValue}>{summary.checked.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>수집 이메일</div>
                    <div className={classes.kpiValue}>{summary.emails.toLocaleString()}개</div>
                </div>
            </div>

            <div className={classes.panel}>
                <h3 className={classes.panelTitle}>필터</h3>
                <p className={classes.panelHint}>이벤트/상태/검색어를 조합해 필요한 관객만 빠르게 찾으세요.</p>
                <div className={classes.filters}>
                    <select
                        className={classes.select}
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                    >
                        <option value="all">전체 이벤트</option>
                        {events.map((eventItem) => (
                            <option key={eventItem.id} value={eventItem.id}>
                                {eventItem.title || '제목 없음'}
                            </option>
                        ))}
                    </select>
                    <select
                        className={classes.select}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">전체 상태</option>
                        <option value="paid">결제완료</option>
                        <option value="unpaid">미완료</option>
                        <option value="checkedin">체크인 완료</option>
                    </select>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} color="#6b7280" style={{ position: 'absolute', top: 11, left: 10 }} />
                        <input
                            className={classes.field}
                            style={{ paddingLeft: '2rem' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="이름/연락처/이메일 검색"
                        />
                    </div>
                </div>
            </div>

            <div className={classes.panel}>
                <h3 className={classes.panelTitle}>관객 목록</h3>
                <p className={classes.panelHint}>
                    현재 {filteredReservations.length.toLocaleString()}건 표시 중
                </p>
                {loading ? (
                    <div className={classes.loading}>불러오는 중...</div>
                ) : filteredReservations.length === 0 ? (
                    <div className={classes.empty}>조건에 맞는 예약이 없습니다.</div>
                ) : (
                    <div className={classes.tableWrap}>
                        <table className={classes.table}>
                            <thead>
                                <tr>
                                    <th>이벤트</th>
                                    <th>이름</th>
                                    <th>연락처</th>
                                    <th>이메일</th>
                                    <th>티켓</th>
                                    <th>결제</th>
                                    <th>체크인</th>
                                    <th>방문목적</th>
                                    <th>접수일시</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReservations.map((item) => {
                                    const paid = isReservationPaid(item);
                                    return (
                                        <tr key={`${item.eventId}-${item.reservationId}`}>
                                            <td>{item.eventTitle || eventTitleMap.get(item.eventId) || '제목 없음'}</td>
                                            <td>{item.name || '-'}</td>
                                            <td>{item.phone || '-'}</td>
                                            <td>{item.email || '-'}</td>
                                            <td>{normalizeTicketCount(item.ticketCount)}장</td>
                                            <td>
                                                {paid ? (
                                                    <span className={classes.badgePaid}>결제완료</span>
                                                ) : (
                                                    <span className={classes.badgeUnpaid}>미완료</span>
                                                )}
                                            </td>
                                            <td>
                                                {item.checkedIn ? (
                                                    <span className={classes.badgeChecked}>완료</span>
                                                ) : '-'}
                                            </td>
                                            <td>{item.visitedFor || '-'}</td>
                                            <td>{formatDateTime(item.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudienceDashboard;
