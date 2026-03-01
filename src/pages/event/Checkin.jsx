import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, db, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from '../../api/firebase';
import { useEvent } from '../../contexts/EventContext';
import classes from './Checkin.module.css';

const SCAN_COOLDOWN_MS = 3000;

const parseToken = (rawText) => {
    if (!rawText) return '';
    try {
        const url = new URL(rawText);
        return url.searchParams.get('auth') || rawText.trim();
    } catch {
        return rawText.trim();
    }
};

const Checkin = () => {
    const { eventId } = useEvent();
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const streamRef = useRef(null);
    const lastScannedRef = useRef({ token: '', timestamp: 0 });

    const [scanStatus, setScanStatus] = useState(null);
    const [totals, setTotals] = useState({ paid: 0, checkedIn: 0 });
    const [isMobile, setIsMobile] = useState(false);
    const [requiresGesture, setRequiresGesture] = useState(false);
    const [scanEnabled, setScanEnabled] = useState(true);
    const [isMirrored, setIsMirrored] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraFailed, setCameraFailed] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    const [fallbackMode, setFallbackMode] = useState(false);
    const [fallbackSearch, setFallbackSearch] = useState('');
    const [fallbackReservations, setFallbackReservations] = useState([]);
    const [fallbackResults, setFallbackResults] = useState([]);
    const [fallbackLoading, setFallbackLoading] = useState(false);
    const [fallbackSearching, setFallbackSearching] = useState(false);
    const [fallbackProcessing, setFallbackProcessing] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const update = () => setIsMobile(window.innerWidth <= 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        setIsMirrored(!isMobile);
    }, [isMobile]);

    useEffect(() => {
        if (!eventId) return;
        const reservationsQuery = query(collection(db, 'events', eventId, 'reservations'));
        const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
            let paidCount = 0;
            let checkedInCount = 0;
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const eligible = data.status === 'paid' || data.depositConfirmed === true;
                if (!eligible) return;
                const ticketCount = Number(data.ticketCount || 1);
                paidCount += ticketCount;
                if (data.checkedIn) checkedInCount += ticketCount;
            });
            setTotals({ paid: paidCount, checkedIn: checkedInCount });
        });
        return unsubscribe;
    }, [eventId]);

    useEffect(() => {
        const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent || '');
        setRequiresGesture(isSamsungBrowser);
        setScanEnabled(!isSamsungBrowser);
    }, []);

    const checkTorchSupport = useCallback((stream) => {
        try {
            const track = stream.getVideoTracks()?.[0];
            const capabilities = track?.getCapabilities?.();
            setTorchSupported(Boolean(capabilities?.torch));
        } catch {
            setTorchSupported(false);
        }
    }, []);

    const toggleTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()?.[0];
        if (!track) return;
        try {
            const nextValue = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: nextValue }] });
            setTorchOn(nextValue);
        } catch (error) {
            console.warn('Torch toggle failed:', error);
        }
    }, [torchOn]);

    const handleToken = useCallback(
        async (rawText) => {
            if (isProcessing || !eventId) return;
            const token = parseToken(rawText);
            if (!token) return;

            setIsProcessing(true);
            setScanStatus({ type: 'loading', message: '입장 상태를 확인하는 중...' });

            try {
                const tokenQuery = query(collection(db, 'events', eventId, 'reservations'), where('token', '==', token));
                const snapshot = await getDocs(tokenQuery);

                if (snapshot.empty) {
                    setScanStatus({ type: 'error', message: '유효하지 않은 티켓입니다.' });
                    return;
                }

                const targetDoc = snapshot.docs[0];
                const data = targetDoc.data();

                if (data.status !== 'paid' && !data.depositConfirmed) {
                    setScanStatus({ type: 'error', message: '입금 확인 전 티켓입니다.' });
                    return;
                }

                if (data.checkedIn) {
                    const checkedTime = data.checkedInAt
                        ? (() => {
                            const date = data.checkedInAt.seconds
                                ? new Date(data.checkedInAt.seconds * 1000)
                                : new Date(data.checkedInAt);
                            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                        })()
                        : '';
                    setScanStatus({
                        type: 'info',
                        message: `${data.name}님은 이미 입장 완료되었습니다.${checkedTime ? ` (${checkedTime})` : ''}`
                    });
                    return;
                }

                await updateDoc(doc(db, 'events', eventId, 'reservations', targetDoc.id), {
                    checkedIn: true,
                    checkedInAt: new Date().toISOString()
                });

                const ticketCount = Number(data.ticketCount || 1);
                setScanStatus({
                    type: 'success',
                    message: `✅ ${data.name}님 입장 완료!${ticketCount > 1 ? ` (${ticketCount}장)` : ''}`
                });
            } catch (error) {
                console.error('Check-in by token failed:', error);
                setScanStatus({ type: 'error', message: '입장 처리 중 오류가 발생했습니다.' });
            } finally {
                setTimeout(() => setIsProcessing(false), SCAN_COOLDOWN_MS);
            }
        },
        [eventId, isProcessing]
    );

    useEffect(() => {
        if (!scanEnabled || fallbackMode || !videoRef.current) return undefined;

        let cancelled = false;
        const startScan = async () => {
            let BrowserMultiFormatReader;
            try {
                ({ BrowserMultiFormatReader } = await import('@zxing/browser'));
            } catch {
                if (!cancelled) {
                    setScanStatus({ type: 'error', message: '브라우저에서 QR 스캔을 지원하지 않습니다.' });
                    setCameraFailed(true);
                }
                return;
            }

            if (cancelled) return;

            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            const onResult = (result) => {
                if (!result) return;
                const text = result.getText();
                const now = Date.now();
                if (lastScannedRef.current.token === text && now - lastScannedRef.current.timestamp < SCAN_COOLDOWN_MS) {
                    return;
                }
                lastScannedRef.current = { token: text, timestamp: now };
                handleToken(text);
            };

            const constraints = {
                video: {
                    facingMode: { ideal: isMobile ? 'environment' : 'user' }
                }
            };

            try {
                await reader.decodeFromConstraints(constraints, videoRef.current, onResult);
                const stream = videoRef.current?.srcObject;
                if (stream) {
                    streamRef.current = stream;
                    checkTorchSupport(stream);
                }
            } catch {
                try {
                    await reader.decodeFromVideoDevice(null, videoRef.current, onResult);
                    const stream = videoRef.current?.srcObject;
                    if (stream) {
                        streamRef.current = stream;
                        checkTorchSupport(stream);
                    }
                } catch {
                    if (!cancelled) {
                        setScanStatus({ type: 'error', message: '카메라에 접근할 수 없습니다. 수동 체크인을 사용해주세요.' });
                        setCameraFailed(true);
                    }
                }
            }
        };

        startScan();

        return () => {
            cancelled = true;
            if (readerRef.current) {
                if (typeof readerRef.current.reset === 'function') readerRef.current.reset();
                else if (typeof readerRef.current.stopContinuousDecode === 'function') readerRef.current.stopContinuousDecode();
            }
            if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()?.[0];
                if (track) {
                    try {
                        track.applyConstraints({ advanced: [{ torch: false }] });
                    } catch {
                        // noop
                    }
                }
            }
        };
    }, [checkTorchSupport, fallbackMode, handleToken, isMobile, scanEnabled]);

    useEffect(() => {
        if (!fallbackMode || !eventId || fallbackReservations.length > 0) return;

        let cancelled = false;
        const loadFallbackReservations = async () => {
            setFallbackLoading(true);
            try {
                const reservationsQuery = query(collection(db, 'events', eventId, 'reservations'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(reservationsQuery);
                if (cancelled) return;
                const list = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const eligible = data.status === 'paid' || data.depositConfirmed === true;
                    if (!eligible) return;
                    list.push({ id: docSnap.id, ...data });
                });
                setFallbackReservations(list);
                setFallbackResults(list);
            } catch (error) {
                console.error('Fallback preload error:', error);
                setScanStatus({ type: 'error', message: '예약 목록을 불러오지 못했습니다.' });
            } finally {
                if (!cancelled) setFallbackLoading(false);
            }
        };

        loadFallbackReservations();
        return () => {
            cancelled = true;
        };
    }, [eventId, fallbackMode, fallbackReservations.length]);

    useEffect(() => {
        if (!fallbackMode) return;
        setFallbackSearching(true);
        const timer = setTimeout(() => {
            const term = fallbackSearch.trim().toLowerCase();
            if (!term) {
                setFallbackResults(fallbackReservations);
                setFallbackSearching(false);
                return;
            }

            const filtered = fallbackReservations.filter((reservation) => {
                const name = String(reservation.name || '').toLowerCase();
                const phone = String(reservation.phone || '');
                const email = String(reservation.email || '').toLowerCase();
                return name.includes(term) || phone.includes(term) || email.includes(term);
            });
            setFallbackResults(filtered);
            setFallbackSearching(false);
        }, 180);
        return () => clearTimeout(timer);
    }, [fallbackMode, fallbackReservations, fallbackSearch]);

    const handleFallbackCheckin = async (reservation) => {
        if (!eventId) return;
        if (reservation.checkedIn) {
            alert(`${reservation.name}님은 이미 입장 처리되었습니다.`);
            return;
        }
        if (!window.confirm(`${reservation.name}님을 입장 처리할까요?`)) return;

        setFallbackProcessing(reservation.id);
        try {
            await updateDoc(doc(db, 'events', eventId, 'reservations', reservation.id), {
                checkedIn: true,
                checkedInAt: new Date().toISOString(),
                checkedInMethod: 'manual_fallback'
            });
            const updated = { ...reservation, checkedIn: true, checkedInAt: new Date().toISOString() };
            setFallbackResults((prev) => prev.map((item) => (item.id === reservation.id ? updated : item)));
            setFallbackReservations((prev) => prev.map((item) => (item.id === reservation.id ? updated : item)));
            setScanStatus({ type: 'success', message: `✅ ${reservation.name}님 수동 입장 완료!` });
        } catch (error) {
            console.error('Manual check-in failed:', error);
            alert('입장 처리 중 오류가 발생했습니다.');
        } finally {
            setFallbackProcessing(null);
        }
    };

    const progressPercent = totals.paid > 0 ? Math.round((totals.checkedIn / totals.paid) * 100) : 0;

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <h2>🎫 체크인 데스크</h2>
                <p>QR 스캔 또는 수동 검색으로 빠르게 입장을 처리하세요.</p>
            </header>

            <section className={classes.stats}>
                <div className={classes.statCard}>
                    <span>총 입장 대상</span>
                    <strong>{totals.paid}명</strong>
                </div>
                <div className={classes.statCard}>
                    <span>입장 완료</span>
                    <strong>{totals.checkedIn}명</strong>
                </div>
                <div className={`${classes.statCard} ${classes.progressCard}`}>
                    <span>입장률</span>
                    <strong>{progressPercent}%</strong>
                    <div className={classes.progressBarContainer}>
                        <div className={classes.progressBar} style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            </section>

            <div className={classes.modeTabs}>
                <button className={`${classes.modeTab} ${!fallbackMode ? classes.modeTabActive : ''}`} onClick={() => setFallbackMode(false)}>
                    📷 QR 스캔
                </button>
                <button className={`${classes.modeTab} ${fallbackMode ? classes.modeTabActive : ''}`} onClick={() => setFallbackMode(true)}>
                    🧾 수동 체크인
                </button>
            </div>

            {!fallbackMode && (
                <section className={classes.scanner}>
                    <div className={classes.scannerControls}>
                        <button onClick={() => setIsMirrored(!isMirrored)} className={classes.controlBtn}>
                            🪞 {isMirrored ? '거울 모드 끄기' : '거울 모드 켜기'}
                        </button>
                        {torchSupported && (
                            <button onClick={toggleTorch} className={`${classes.controlBtn} ${torchOn ? classes.torchActive : ''}`}>
                                🔦 {torchOn ? '손전등 끄기' : '손전등 켜기'}
                            </button>
                        )}
                    </div>

                    <div className={classes.videoFrame}>
                        <video ref={videoRef} className={`${classes.video} ${!isMirrored ? classes.noMirror : ''}`} muted playsInline />
                        <div className={classes.scanOverlay}>
                            <div className={classes.scanTarget}>
                                <span className={`${classes.corner} ${classes.tl}`} />
                                <span className={`${classes.corner} ${classes.tr}`} />
                                <span className={`${classes.corner} ${classes.bl}`} />
                                <span className={`${classes.corner} ${classes.br}`} />
                            </div>
                            {isProcessing && <div className={classes.scanPulse} />}
                        </div>
                    </div>

                    {requiresGesture && !scanEnabled && (
                        <button type="button" className={classes.startScanButton} onClick={() => setScanEnabled(true)}>
                            📷 카메라 시작
                        </button>
                    )}

                    {cameraFailed && (
                        <div className={`${classes.statusCard} ${classes.warning}`}>
                            <p>⚠ 카메라를 사용할 수 없습니다.</p>
                            <button className={classes.fallbackSwitchBtn} onClick={() => setFallbackMode(true)}>
                                🧾 수동 체크인으로 전환
                            </button>
                        </div>
                    )}

                    {scanStatus && (
                        <div className={`${classes.statusCard} ${classes[scanStatus.type]}`}>
                            <p>{scanStatus.message}</p>
                        </div>
                    )}
                </section>
            )}

            {fallbackMode && (
                <section className={classes.fallbackSection}>
                    <div className={classes.fallbackHeader}>
                        <h3>🧾 수동 체크인</h3>
                        <p>카메라 스캔이 어려운 경우, 이름/연락처로 예약을 검색해 입장을 처리합니다.</p>
                    </div>

                    <div className={classes.fallbackSearchBox}>
                        <input
                            type="text"
                            value={fallbackSearch}
                            onChange={(event) => setFallbackSearch(event.target.value)}
                            placeholder="이름, 연락처, 이메일을 입력하세요"
                        />
                    </div>

                    {(fallbackLoading || fallbackSearching) && (
                        <p className={classes.fallbackResultCount}>검색 중...</p>
                    )}

                    {fallbackResults.length > 0 && (
                        <div className={classes.fallbackResults}>
                            <p className={classes.fallbackResultCount}>{fallbackResults.length}건의 예약이 검색되었습니다.</p>
                            {fallbackResults.map((reservation) => (
                                <div
                                    key={reservation.id}
                                    className={`${classes.fallbackCard} ${reservation.checkedIn ? classes.fallbackCheckedIn : ''}`}
                                >
                                    <div className={classes.fallbackCardInfo}>
                                        <div className={classes.fallbackName}>
                                            {reservation.name}
                                            {Number(reservation.ticketCount || 1) > 1 && (
                                                <span className={classes.ticketBadge}>{reservation.ticketCount}장</span>
                                            )}
                                        </div>
                                        <div className={classes.fallbackMeta}>
                                            {reservation.phone && <span>📱 {reservation.phone}</span>}
                                            {reservation.email && <span>✉ {reservation.email}</span>}
                                        </div>
                                        {reservation.checkedIn && (
                                            <div className={classes.checkedInLabel}>
                                                ✅ 이미 입장 완료{reservation.checkedInMethod === 'manual_fallback' ? ' (수동)' : ''}
                                            </div>
                                        )}
                                    </div>
                                    <div className={classes.fallbackCardAction}>
                                        {reservation.checkedIn ? (
                                            <span className={classes.completedBadge}>입장완료</span>
                                        ) : (
                                            <button
                                                onClick={() => handleFallbackCheckin(reservation)}
                                                disabled={fallbackProcessing === reservation.id}
                                                className={classes.checkinBtn}
                                            >
                                                {fallbackProcessing === reservation.id ? '처리중...' : '입장 처리'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {fallbackResults.length === 0 && fallbackSearch.trim() && !fallbackLoading && !fallbackSearching && (
                        <div className={classes.fallbackEmpty}>
                            <p>일치하는 예약 정보가 없습니다.</p>
                            <small>검색어를 다시 확인해주세요.</small>
                        </div>
                    )}

                    {scanStatus && (
                        <div className={`${classes.statusCard} ${classes[scanStatus.type]}`} style={{ marginTop: '1rem' }}>
                            <p>{scanStatus.message}</p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default Checkin;
