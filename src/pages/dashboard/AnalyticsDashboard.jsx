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
import classes from './DashboardFeature.module.css';

const won = (value) => `${Number(value || 0).toLocaleString()}원`;

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

    return (
        <div className={classes.page}>
            <div className={classes.headerRow}>
                <div className={classes.titleBlock}>
                    <h2>정산 / 인사이트</h2>
                    <p>결제 완료/체크인/매출 지표를 이벤트 운영 관점에서 확인합니다.</p>
                </div>
                <div className={classes.actionRow}>
                    <select
                        className={classes.select}
                        style={{ minWidth: 120 }}
                        value={monthRange}
                        onChange={(e) => setMonthRange(Number(e.target.value))}
                    >
                        <option value={3}>최근 3개월</option>
                        <option value={6}>최근 6개월</option>
                        <option value={12}>최근 12개월</option>
                    </select>
                    <button className={classes.btnSecondary} onClick={loadData}>
                        <RefreshCcw size={15} /> 새로고침
                    </button>
                </div>
            </div>

            {error && <div className={classes.error}>{error}</div>}

            <div className={classes.cardGrid}>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>총 예약</div>
                    <div className={classes.kpiValue}>{analytics.summary.totalReservations.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>결제 완료</div>
                    <div className={classes.kpiValue}>{analytics.summary.paidReservationCount.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>판매 티켓 수</div>
                    <div className={classes.kpiValue}>{analytics.summary.soldTickets.toLocaleString()}장</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>예상 매출</div>
                    <div className={classes.kpiValue}>{won(analytics.summary.estimatedRevenue)}</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>체크인 완료</div>
                    <div className={classes.kpiValue}>{analytics.summary.checkedInCount.toLocaleString()}건</div>
                </div>
                <div className={classes.kpiCard}>
                    <div className={classes.kpiLabel}>체크인율</div>
                    <div className={classes.kpiValue}>{analytics.summary.checkinRate.toFixed(1)}%</div>
                </div>
            </div>

            <div className={classes.panel}>
                <h3 className={classes.panelTitle}>월별 매출 추이</h3>
                <p className={classes.panelHint}>결제 완료된 예약만 매출에 반영합니다.</p>
                <div className={classes.chartWrap}>
                    {loading ? (
                        <div className={classes.loading}>불러오는 중...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.monthly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="monthLabel" />
                                <YAxis />
                                <Tooltip formatter={(value) => won(value)} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#d04c31"
                                    strokeWidth={2}
                                    name="매출"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className={classes.split}>
                <div className={classes.panel}>
                    <h3 className={classes.panelTitle}>월별 예매(건/매수)</h3>
                    <p className={classes.panelHint}>결제 완료 예약 기준 건수와 매수입니다.</p>
                    <div className={classes.chartWrap}>
                        {loading ? (
                            <div className={classes.loading}>불러오는 중...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="monthLabel" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="reservationCount" fill="#2563eb" name="예매 건수" />
                                    <Bar dataKey="soldTickets" fill="#16a34a" name="판매 매수" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className={classes.panel}>
                    <h3 className={classes.panelTitle}>이벤트별 매출 Top 5</h3>
                    <p className={classes.panelHint}>결제 완료 예약만 반영한 추정 매출입니다.</p>
                    <div className={classes.chartWrap}>
                        {loading ? (
                            <div className={classes.loading}>불러오는 중...</div>
                        ) : topEventsChartData.length === 0 ? (
                            <div className={classes.empty}>집계할 데이터가 없습니다.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topEventsChartData} layout="vertical" margin={{ left: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={110} />
                                    <Tooltip formatter={(value) => won(value)} />
                                    <Bar dataKey="revenue" fill="#f59e0b" name="매출" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
