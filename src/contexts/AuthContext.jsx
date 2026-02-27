import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { generateNickname } from '../utils/nickname';
import {
    auth, db,
    onAuthStateChanged, signOut as firebaseSignOut, signInAnonymously, updateProfile,
    doc, setDoc, functions, httpsCallable, getDoc,
    GoogleAuthProvider, signInWithPopup
} from '../api/firebase';
import { isAdminEmail } from '../config/admins';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper to extract premium info from Firestore user data
const extractPremiumInfo = (userData) => {
    if (!userData) return { tier: 'free', isPremium: false };
    return {
        tier: userData.tier || 'free',
        isPremium: userData.isPremium === true || userData.tier === 'premium' || userData.tier === 'pro'
    };
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { name: string, role: 'performer'|'audience', uid?: string }
    const [loading, setLoading] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false);
    const location = useLocation();

    // Helper to get current Event ID from URL - memoized to prevent unnecessary re-renders
    const currentEventId = useMemo(() => {
        const match = matchPath("/e/:eventId/*", location.pathname);
        return match?.params?.eventId || null;
    }, [location.pathname]);

    // Keep a ref to currentEventId for use in the onAuthStateChanged callback
    const currentEventIdRef = useRef(currentEventId);
    useEffect(() => {
        currentEventIdRef.current = currentEventId;
    }, [currentEventId]);

    // 1. Check for Firebase User - subscribe ONCE, use ref for eventId
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const eventId = currentEventIdRef.current;
            if (firebaseUser) {
                if (firebaseUser.isAnonymous) {
                    // Anonymous User (Audience)
                    if (eventId) {
                        const storageKey = `posta_guest_${eventId}`;
                        const storedAudience = localStorage.getItem(storageKey);
                        if (storedAudience) {
                            const parsed = JSON.parse(storedAudience);
                            setUser(prev => {
                                // Skip update if nothing changed
                                if (prev?.uid === firebaseUser.uid && prev?.role === parsed.role && prev?.name === parsed.name) return prev;
                                return { ...parsed, uid: firebaseUser.uid };
                            });
                        } else {
                            setUser(prev => prev === null ? prev : null);
                        }
                    } else {
                        // Not in an event page, or no guest data
                        setUser(prev => prev === null ? prev : null);
                    }
                    setLoading(false);
                    setAuthInitialized(true);
                } else {
                    // Performer/Organizer (Google Auth)
                    let ticketData = null;
                    if (eventId) {
                        const storedAudience = localStorage.getItem(`posta_guest_${eventId}`);
                        if (storedAudience) {
                            ticketData = JSON.parse(storedAudience);
                        }
                    }

                    // Read premium tier from Firestore
                    let premiumInfo = { tier: 'free', isPremium: false };
                    try {
                        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                        if (userSnap.exists()) {
                            premiumInfo = extractPremiumInfo(userSnap.data());
                        }
                    } catch (err) {
                        console.warn('Failed to read premium info:', err);
                    }

                    const newUser = {
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName || 'Creator',
                        email: firebaseUser.email,
                        ...ticketData, // merge ticket info (isVerified, role as audience, etc.) if exists
                        role: ticketData ? 'audience' : 'organizer', // prioritize ticket view if testing
                        isAdmin: isAdminEmail(firebaseUser.email),
                        tier: premiumInfo.tier,
                        isPremium: premiumInfo.isPremium
                    };
                    setUser(prev => {
                        if (prev?.uid === newUser.uid && prev?.role === newUser.role && prev?.email === newUser.email && prev?.tier === newUser.tier) return prev;
                        return newUser;
                    });
                    setLoading(false);
                    setAuthInitialized(true);
                }
            } else {
                // No user. Sign in anonymously.
                signInAnonymously(auth).then(() => {
                    setAuthInitialized(true);
                }).catch((err) => {
                    console.error("Anon auth failed", err);
                    setLoading(false);
                    setAuthInitialized(true);
                });
                setUser(prev => prev === null ? prev : null);
            }
        });

        return unsubscribe;
    }, []); // Subscribe only ONCE - use ref for eventId

    // Re-evaluate user when eventId changes (e.g., navigating between events)
    useEffect(() => {
        if (!authInitialized) return;
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        const reevaluate = async () => {
            if (firebaseUser.isAnonymous) {
                if (currentEventId) {
                    const storageKey = `posta_guest_${currentEventId}`;
                    const storedAudience = localStorage.getItem(storageKey);
                    if (storedAudience) {
                        const parsed = JSON.parse(storedAudience);
                        setUser(prev => {
                            if (prev?.uid === firebaseUser.uid && prev?.role === parsed.role && prev?.name === parsed.name) return prev;
                            return { ...parsed, uid: firebaseUser.uid };
                        });
                    } else {
                        setUser(prev => prev === null ? prev : null);
                    }
                } else {
                    setUser(prev => prev === null ? prev : null);
                }
            } else {
                let ticketData = null;
                if (currentEventId) {
                    const storedAudience = localStorage.getItem(`posta_guest_${currentEventId}`);
                    if (storedAudience) {
                        ticketData = JSON.parse(storedAudience);
                    }
                }

                // Read premium tier from Firestore
                let premiumInfo = { tier: 'free', isPremium: false };
                try {
                    const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userSnap.exists()) {
                        premiumInfo = extractPremiumInfo(userSnap.data());
                    }
                } catch (err) {
                    console.warn('Failed to read premium info on re-eval:', err);
                }

                const newUser = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Creator',
                    email: firebaseUser.email,
                    ...ticketData,
                    role: ticketData ? 'audience' : 'organizer',
                    isAdmin: isAdminEmail(firebaseUser.email),
                    tier: premiumInfo.tier,
                    isPremium: premiumInfo.isPremium
                };
                setUser(prev => {
                    if (prev?.uid === newUser.uid && prev?.role === newUser.role && prev?.email === newUser.email && prev?.tier === newUser.tier) return prev;
                    return newUser;
                });
            }
        };

        reevaluate();
    }, [currentEventId, authInitialized]);

    const performerLogin = async () => {
        const provider = new GoogleAuthProvider();

        try {
            const res = await signInWithPopup(auth, provider);

            // Save Profile to Global users
            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                name: res.user.displayName || "관리자",
                email: res.user.email,
                role: 'organizer', // Global role
                createdAt: new Date().toISOString()
            }, { merge: true });

            // If logging in via an event-specific URL, automatically join as performer for this event
            if (currentEventId) {
                try {
                    let name = res.user.displayName || "공연진";

                    // event-specific performers group
                    await setDoc(doc(db, "events", currentEventId, "performers", res.user.uid), {
                        uid: res.user.uid,
                        name: name,
                        email: res.user.email,
                        role: 'performer',
                        createdAt: new Date().toISOString()
                    }, { merge: true });

                    // user-specific role mapping
                    await setDoc(doc(db, "users", res.user.uid, "myEvents", currentEventId), {
                        eventId: currentEventId,
                        role: 'performer',
                        createdAt: new Date().toISOString()
                    }, { merge: true });

                } catch (err) {
                    console.error("Failed to add performer to event specific list", err);
                }
            }

            return res;
        } catch (err) {
            if (err.code === 'auth/account-exists-with-different-credential') {
                throw new Error("이미 과거에 다른 방식(이메일 등)으로 가입된 계정이 있습니다. 구글 계정과 이메일이 동일한지 확인해주시거나 비밀번호 재설정을 통해 진행해주세요.");
            }
            throw err;
        }
    };

    const performerLogout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    // Helper: Get or Create Persistent Device UID (Global or Event Scoped? Let's keep global device ID)
    const getDeviceUid = () => {
        let deviceUid = localStorage.getItem('posta_device_uid');
        if (!deviceUid) {
            deviceUid = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('posta_device_uid', deviceUid);
        }
        return deviceUid;
    };

    // Audience Actions
    const audienceLogin = (nickname) => {
        if (!currentEventId) return;
        const finalNickname = nickname || generateNickname();
        const deviceUid = getDeviceUid();

        const audienceUser = {
            uid: auth.currentUser?.uid || deviceUid, // Use Firebase Anon UID if available
            name: finalNickname,
            role: 'audience',
            enteredAt: new Date().toISOString()
        };

        const storageKey = `posta_guest_${currentEventId}`;
        localStorage.setItem(storageKey, JSON.stringify(audienceUser));
        setUser(audienceUser);
    };

    const logout = () => {
        if (user?.role === 'organizer' || user?.role === 'performer') {
            performerLogout();
        } else {
            // Audience Logout (Clear Session for THIS event)
            if (user?.isVerified) {
                return; // Prevent accidental logout if verified?
            }
            if (currentEventId) {
                const storageKey = `posta_guest_${currentEventId}`;
                localStorage.removeItem(storageKey);
            }
            setUser(null);
        }
    };

    const updateNickname = (nickname) => {
        if (!nickname || !user || user.role !== 'audience' || !currentEventId) return;
        const updated = { ...user, name: nickname.trim() };
        const storageKey = `posta_guest_${currentEventId}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setUser(updated);
    };

    const updateOrganizerName = useCallback((name) => {
        const trimmed = String(name || '').trim();
        if (!trimmed) return;
        setUser((prev) => {
            if (!prev) return prev;
            if (prev.name === trimmed) return prev;
            return { ...prev, name: trimmed };
        });
    }, []);

    // Ticket Actions
    const verifyToken = async (token) => {
        if (!currentEventId || !token) return false;
        try {
            const verifyTicketFn = httpsCallable(functions, "verifyTicket");
            const response = await verifyTicketFn({
                token,
                eventId: currentEventId
            });
            const result = response.data || {};
            if (!result.success) return false;

            const deviceUid = getDeviceUid();
            const verifiedUser = {
                uid: auth.currentUser?.uid || deviceUid,
                name: result.name || '',
                role: 'audience',
                isVerified: true,
                reservationId: result.reservationId || null,
                token,
                checkedIn: Boolean(result.checkedIn),
                checkedInAt: result.checkedInAt || null,
                enteredAt: new Date().toISOString()
            };

            const storageKey = `posta_guest_${currentEventId}`;
            localStorage.setItem(storageKey, JSON.stringify(verifiedUser));
            setUser(verifiedUser);
            return true;

        } catch (err) {
            console.error("Token verification failed:", err);
            return false;
        }
    };

    const value = {
        user,
        loading,
        performerLogin,
        audienceLogin,
        logout,
        updateNickname,
        verifyToken,
        authInitialized,
        updateOrganizerName
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
