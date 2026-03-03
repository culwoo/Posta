import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, doc, onSnapshot, collection, query, where, getDocs, limit } from '../api/firebase';
import { DEFAULT_BILLING } from '../utils/permissions';

const EventContext = createContext();
const PRETENDARD_STACK = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const { eventId } = useParams();
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!eventId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let unsubscribe = () => { };

        const setupSubscription = async () => {
            try {
                // 1. Try to find by slug
                const q = query(
                    collection(db, 'events'),
                    where('slug', '==', eventId),
                    limit(1)
                );

                const slugSnapshot = await getDocs(q);
                let targetDocId = eventId;
                let foundBySlug = false;

                if (!slugSnapshot.empty) {
                    // Found by slug!
                    targetDocId = slugSnapshot.docs[0].id;
                    foundBySlug = true;
                }

                // 2. Subscribe to the document
                unsubscribe = onSnapshot(doc(db, 'events', targetDocId), (docSnap) => {
                    if (docSnap.exists()) {
                        setEventData({ id: docSnap.id, ...docSnap.data() });
                        setError(null);
                    } else if (foundBySlug) {
                        // Found by slug initially but doc disappeared?
                        setEventData(null);
                        setError('Event not found');
                    } else {
                        // Not found by slug, and not found by ID
                        setEventData(null);
                        setError('Event not found');
                    }
                    setLoading(false);
                }, (err) => {
                    console.error("Event subscription error:", err);
                    setError('Failed to fetch event data');
                    setLoading(false);
                });

            } catch (err) {
                console.error("Setup subscription error:", err);
                setLoading(false);
                setError("Initialization failed");
            }
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [eventId]);

    // Theme injection: update CSS variables based on event theme synchronously before paint
    useLayoutEffect(() => {
        const setCSSVariables = (themeData) => {
            if (!themeData) return;
            const root = document.documentElement;
            if (themeData.primary) root.style.setProperty('--primary-color', themeData.primary);
            if (themeData.secondary) root.style.setProperty('--secondary-color', themeData.secondary);
            if (themeData.bgPrimary) root.style.setProperty('--bg-primary', themeData.bgPrimary);
            if (themeData.bgSecondary) root.style.setProperty('--bg-secondary', themeData.bgSecondary);
            if (themeData.textPrimary) {
                root.style.setProperty('--text-primary', themeData.textPrimary);
                root.style.setProperty('--text-secondary', themeData.textPrimary); // 텍스트 컬러 통일로 가시성 확보
                root.style.setProperty('--text-light', themeData.textPrimary); // Fallback
            }
            if (themeData.accent) root.style.setProperty('--accent-color', themeData.accent);
            root.style.setProperty('--font-main', themeData.fontMain || PRETENDARD_STACK);
            root.style.setProperty('--font-note', themeData.fontNote || themeData.fontMain || PRETENDARD_STACK);
        };

        // 1. Storage-based instant preview (for FOUC prevention in editor)
        try {
            const previewTheme = sessionStorage.getItem(`preview_theme_${eventId}`);
            if (previewTheme) setCSSVariables(JSON.parse(previewTheme));
        } catch (e) { }

        // 2. Firestore-based applied theme
        if (eventData?.theme) {
            setCSSVariables(eventData.theme);
        }

        // 3. Live preview message listener from editor
        const handleMessage = (e) => {
            if (e.data?.type === 'previewThemeUpdate' && e.data?.theme) {
                setCSSVariables(e.data.theme);
            }
            if (e.data?.type === 'previewPosterUpdate' && e.data?.posterUrl) {
                setEventData(prev => prev ? { ...prev, posterUrl: e.data.posterUrl } : prev);
            }
        };
        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    }, [eventData, eventId]);

    // Extract billing with defaults
    const billing = eventData?.billing
        ? { ...DEFAULT_BILLING, ...eventData.billing }
        : DEFAULT_BILLING;

    const value = {
        eventId,
        eventData,
        billing,
        loading,
        error
    };

    return (
        <EventContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
                    backgroundColor: 'var(--bg-primary, #111)' // Use fallback if needed
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)',
                        borderTop: '3px solid var(--primary-color, #d04c31)', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : children}
        </EventContext.Provider>
    );
};
