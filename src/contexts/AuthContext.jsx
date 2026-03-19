import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { generateNickname } from '../utils/nickname';
import {
    GoogleAuthProvider,
    auth,
    db,
    doc,
    functions,
    getDoc,
    httpsCallable,
    onAuthStateChanged,
    setDoc,
    signInAnonymously,
    signInWithPopup,
    signOut as firebaseSignOut
} from '../api/firebase';
import { isAdminEmail } from '../config/admins';
import { DEFAULT_PREMIUM } from '../utils/permissions';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const extractPremiumInfo = (userData) => {
    if (!userData) return { tier: 'free', isPremium: false };
    return {
        tier: userData.tier || 'free',
        isPremium: userData.isPremium === true || userData.tier === 'premium' || userData.tier === 'pro'
    };
};

const extractAccountPremium = (userData) => {
    if (!userData?.premium) return DEFAULT_PREMIUM;
    return { ...DEFAULT_PREMIUM, ...userData.premium };
};

const getStoredAudience = (eventId) => {
    if (!eventId) return null;
    try {
        const raw = localStorage.getItem(`posta_guest_${eventId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

// ★ AdSense 승인용: 로그인 임시 비활성화 (승인 후 이 블록 제거하고 원래 코드 복원)
const ADSENSE_BYPASS = true;
const GUEST_USER = {
    uid: 'guest',
    email: 'guest@posta.systems',
    role: 'organizer',
    name: 'Guest',
    isAdmin: true,
    tier: 'premium',
    isPremium: true,
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(GUEST_USER);
    const [loading, setLoading] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(true);
    const [accountPremium, setAccountPremium] = useState(DEFAULT_PREMIUM);
    const location = useLocation();

    const currentEventId = useMemo(() => {
        const match = matchPath('/e/:eventId/*', location.pathname);
        return match?.params?.eventId || null;
    }, [location.pathname]);

    const currentEventIdRef = useRef(currentEventId);
    useEffect(() => {
        currentEventIdRef.current = currentEventId;
    }, [currentEventId]);

    const resolveGoogleUser = useCallback(async (firebaseUser, eventId) => {
        const ticketData = getStoredAudience(eventId);

        let premiumInfo = { tier: 'free', isPremium: false };
        try {
            const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                premiumInfo = extractPremiumInfo(userData);
                setAccountPremium(extractAccountPremium(userData));
            }
        } catch (error) {
            console.warn('Failed to read premium info:', error);
        }

        let performerProfile = null;
        if (eventId) {
            try {
                const performerSnap = await getDoc(doc(db, 'events', eventId, 'performers', firebaseUser.uid));
                if (performerSnap.exists()) {
                    performerProfile = performerSnap.data();
                }
            } catch (error) {
                console.warn('Failed to read performer profile:', error);
            }
        }

        const role = performerProfile ? 'performer' : (ticketData ? 'audience' : 'organizer');
        const boardDisplayName = performerProfile?.boardDisplayName?.trim() || '';

        if (role === 'audience' && ticketData) {
            return {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isAdmin: isAdminEmail(firebaseUser.email),
                tier: premiumInfo.tier,
                isPremium: premiumInfo.isPremium,
                ...ticketData,
                role: 'audience',
                name: ticketData.name || firebaseUser.displayName || 'Audience'
            };
        }

        const baseName = boardDisplayName || performerProfile?.name || firebaseUser.displayName || 'Creator';
        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            name: baseName,
            boardDisplayName,
            performerName: performerProfile?.name || firebaseUser.displayName || '',
            isAdmin: isAdminEmail(firebaseUser.email),
            tier: premiumInfo.tier,
            isPremium: premiumInfo.isPremium
        };
    }, []);

    useEffect(() => {
        if (ADSENSE_BYPASS) return;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const eventId = currentEventIdRef.current;

            if (!firebaseUser) {
                setUser(null);
                signInAnonymously(auth)
                    .then(() => setAuthInitialized(true))
                    .catch((error) => {
                        console.error('Anonymous sign-in failed:', error);
                        setLoading(false);
                        setAuthInitialized(true);
                    });
                return;
            }

            if (firebaseUser.isAnonymous) {
                const stored = getStoredAudience(eventId);
                if (stored) setUser({ ...stored, uid: firebaseUser.uid });
                else setUser(null);
                setLoading(false);
                setAuthInitialized(true);
                return;
            }

            const nextUser = await resolveGoogleUser(firebaseUser, eventId);
            setUser((prev) => {
                if (
                    prev?.uid === nextUser.uid &&
                    prev?.role === nextUser.role &&
                    prev?.name === nextUser.name &&
                    prev?.boardDisplayName === nextUser.boardDisplayName &&
                    prev?.tier === nextUser.tier
                ) {
                    return prev;
                }
                return nextUser;
            });
            setLoading(false);
            setAuthInitialized(true);
        });

        return unsubscribe;
    }, [resolveGoogleUser]);

    useEffect(() => {
        if (ADSENSE_BYPASS) return;
        if (!authInitialized) return;
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        const reevaluate = async () => {
            if (firebaseUser.isAnonymous) {
                const stored = getStoredAudience(currentEventId);
                if (stored) setUser({ ...stored, uid: firebaseUser.uid });
                else setUser(null);
                return;
            }

            const nextUser = await resolveGoogleUser(firebaseUser, currentEventId);
            setUser((prev) => {
                if (
                    prev?.uid === nextUser.uid &&
                    prev?.role === nextUser.role &&
                    prev?.name === nextUser.name &&
                    prev?.boardDisplayName === nextUser.boardDisplayName &&
                    prev?.tier === nextUser.tier
                ) {
                    return prev;
                }
                return nextUser;
            });
        };

        reevaluate();
    }, [authInitialized, currentEventId, resolveGoogleUser]);

    const performerLogin = async () => {
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);

            await setDoc(
                doc(db, 'users', result.user.uid),
                {
                    uid: result.user.uid,
                    name: result.user.displayName || '관리자',
                    email: result.user.email,
                    role: 'organizer',
                    createdAt: new Date().toISOString()
                },
                { merge: true }
            );

            if (currentEventId) {
                const defaultName = result.user.displayName || '공연진';
                await setDoc(
                    doc(db, 'events', currentEventId, 'performers', result.user.uid),
                    {
                        uid: result.user.uid,
                        name: defaultName,
                        boardDisplayName: '',
                        email: result.user.email,
                        role: 'performer',
                        createdAt: new Date().toISOString()
                    },
                    { merge: true }
                );

                await setDoc(
                    doc(db, 'users', result.user.uid, 'myEvents', currentEventId),
                    {
                        eventId: currentEventId,
                        role: 'performer',
                        createdAt: new Date().toISOString()
                    },
                    { merge: true }
                );
            }

            return result;
        } catch (error) {
            if (error.code === 'auth/account-exists-with-different-credential') {
                throw new Error('이미 다른 로그인 방식으로 가입된 계정입니다. 같은 이메일의 로그인 방식을 확인해주세요.');
            }
            throw error;
        }
    };

    const performerLogout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    const getDeviceUid = () => {
        let deviceUid = localStorage.getItem('posta_device_uid');
        if (!deviceUid) {
            deviceUid = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem('posta_device_uid', deviceUid);
        }
        return deviceUid;
    };

    const audienceLogin = (nickname) => {
        if (!currentEventId) return;
        const finalNickname = nickname || generateNickname();
        const audienceUser = {
            uid: auth.currentUser?.uid || getDeviceUid(),
            name: finalNickname,
            role: 'audience',
            enteredAt: new Date().toISOString()
        };
        localStorage.setItem(`posta_guest_${currentEventId}`, JSON.stringify(audienceUser));
        setUser(audienceUser);
    };

    const logout = () => {
        if (user?.role === 'organizer' || user?.role === 'performer') {
            performerLogout();
            return;
        }
        if (user?.isVerified) return;
        if (currentEventId) {
            localStorage.removeItem(`posta_guest_${currentEventId}`);
        }
        setUser(null);
    };

    const updateNickname = (nickname) => {
        if (!nickname || !user || user.role !== 'audience' || !currentEventId) return;
        const updated = { ...user, name: nickname.trim() };
        localStorage.setItem(`posta_guest_${currentEventId}`, JSON.stringify(updated));
        setUser(updated);
    };

    const updateOrganizerName = useCallback((name) => {
        const trimmed = String(name || '').trim();
        if (!trimmed) return;
        setUser((prev) => {
            if (!prev || prev.name === trimmed) return prev;
            return { ...prev, name: trimmed };
        });
    }, []);

    const updatePerformerBoardName = useCallback(
        async (name) => {
            const trimmed = String(name || '').trim();
            if (!trimmed || !currentEventId || !user?.uid || user.role !== 'performer') return false;

            try {
                await setDoc(
                    doc(db, 'events', currentEventId, 'performers', user.uid),
                    {
                        boardDisplayName: trimmed,
                        updatedAt: new Date().toISOString()
                    },
                    { merge: true }
                );
                setUser((prev) => {
                    if (!prev) return prev;
                    return { ...prev, boardDisplayName: trimmed, name: trimmed };
                });
                return true;
            } catch (error) {
                console.error('Failed to update performer board name:', error);
                return false;
            }
        },
        [currentEventId, user?.role, user?.uid]
    );

    const verifyToken = async (token) => {
        if (!currentEventId || !token) return false;
        try {
            const verifyTicketFn = httpsCallable(functions, 'verifyTicket');
            const response = await verifyTicketFn({ token, eventId: currentEventId });
            const result = response.data || {};
            if (!result.success) return false;

            const verifiedUser = {
                uid: auth.currentUser?.uid || getDeviceUid(),
                name: result.name || '',
                role: 'audience',
                isVerified: true,
                reservationId: result.reservationId || null,
                token,
                checkedIn: Boolean(result.checkedIn),
                checkedInAt: result.checkedInAt || null,
                enteredAt: new Date().toISOString()
            };

            localStorage.setItem(`posta_guest_${currentEventId}`, JSON.stringify(verifiedUser));
            setUser(verifiedUser);
            return true;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    };

    const value = {
        user,
        loading,
        accountPremium,
        setAccountPremium,
        performerLogin,
        audienceLogin,
        logout,
        updateNickname,
        verifyToken,
        authInitialized,
        updateOrganizerName,
        updatePerformerBoardName
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
