import React, { useEffect, useRef, useState, useCallback } from 'react';
import { db, collection, doc, getDocs, onSnapshot, query, updateDoc, where, orderBy } from '../../api/firebase';
import { useEvent } from "../../contexts/EventContext";
import classes from './Checkin.module.css';

const parseToken = (rawText) => {
    if (!rawText) return '';
    try {
        const url = new URL(rawText);
        return url.searchParams.get('auth') || rawText.trim();
    } catch {
        return rawText.trim();
    }
};

// Debounce 쿨다운: 같은 토큰 연속 스캔 방지 (ms)
const SCAN_COOLDOWN_MS = 3000;

const Checkin = () => {
    const { eventId } = useEvent();
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const streamRef = useRef(null);

    const [scanStatus, setScanStatus] = useState(null);
    const [totals, setTotals] = useState({ paid: 0, checkedIn: 0 });
    const [manualToken, setManualToken] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [requiresGesture, setRequiresGesture] = useState(false);
    const [scanEnabled, setScanEnabled] = useState(true);
    const [isMirrored, setIsMirrored] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // 손전등(토치) 상태
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    // 수동 체크인(Fallback) 모드 상태
    const [fallbackMode, setFallbackMode] = useState(false);
    const [fallbackSearch, setFallbackSearch] = useState('');
    const [fallbackResults, setFallbackResults] = useState([]);
    const [fallbackLoading, setFallbackLoading] = useState(false);
    const [fallbackProcessing, setFallbackProcessing] = useState(null);

    // 최근 스캔 토큰 쿨다운 관리
    const lastScannedRef = useRef({ token: '', timestamp: 0 });

    // 카메라 접근 실패 여부
    const [cameraFailed, setCameraFailed] = useState(false);

    // Responsive detection
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateFromWidth = () => setIsMobile(window.innerWidth <= 768);
        if (!window.matchMedia) {
            updateFromWidth();
            window.addEventListener('resize', updateFromWidth);
            return () => window.removeEventListener('resize', updateFromWidth);
        }
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleChange = (event) => setIsMobile(event.matches);
        handleChange(mediaQuery);
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
        window.addEventListener('resize', updateFromWidth);
        return () => window.removeEventListener('resize', updateFromWidth);
    }, []);

    // 모바일: 후면 카메라 기본 → 거울모드 해제
    useEffect(() => {
        if (isMobile) {
            setIsMirrored(false);
        } else {
            setIsMirrored(true);
        }
    }, [isMobile]);

    // 실시간 예약 현황 집계
    useEffect(() => {
        if (!eventId) return;
        const q = query(collection(db, 'events', eventId, 'reservations'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let paidCount = 0;
            let checkedInCount = 0;
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const eligible = data.status === 'paid' || data.depositConfirmed === true;
                if (!eligible) return;
                paidCount += 1;
                if (data.checkedIn) checkedInCount += 1;
            });
            setTotals({ paid: paidCount, checkedIn: checkedInCount });
        });
        return unsubscribe;
    }, [eventId]);

    // Samsung Browser 감지
    useEffect(() => {
        if (typeof navigator === 'undefined') return;
        const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent || '');
        setRequiresGesture(isSamsungBrowser);
        setScanEnabled(!isSamsungBrowser);
    }, []);

    // 손전등 토글
    const toggleTorch = useCallback(async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        if (!track) return;
        try {
            const newVal = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: newVal }] });
            setTorchOn(newVal);
        } catch (err) {
            console.warn('Torch toggle failed:', err);
        }
    }, [torchOn]);

    // 토치 지원 여부 체크
    const checkTorchSupport = useCallback((stream) => {
        try {
            const track = stream.getVideoTracks()[0];
            if (!track) return;
            const capabilities = track.getCapabilities?.();
            if (capabilities && capabilities.torch) {
                setTorchSupported(true);
            }
        } catch {
            // pass
        }
    }, []);

    // QR 스캐너 시작
    useEffect(() => {
        let isActive = true;

        const startScan = async () => {
            if (!videoRef.current) return;

            let BrowserMultiFormatReader;
            try {
                ({ BrowserMultiFormatReader } = await import('@zxing/browser'));
            } catch {
                if (isActive) {
                    setScanStatus({ type: 'error', message: '이 브라우저에서는 QR 스캔이 지원되지 않습니다.' });
                    setCameraFailed(true);
                }
                return;
            }

            if (!isActive) return;

            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            const handleResult = (result) => {
                if (result) {
                    const text = result.getText();
                    const now = Date.now();
                    // 쿨다운: 동일 토큰 연속 스캔 방지
                    if (
                        lastScannedRef.current.token === text &&
                        now - lastScannedRef.current.timestamp < SCAN_COOLDOWN_MS
                    ) {
                        return;
                    }
                    lastScannedRef.current = { token: text, timestamp: now };
                    handleToken(text);
                }
            };

            const constraints = {
                video: {
                    facingMode: { ideal: isMobile ? 'environment' : 'user' }
                }
            };

            try {
                await reader.decodeFromConstraints(constraints, videoRef.current, handleResult);
                // 스트림 참조 저장 (토치용)
                const stream = videoRef.current?.srcObject;
                if (stream) {
                    streamRef.current = stream;
                    checkTorchSupport(stream);
                }
            } catch {
                try {
                    await reader.decodeFromVideoDevice(null, videoRef.current, handleResult);
                    const stream = videoRef.current?.srcObject;
                    if (stream) {
                        streamRef.current = stream;
                        checkTorchSupport(stream);
                    }
                } catch {
                    if (isActive) {
                        setScanStatus({ type: 'error', message: '카메라에 접근할 수 없습니다. 수동 체크인을 이용해주세요.' });
                        setCameraFailed(true);
                    }
                }
            }
        };

        if (scanEnabled && !fallbackMode) {
            startScan();
        }
        return () => {
            isActive = false;
            if (readerRef.current) {
                if (typeof readerRef.current.reset === 'function') {
                    readerRef.current.reset();
                } else if (typeof readerRef.current.stopContinuousDecode === 'function') {
                    readerRef.current.stopContinuousDecode();
                }
            }
            // 토치 끄기
            if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()[0];
                if (track) {
                    try { track.applyConstraints({ advanced: [{ torch: false }] }); } catch { /* pass */ }
                }
            }
        };
    }, [isMobile, scanEnabled, fallbackMode, checkTorchSupport]);

    // QR 토큰 처리 (잠금 로직으로 다중 스캔 방지)
    const handleToken = async (rawText) => {
        if (isProcessing) return; // 처리 중 이중 호출 방지
        const token = parseToken(rawText);
        if (!token) return;
        if (!eventId) {
            setScanStatus({ type: 'error', message: '이벤트 정보를 불러오지 못했습니다.' });
            return;
        }

        setIsProcessing(true);
        setScanStatus({ type: 'loading', message: '입장 상태 확인 중...' });

        try {
            const q = query(collection(db, 'events', eventId, 'reservations'), where('token', '==', token));
            const snapshot = await getDocs(q);

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
                        const d = data.checkedInAt.seconds
                            ? new Date(data.checkedInAt.seconds * 1000)
                            : new Date(data.checkedInAt);
                        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    })()
                    : '';
                setScanStatus({
                    type: 'info',
                    message: `${data.name}님은 이미 입장 완료되었습니다.${checkedTime ? ` (${checkedTime})` : ''}`,
                    name: data.name
                });
                return;
            }

            await updateDoc(doc(db, 'events', eventId, 'reservations', targetDoc.id), {
                checkedIn: true,
                checkedInAt: new Date().toISOString()
            });

            setScanStatus({
                type: 'success',
                message: `✅ ${data.name}님 입장 완료!${data.ticketCount > 1 ? ` (${data.ticketCount}매)` : ''}`,
                name: data.name
            });
        } catch {
            setScanStatus({ type: 'error', message: '입장 처리 중 오류가 발생했습니다.' });
        } finally {
            // 3초 후 처리 잠금 해제
            setTimeout(() => setIsProcessing(false), SCAN_COOLDOWN_MS);
        }
    };

    // 직접 토큰 입력
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualToken.trim()) return;
        handleToken(manualToken.trim());
        setManualToken('');
    };

    // ──────────────────────────────────────────────
    // 수동 체크인 (Fallback) 기능
    // ──────────────────────────────────────────────
    const handleFallbackSearch = async () => {
        const term = fallbackSearch.trim();
        if (!term || !eventId) return;

        setFallbackLoading(true);
        setFallbackResults([]);

        try {
            // Firestore는 클라이언트 full-text search가 안 되므로 전체 fetch 후 필터
            const q = query(collection(db, 'events', eventId, 'reservations'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const results = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const eligible = data.status === 'paid' || data.depositConfirmed === true;
                if (!eligible) return;
                const nameMatch = data.name && data.name.toLowerCase().includes(term.toLowerCase());
                const phoneMatch = data.phone && data.phone.includes(term);
                if (nameMatch || phoneMatch) {
                    results.push({ id: docSnap.id, ...data });
                }
            });
            setFallbackResults(results);
        } catch (err) {
            console.error('Fallback search error:', err);
            setScanStatus({ type: 'error', message: '검색 중 오류가 발생했습니다.' });
        } finally {
            setFallbackLoading(false);
        }
    };

    const handleFallbackCheckin = async (reservation) => {
        if (!eventId) return;
        if (reservation.checkedIn) {
            alert(`${reservation.name}님은 이미 입장 처리되었습니다.`);
            return;
        }
        if (!window.confirm(`${reservation.name}님을 입장 처리하시겠습니까?`)) return;

        setFallbackProcessing(reservation.id);
        try {
            await updateDoc(doc(db, 'events', eventId, 'reservations', reservation.id), {
                checkedIn: true,
                checkedInAt: new Date().toISOString(),
                checkedInMethod: 'manual_fallback' // 수동 체크인 표기
            });
            // 로컬 결과 업데이트
            setFallbackResults(prev => prev.map(r =>
                r.id === reservation.id ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() } : r
            ));
            setScanStatus({
                type: 'success',
                message: `✅ ${reservation.name}님 수동 입장 완료!`
            });
        } catch (err) {
            console.error('Manual checkin error:', err);
            alert('입장 처리 중 오류가 발생했습니다.');
        } finally {
            setFallbackProcessing(null);
        }
    };

    // 진행률 퍼센트
    const progressPercent = totals.paid > 0
        ? Math.round((totals.checkedIn / totals.paid) * 100)
        : 0;

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <h2>🎫 체크인 데스크</h2>
                <p>QR 스캔 또는 수동 검색으로 빠르게 입장을 처리하세요.</p>
            </header>

            {/* ─── 통계 카드 ─── */}
            <section className={classes.stats}>
                <div className={classes.statCard}>
                    <span>총 사전 예약</span>
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
                        <div
                            className={classes.progressBar}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </section>

            {/* ─── 모드 전환 탭 ─── */}
            <div className={classes.modeTabs}>
                <button
                    className={`${classes.modeTab} ${!fallbackMode ? classes.modeTabActive : ''}`}
                    onClick={() => setFallbackMode(false)}
                >
                    📷 QR 스캔
                </button>
                <button
                    className={`${classes.modeTab} ${fallbackMode ? classes.modeTabActive : ''}`}
                    onClick={() => setFallbackMode(true)}
                >
                    🔍 수동 체크인
                </button>
            </div>

            {/* ─── QR 스캐너 모드 ─── */}
            {!fallbackMode && (
                <section className={classes.scanner}>
                    {/* 스캐너 컨트롤 바 */}
                    <div className={classes.scannerControls}>
                        <button
                            onClick={() => setIsMirrored(!isMirrored)}
                            className={classes.controlBtn}
                        >
                            🔄 {isMirrored ? '거울모드 끄기' : '거울모드 켜기'}
                        </button>
                        {torchSupported && (
                            <button
                                onClick={toggleTorch}
                                className={`${classes.controlBtn} ${torchOn ? classes.torchActive : ''}`}
                            >
                                🔦 {torchOn ? '손전등 끄기' : '손전등 켜기'}
                            </button>
                        )}
                    </div>

                    <div className={classes.videoFrame}>
                        <video
                            ref={videoRef}
                            className={`${classes.video} ${!isMirrored ? classes.noMirror : ''}`}
                            muted
                            playsInline
                        />
                        {/* 스캐너 에이밍 오버레이 */}
                        <div className={classes.scanOverlay}>
                            <div className={classes.scanTarget}>
                                <span className={`${classes.corner} ${classes.tl}`} />
                                <span className={`${classes.corner} ${classes.tr}`} />
                                <span className={`${classes.corner} ${classes.bl}`} />
                                <span className={`${classes.corner} ${classes.br}`} />
                            </div>
                            {isProcessing && (
                                <div className={classes.scanPulse} />
                            )}
                        </div>
                    </div>

                    {requiresGesture && !scanEnabled && (
                        <button
                            type="button"
                            className={classes.startScanButton}
                            onClick={() => setScanEnabled(true)}
                        >
                            📷 카메라 시작
                        </button>
                    )}

                    {/* 카메라 실패 알림 */}
                    {cameraFailed && (
                        <div className={`${classes.statusCard} ${classes.warning}`}>
                            <p>📱 카메라를 사용할 수 없습니다.</p>
                            <button
                                className={classes.fallbackSwitchBtn}
                                onClick={() => setFallbackMode(true)}
                            >
                                🔍 수동 체크인으로 전환
                            </button>
                        </div>
                    )}

                    {/* 스캔 결과 표시 */}
                    {scanStatus && (
                        <div className={`${classes.statusCard} ${classes[scanStatus.type]}`}>
                            <p>{scanStatus.message}</p>
                        </div>
                    )}

                    {/* 직접 토큰 입력 (토큰/예매 URL 붙여넣기) */}
                    <div className={classes.manual}>
                        <p className={classes.manualHint}>또는 토큰/예매 URL을 직접 입력:</p>
                        <form onSubmit={handleManualSubmit}>
                            <input
                                type="text"
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                placeholder="QR 토큰 또는 예매 URL 붙여넣기"
                            />
                            <button type="submit" disabled={isProcessing}>확인</button>
                        </form>
                    </div>
                </section>
            )}

            {/* ─── 수동 체크인 (Fallback) 모드 ─── */}
            {fallbackMode && (
                <section className={classes.fallbackSection}>
                    <div className={classes.fallbackHeader}>
                        <h3>🔍 수동 체크인</h3>
                        <p>카메라 스캔이 불가능한 경우, 이름 또는 연락처로 예약을 찾아 수동으로 입장 처리합니다.</p>
                    </div>

                    <div className={classes.fallbackSearchBox}>
                        <input
                            type="text"
                            value={fallbackSearch}
                            onChange={(e) => setFallbackSearch(e.target.value)}
                            placeholder="이름 또는 연락처 입력"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleFallbackSearch();
                                }
                            }}
                        />
                        <button onClick={handleFallbackSearch} disabled={fallbackLoading}>
                            {fallbackLoading ? '검색 중...' : '검색'}
                        </button>
                    </div>

                    {/* 검색 결과 */}
                    {fallbackResults.length > 0 && (
                        <div className={classes.fallbackResults}>
                            <p className={classes.fallbackResultCount}>
                                {fallbackResults.length}건의 예약을 찾았습니다.
                            </p>
                            {fallbackResults.map(res => (
                                <div
                                    key={res.id}
                                    className={`${classes.fallbackCard} ${res.checkedIn ? classes.fallbackCheckedIn : ''}`}
                                >
                                    <div className={classes.fallbackCardInfo}>
                                        <div className={classes.fallbackName}>
                                            {res.name}
                                            {res.ticketCount > 1 && (
                                                <span className={classes.ticketBadge}>{res.ticketCount}매</span>
                                            )}
                                        </div>
                                        <div className={classes.fallbackMeta}>
                                            {res.phone && <span>📞 {res.phone}</span>}
                                            {res.email && <span>✉️ {res.email}</span>}
                                        </div>
                                        {res.checkedIn && (
                                            <div className={classes.checkedInLabel}>
                                                ✅ 이미 입장 완료
                                                {res.checkedInMethod === 'manual_fallback' && ' (수동)'}
                                            </div>
                                        )}
                                    </div>
                                    <div className={classes.fallbackCardAction}>
                                        {res.checkedIn ? (
                                            <span className={classes.completedBadge}>입장완료</span>
                                        ) : (
                                            <button
                                                onClick={() => handleFallbackCheckin(res)}
                                                disabled={fallbackProcessing === res.id}
                                                className={classes.checkinBtn}
                                            >
                                                {fallbackProcessing === res.id ? '처리중...' : '입장 처리'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 검색 결과 없음 */}
                    {fallbackResults.length === 0 && fallbackSearch.trim() && !fallbackLoading && (
                        <div className={classes.fallbackEmpty}>
                            <p>🔎 일치하는 예매 정보가 없습니다.</p>
                            <small>이름 또는 연락처를 다시 확인해주세요.</small>
                        </div>
                    )}

                    {/* 스캔 결과 표시 (수동모드에서도) */}
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
