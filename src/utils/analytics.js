import {
    isReservationPaid,
    normalizeNumber,
    normalizeTicketCount,
    parseTimestamp
} from './dashboardData';

const monthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const monthLabel = (key) => {
    const [year, month] = key.split('-');
    return `${year}.${month}`;
};

const getRecentMonthKeys = (monthCount = 12) => {
    const result = [];
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);

    for (let i = monthCount - 1; i >= 0; i -= 1) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
        result.push(monthKey(date));
    }

    return result;
};

const pickRevenuePrice = (reservation, eventMap) => {
    const eventPayment = eventMap.get(reservation.eventId)?.payment || reservation.eventPayment || {};
    if (eventPayment?.isFreeEvent === true) return 0;
    return normalizeNumber(eventPayment?.ticketPrice, 0);
};

const buildTopEvents = (events, reservations) => {
    const eventMap = new Map(events.map((eventItem) => [eventItem.id, eventItem]));
    const aggregate = new Map();

    reservations.forEach((reservation) => {
        const eventId = reservation.eventId;
        const eventItem = eventMap.get(eventId);
        if (!eventItem) return;

        const tickets = normalizeTicketCount(reservation.ticketCount);
        const paid = isReservationPaid(reservation);
        const revenue = paid ? tickets * pickRevenuePrice(reservation, eventMap) : 0;

        if (!aggregate.has(eventId)) {
            aggregate.set(eventId, {
                eventId,
                eventTitle: eventItem.title || '제목 없음',
                soldTickets: 0,
                paidReservations: 0,
                estimatedRevenue: 0
            });
        }

        const row = aggregate.get(eventId);
        if (paid) {
            row.soldTickets += tickets;
            row.paidReservations += 1;
            row.estimatedRevenue += revenue;
        }
    });

    return Array.from(aggregate.values())
        .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
        .slice(0, 5);
};

export const buildAnalyticsData = ({ events, reservations, monthRange = 12 }) => {
    const eventMap = new Map((events || []).map((eventItem) => [eventItem.id, eventItem]));

    const totalReservations = reservations.length;
    let paidReservationCount = 0;
    let soldTickets = 0;
    let estimatedRevenue = 0;
    let checkedInCount = 0;
    let collectedEmails = 0;

    const recentMonthKeys = getRecentMonthKeys(monthRange);
    const monthlyMap = new Map(
        recentMonthKeys.map((key) => [
            key,
            { month: key, revenue: 0, reservationCount: 0, soldTickets: 0 }
        ])
    );

    reservations.forEach((reservation) => {
        const tickets = normalizeTicketCount(reservation.ticketCount);
        const paid = isReservationPaid(reservation);
        const revenuePerTicket = pickRevenuePrice(reservation, eventMap);
        const revenue = paid ? tickets * revenuePerTicket : 0;

        if (reservation.checkedIn) checkedInCount += 1;
        if (reservation.email && String(reservation.email).trim()) collectedEmails += 1;
        if (paid) {
            paidReservationCount += 1;
            soldTickets += tickets;
            estimatedRevenue += revenue;
        }

        if (!paid) return;

        const eventDate = parseTimestamp(
            reservation.depositConfirmedAt ||
            reservation.createdAt
        );
        if (!eventDate) return;
        const key = monthKey(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
        if (!monthlyMap.has(key)) return;

        const row = monthlyMap.get(key);
        row.revenue += revenue;
        row.reservationCount += 1;
        row.soldTickets += tickets;
    });

    const checkinRate = paidReservationCount === 0
        ? 0
        : (checkedInCount / paidReservationCount) * 100;

    return {
        summary: {
            totalReservations,
            paidReservationCount,
            soldTickets,
            estimatedRevenue,
            checkedInCount,
            collectedEmails,
            checkinRate
        },
        monthly: Array.from(monthlyMap.values()).map((row) => ({
            ...row,
            monthLabel: monthLabel(row.month)
        })),
        topEvents: buildTopEvents(events || [], reservations)
    };
};
