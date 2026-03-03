import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    BarChart,
    Bar
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { getManagedEvents, getReservationsForEvents } from '../../utils/dashboardData';
import { buildAnalyticsData } from '../../utils/analytics';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const won = (value) => `${Number(value || 0).toLocaleString()}원`;

const glassSelectStyle = {
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    background: 'var(--select-bg)',
    border: '1px solid var(--select-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
    minWidth: 120,
};

const chartTooltipStyle = {
    backgroundColor: 'var(--tooltip-bg)',
    border: '1px solid var(--ui-border-strong)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-main)',
    boxShadow: 'var(--dropdown-shadow)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
};

const chartTooltipLabelStyle = {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-main)',
    fontWeight: 600,
};

const chartTooltipItemStyle = {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
    fontWeight: 600,
};

const chartAxisTickStyle = {
    fill: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'var(--font-main)',
};

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [monthRange, setMonthRange] = useState(12);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        setError('');
        try {
            const managedEvents = await getManagedEvents(user.uid);
            const allReservations = await getReservationsForEvents(managedEvents);
            setEvents(managedEvents);
            setReservations(allReservations);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('정산 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const analytics = useMemo(
        () => buildAnalyticsData({ events, reservations, monthRange }),
        [events, reservations, monthRange]
    );

    const topEventsChartData = useMemo(
        () => analytics.topEvents.map((item) => ({
            name: item.eventTitle,
            revenue: item.estimatedRevenue
        })),
        [analytics.topEvents]
    );

    const kpiItems = [
        { label: '총 예약', value: `${analytics.summary.totalReservations.toLocaleString()}건` },
        { label: '결제 완료', value: `${analytics.summary.paidReservationCount.toLocaleString()}건` },
        { label: '판매 티켓 수', value: `${analytics.summary.soldTickets.toLocaleString()}장` },
        { label: '예상 매출', value: won(analytics.summary.estimatedRevenue) },
        { label: '체크인 완료', value: `${analytics.summary.checkedInCount.toLocaleString()}건` },
        { label: '체크인율', value: `${analytics.summary.checkinRate.toFixed(1)}%` },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Header */}
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
                        정산 / 인사이트
                    </h2>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                        결제 완료/체크인/매출 지표를 이벤트 운영 관점에서 확인합니다.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                        style={glassSelectStyle}
                        value={monthRange}
                        onChange={(e) => setMonthRange(Number(e.target.value))}
                    >
                        <option value={3} style={{ backgroundColor: 'var(--select-option-bg)', color: 'var(--select-option-text)' }}>최근 3개월</option>
                        <option value={6} style={{ backgroundColor: 'var(--select-option-bg)', color: 'var(--select-option-text)' }}>최근 6개월</option>
                        <option value={12} style={{ backgroundColor: 'var(--select-option-bg)', color: 'var(--select-option-text)' }}>최근 12개월</option>
                    </select>
                    <GlassButton variant="secondary" size="sm" onClick={loadData}>
                        <RefreshCcw size={15} /> 새로고침
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

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.75rem',
            }}>
                {kpiItems.map(({ label, value }) => (
                    <GlassCard key={label} level={2} hover style={{ padding: '1.1rem' }}>
                        <div style={{
                            color: 'var(--text-tertiary)',
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

            {/* Monthly Revenue Chart */}
            <GlassCard level={1} style={{ padding: '1.2rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                    월별 매출 추이
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                    결제 완료된 예약만 매출에 반영합니다.
                </p>
                <div style={{ width: '100%', height: '280px', marginTop: '0.8rem' }}>
                    {loading ? (
                        <div style={{ color: 'var(--text-tertiary)', padding: '0.8rem 0', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-soft)" />
                                <XAxis dataKey="monthLabel" stroke="var(--ui-text-muted)" tick={chartAxisTickStyle} />
                                <YAxis stroke="var(--ui-text-muted)" tick={chartAxisTickStyle} />
                                <Tooltip
                                    formatter={(value) => won(value)}
                                    contentStyle={chartTooltipStyle}
                                    labelStyle={chartTooltipLabelStyle}
                                    itemStyle={chartTooltipItemStyle}
                                    cursor={{ stroke: 'rgba(240, 240, 245, 0.25)', strokeWidth: 1 }}
                                />
                                <Legend wrapperStyle={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#d04c31" strokeWidth={2} name="매출" dot={{ fill: '#d04c31', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>

            {/* Split Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem' }} className="analytics-split">
                <GlassCard level={1} style={{ padding: '1.2rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                        월별 예매(건/매수)
                    </h3>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                        결제 완료 예약 기준 건수와 매수입니다.
                    </p>
                    <div style={{ width: '100%', height: '280px', marginTop: '0.8rem' }}>
                        {loading ? (
                            <div style={{ color: 'var(--text-tertiary)', padding: '0.8rem 0', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-soft)" />
                                    <XAxis dataKey="monthLabel" stroke="var(--ui-text-muted)" tick={chartAxisTickStyle} />
                                    <YAxis stroke="var(--ui-text-muted)" tick={chartAxisTickStyle} />
                                    <Tooltip
                                        contentStyle={chartTooltipStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }}
                                    />
                                    <Legend wrapperStyle={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem' }} />
                                    <Bar dataKey="reservationCount" fill="#2563eb" name="예매 건수" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="soldTickets" fill="#16a34a" name="판매 매수" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </GlassCard>

                <GlassCard level={1} style={{ padding: '1.2rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                        이벤트별 매출 Top 5
                    </h3>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                        결제 완료 예약만 반영한 추정 매출입니다.
                    </p>
                    <div style={{ width: '100%', height: '280px', marginTop: '0.8rem' }}>
                        {loading ? (
                            <div style={{ color: 'var(--text-tertiary)', padding: '0.8rem 0', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
                        ) : topEventsChartData.length === 0 ? (
                            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '1.1rem', fontFamily: 'var(--font-main)' }}>
                                집계할 데이터가 없습니다.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topEventsChartData} layout="vertical" margin={{ left: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-soft)" />
                                    <XAxis type="number" stroke="var(--ui-text-muted)" tick={chartAxisTickStyle} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={132}
                                        tickMargin={8}
                                        stroke="var(--ui-text-muted)"
                                        tick={chartAxisTickStyle}
                                    />
                                    <Tooltip
                                        formatter={(value) => [won(value), '매출']}
                                        contentStyle={chartTooltipStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#f59e0b" name="매출" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </GlassCard>
            </div>

            <style>{`
                @media (max-width: 900px) {
                    .analytics-split { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;
