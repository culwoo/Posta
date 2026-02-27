import {
    db,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc
} from '../api/firebase';

export const parseTimestamp = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (value?.toDate) return value.toDate();
    if (typeof value?.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    return null;
};

export const toMillis = (value) => parseTimestamp(value)?.getTime() || 0;

export const normalizeNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const normalized = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(normalized) ? normalized : fallback;
};

export const normalizeTicketCount = (value) => {
    const parsed = normalizeNumber(value, 1);
    return parsed > 0 ? parsed : 1;
};

export const isReservationPaid = (reservation) =>
    reservation?.status === 'paid' || reservation?.depositConfirmed === true;

const sortEventsByDateDesc = (a, b) => {
    const dateA = toMillis(a?.date) || toMillis(a?.createdAt);
    const dateB = toMillis(b?.date) || toMillis(b?.createdAt);
    return dateB - dateA;
};

export const getManagedEvents = async (uid, options = {}) => {
    const { autoMigrate = true } = options;
    if (!uid) return [];

    const mappingSnap = await getDocs(collection(db, 'users', uid, 'myEvents'));
    const mappings = mappingSnap.docs
        .map((docSnap) => docSnap.data())
        .filter((item) => item?.eventId);

    const eventsMap = new Map();
    const roleByEventId = new Map();
    mappings.forEach((mapping) => {
        roleByEventId.set(mapping.eventId, mapping.role || 'participant');
    });

    const legacyOwnedQuery = query(collection(db, 'events'), where('ownerId', '==', uid));
    const legacyOwnedSnap = await getDocs(legacyOwnedQuery);
    legacyOwnedSnap.forEach((docSnap) => {
        eventsMap.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data(),
            userRole: 'organizer'
        });
    });

    const missingIds = [...roleByEventId.keys()].filter((eventId) => !eventsMap.has(eventId));
    if (missingIds.length > 0) {
        const docs = await Promise.all(
            missingIds.map(async (eventId) => {
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                return { eventId, eventSnap };
            })
        );

        docs.forEach(({ eventId, eventSnap }) => {
            if (!eventSnap.exists()) return;
            eventsMap.set(eventId, {
                id: eventSnap.id,
                ...eventSnap.data(),
                userRole: roleByEventId.get(eventId) || 'participant'
            });
        });
    }

    if (autoMigrate) {
        const migrationWrites = [];
        for (const [eventId, eventData] of eventsMap) {
            const hasMapping = roleByEventId.has(eventId);
            if (!hasMapping && eventData.ownerId === uid) {
                migrationWrites.push(
                    setDoc(doc(db, 'users', uid, 'myEvents', eventId), {
                        eventId,
                        role: 'organizer',
                        createdAt: new Date().toISOString()
                    })
                );
            }
        }

        if (migrationWrites.length > 0) {
            await Promise.allSettled(migrationWrites);
        }
    }

    return Array.from(eventsMap.values()).sort(sortEventsByDateDesc);
};

export const getReservationsForEvents = async (events) => {
    if (!Array.isArray(events) || events.length === 0) return [];

    const snapshots = await Promise.all(
        events.map(async (eventItem) => {
            const eventId = eventItem.id;
            const snap = await getDocs(collection(db, 'events', eventId, 'reservations'));
            return snap.docs.map((docSnap) => ({
                reservationId: docSnap.id,
                eventId,
                eventTitle: eventItem.title || '제목 없음',
                eventDate: eventItem.date || null,
                eventPayment: eventItem.payment || {},
                ...docSnap.data()
            }));
        })
    );

    return snapshots.flat();
};
