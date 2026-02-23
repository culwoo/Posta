import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { generateNickname } from '../utils/nickname';
import {
    auth, db,
    onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInAnonymously,
    doc, setDoc, functions, httpsCallable
} from '../api/firebase';
import { isAdminEmail } from '../config/admins';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { name: string, role: 'performer'|'audience', uid?: string }
    const [loading, setLoading] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false);
    const location = useLocation();

    // Helper to get current Event ID from URL
    const getEventId = () => {
        const match = matchPath("/e/:eventId/*", location.pathname);
        return match?.params?.eventId || null;
    };

    const currentEventId = getEventId();

    // 1. Check for Firebase User
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                if (firebaseUser.isAnonymous) {
                    // Anonymous User (Audience)
                    if (currentEventId) {
                        const storageKey = `posta_guest_${currentEventId}`;
                        const storedAudience = localStorage.getItem(storageKey);
                        if (storedAudience) {
                            const parsed = JSON.parse(storedAudience);
                            setUser({ ...parsed, uid: firebaseUser.uid }); // Ensure UID is from auth
                        } else {
                            setUser(null);
                        }
                    } else {
                        // Not in an event page, or no guest data
                        // Maybe user is browsing dashboard as anon?
                        setUser(null);
                    }
                    setLoading(false);
                    setAuthInitialized(true);
                } else {
                    // Performer/Organizer (Email/Password)
                    let ticketData = null;
                    if (currentEventId) {
                        const storedAudience = localStorage.getItem(`posta_guest_${currentEventId}`);
                        if (storedAudience) {
                            ticketData = JSON.parse(storedAudience);
                        }
                    }

                    setUser({
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName || 'Creator',
                        email: firebaseUser.email,
                        ...ticketData, // merge ticket info (isVerified, role as audience, etc.) if exists
                        role: ticketData ? 'audience' : 'organizer', // prioritize ticket view if testing
                        isAdmin: isAdminEmail(firebaseUser.email)
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
                setUser(null);
            }
        });

        return unsubscribe;
    }, [currentEventId]); // Re-run when eventId changes to load correct guest profile

    const performerLogin = async (email, password) => {
        const res = await signInWithEmailAndPassword(auth, email, password);

        // If logging in via an event-specific URL, automatically join as performer for this event
        if (currentEventId) {
            try {
                // Determine name (from auth profile or default)
                let name = res.user.displayName || "공연진";

                await setDoc(doc(db, "events", currentEventId, "performers", res.user.uid), {
                    uid: res.user.uid,
                    name: name,
                    email: email,
                    role: 'performer',
                    createdAt: new Date().toISOString()
                }, { merge: true }); // merge to not overwrite joining date if they were already there
            } catch (err) {
                console.error("Failed to add performer to event specific list", err);
            }
        }

        return res;
    };

    const performerSignup = async (email, password, name) => {
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: name });

            // Save Profile to Global users
            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                name: name,
                email: email,
                role: 'performer',
                createdAt: new Date().toISOString()
            });

            // Save Profile to Event Specific performers
            if (currentEventId) {
                await setDoc(doc(db, "events", currentEventId, "performers", res.user.uid), {
                    uid: res.user.uid,
                    name: name,
                    email: email,
                    role: 'performer',
                    createdAt: new Date().toISOString()
                });
            }

            setUser({
                uid: res.user.uid,
                name: name,
                email: res.user.email,
                role: 'performer',
                isAdmin: isAdminEmail(res.user.email)
            });
        } catch (err) {
            // 이메일이 이미 존재하는 경우, 자동으로 로그인을 시도하여 권한(이름)만 업데이트 후 해당 공연에 조인시킴 (Seamless Join)
            if (err.code === 'auth/email-already-in-use') {
                try {
                    const loginRes = await signInWithEmailAndPassword(auth, email, password);

                    if (currentEventId) {
                        await setDoc(doc(db, "events", currentEventId, "performers", loginRes.user.uid), {
                            uid: loginRes.user.uid,
                            name: name, // 가입 창에서 새롭게 입력한 이름 적용!
                            email: email,
                            role: 'performer',
                            createdAt: new Date().toISOString()
                        }, { merge: true });
                    }

                    setUser({
                        uid: loginRes.user.uid,
                        name: name,
                        email: loginRes.user.email,
                        role: 'performer',
                        isAdmin: isAdminEmail(loginRes.user.email)
                    });
                    return; // Seamless Join 성공
                } catch (loginErr) {
                    throw new Error("이미 존재하는 계정입니다. 해당 공연에 다시 합류하시려면 기존에 쓰시던 정확한 비밀번호를 입력해주세요. (비밀번호가 기억나지 않으시면 아래의 '로그인하기'로 넘어가서 '비밀번호를 잊으셨나요'를 통해 재설정해주세요.)");
                }
            }
            throw err;
        }
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
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

    // Ticket Actions
    const verifyToken = async (token) => {
        if (!currentEventId) return false;
        try {
            // We assume verifyTicket function will check against the DB.
            // CAUTION: The existing cloud function `verifyTicket` might check the ROOT `reservations`.
            // We probably need to update the cloud function OR implement client-side verification here 
            // if we want to avoid deploying new cloud functions right now.
            // For now, let's assume we implement a client-side check if possible, or we need to update cloud fn.
            // Since User requested "Refactoring", we should probably stick to client-side logic for now if possible 
            // or mark Cloud Function as TODO.
            // Given I cannot edit Cloud Functions (usually in `functions/` dir, not visible here?), 
            // I will implement a client-side check similar to `Home.jsx` logic, strictly for verification state.
            // Wait, security risk?
            // `verifyToken` in client just updates Local State. Real security is Firestore Rules.
            // So client-side check is acceptable for UI state "isVerified".

            // Check if token exists in events/{eventId}/reservations
            // ... (Logic requires importing query/getDocs/collection/where inside AuthContext, or call API)
            // To emulate existing behavior without breaking too much:

            const verifyTicketFn = httpsCallable(functions, "verifyTicket");
            // The Cloud Function needs `eventId` if we update it.
            // If we don't update Cloud Function yet, it will look in root `reservations`.
            // But we moved reservations to `events/{eventId}/reservations`.
            // So the Cloud Function WILL FAIL.

            // Temporary Client-Side Verification for MVP:
            // We can query firestore directly here since we have `db`.

            // Import query/where/getDocs if not imported.
            // But imports are at top. I need to ensure they are available.

            // See Step 284 replacement below for full implementation.

            // For now, I will return false to force usage of updated logic.
            return false;

        } catch (err) {
            console.error("Token verification failed:", err);
            return false;
        }
    };

    // Re-implement verifyToken with client-side query for now
    // (Actual implementation in Replace Block)

    const value = {
        user,
        loading,
        performerLogin,
        performerSignup,
        audienceLogin,
        logout,
        updateNickname,
        // verifyToken needs to be defined inside component or robustly
        verifyToken: async (token) => {
            if (!currentEventId) return false;
            // Client-side verification against event reservations
            try {
                const { collection, query, where, getDocs } = await import('../api/firebase');
                const q = query(collection(db, 'events', currentEventId, 'reservations'), where('token', '==', token));
                const snap = await getDocs(q);
                if (snap.empty) return false;

                const data = snap.docs[0].data();
                if (!data.depositConfirmed) return false;

                const deviceUid = getDeviceUid();
                const verifiedUser = {
                    uid: auth.currentUser?.uid || deviceUid,
                    name: data.name || '',
                    role: 'audience',
                    isVerified: true,
                    reservationId: snap.docs[0].id,
                    token,
                    checkedIn: Boolean(data.checkedIn),
                    checkedInAt: data.checkedInAt || null,
                    enteredAt: new Date().toISOString()
                };

                const storageKey = `posta_guest_${currentEventId}`;
                localStorage.setItem(storageKey, JSON.stringify(verifiedUser));
                setUser(verifiedUser);
                return true;
            } catch (e) {
                console.error("Client verify failed", e);
                return false;
            }
        },
        resetPassword,
        authInitialized
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
