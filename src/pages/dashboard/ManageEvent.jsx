import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    db,
    deleteDoc,
    doc,
    functions,
    getDoc,
    getDownloadURL,
    httpsCallable,
    storage,
    storageRef,
    updateDoc,
    uploadBytes
} from '../../api/firebase';
import {
    ArrowLeft,
    Clock3,
    ExternalLink,
    GripVertical,
    Maximize2,
    Save,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AIProgressTimer from '../../components/AIProgressTimer';
import TimeFieldWithPicker from '../../components/TimeFieldWithPicker';
import { ensureContrast, hexToSrgb, relativeLuminance, contrastRatio } from '../../utils/color';

const DEFAULT_THEME = {
    primary: '#d05c80',
    secondary: '#e0b02a',
    bgPrimary: '#3e402d',
    bgSecondary: '#2f2f3f',
    textPrimary: '#f1e9e9',
    accent: '#e0b02a',
    fontMain: 'Pretendard',
    fontNote: 'Pretendard'
};

const DEFAULT_TIMELINE = [
    { id: 'timeline-1', time: '18:30', title: '관객 입장', icon: 'door' },
    { id: 'timeline-2', time: '19:00', title: '1부 공연 시작', icon: 'music' },
    { id: 'timeline-3', time: '20:00', title: '휴식', icon: 'coffee' },
    { id: 'timeline-4', time: '20:10', title: '2부 공연 시작', icon: 'flame' }
];

const TIMELINE_ICONS = [
    { value: 'door', label: '입장', symbol: '🚪' },
    { value: 'music', label: '음표', symbol: '🎵' },
    { value: 'coffee', label: '커피', symbol: '☕' },
    { value: 'flame', label: '불꽃', symbol: '🔥' },
    { value: 'mic', label: '마이크', symbol: '🎤' },
    { value: 'camera', label: '카메라', symbol: '📷' },
    { value: 'star', label: '스페셜', symbol: '⭐' },
    { value: 'heart', label: '하트', symbol: '💜' },
    { value: 'gift', label: '이벤트', symbol: '🎁' },
    { value: 'sparkles', label: '앙코르', symbol: '✨' },
    { value: 'megaphone', label: '공지', symbol: '📢' },
    { value: 'utensils', label: '식사', symbol: '🍽️' },
];

const FONT_PRESETS_MAIN = ['Pretendard', 'SUIT', 'Noto Sans KR', 'IBM Plex Sans KR'];
const FONT_PRESETS_NOTE = ['Pretendard', 'Nanum Pen Script', 'Gowun Batang', 'MaruBuri'];

const PREVIEW_TABS = [
    { path: '', label: '기본(홈)' },
    { path: '/reserve', label: '예약' },
    { path: '/onsite', label: '현장결제' },
    { path: '/checkin', label: 'QR입장' },
    { path: '/admin', label: '관리자' }
];

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalizePlain = (value) => String(value ?? '').trim();

const normalizeSetlist = (setlist = []) =>
    setlist.map((item, index) => ({
        id: normalizePlain(item.id || `setlist-${index + 1}`),
        type: item.type === 'frame' ? 'frame' : 'song',
        title: normalizeWhitespace(item.title),
        artist: normalizeWhitespace(item.artist)
    }));

const normalizeTimeline = (timeline = []) =>
    timeline.map((item, index) => ({
        id: normalizePlain(item.id || `timeline-${index + 1}`),
        time: normalizePlain(item.time),
        title: normalizeWhitespace(item.title),
        icon: normalizePlain(item.icon || 'music')
    }));

const normalizeDraft = (draft) =>
    JSON.stringify({
        title: normalizeWhitespace(draft.title),
        date: normalizePlain(draft.date),
        time: normalizePlain(draft.time),
        location: normalizeWhitespace(draft.location),
        address: normalizeWhitespace(draft.address),
        posterUrl: normalizePlain(draft.posterUrl),
        setlist: normalizeSetlist(draft.setlist),
        timeline: normalizeTimeline(draft.timeline),
        payment: {
            isFreeEvent: Boolean(draft.payment?.isFreeEvent),
            bankName: normalizeWhitespace(draft.payment?.bankName),
            accountNumber: normalizePlain(draft.payment?.accountNumber),
            accountHolder: normalizeWhitespace(draft.payment?.accountHolder),
            ticketPrice: normalizePlain(draft.payment?.ticketPrice),
            onsitePrice: normalizePlain(draft.payment?.onsitePrice)
        },
        theme: {
            primary: normalizePlain(draft.theme?.primary || DEFAULT_THEME.primary),
            secondary: normalizePlain(draft.theme?.secondary || DEFAULT_THEME.secondary),
            bgPrimary: normalizePlain(draft.theme?.bgPrimary || DEFAULT_THEME.bgPrimary),
            bgSecondary: normalizePlain(draft.theme?.bgSecondary || DEFAULT_THEME.bgSecondary),
            textPrimary: normalizePlain(draft.theme?.textPrimary || DEFAULT_THEME.textPrimary),
            accent: normalizePlain(draft.theme?.accent || DEFAULT_THEME.accent),
            fontMain: normalizeWhitespace(draft.theme?.fontMain || DEFAULT_THEME.fontMain),
            fontNote: normalizeWhitespace(draft.theme?.fontNote || DEFAULT_THEME.fontNote)
        }
    });

const toColorValue = (value, fallback) => (/^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback);

const darkenHex = (hex, amount = 0.25) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return '#1a1a2e';
    const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};


const toBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 512;
                const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
                canvas.width = Math.floor(img.width * ratio);
                canvas.height = Math.floor(img.height * ratio);
                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const SortableRow = ({ id, children }) => {
    const sortable = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition
    };

    return children({
        setNodeRef: sortable.setNodeRef,
        style,
        isDragging: sortable.isDragging,
        attributes: sortable.attributes,
        listeners: sortable.listeners
    });
};

const ManageEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const initialSnapshotRef = useRef('');
    const posterObjectUrlRef = useRef('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [extractingColors, setExtractingColors] = useState(false);
    const [snapshotReady, setSnapshotReady] = useState(false);

    const [previewScale, setPreviewScale] = useState(1);
    const [previewTab, setPreviewTab] = useState('');
    const [reloadKey, setReloadKey] = useState(Date.now());
    const [isEnlargedPreviewOpen, setIsEnlargedPreviewOpen] = useState(false);

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [posterUrl, setPosterUrl] = useState('');

    const [setlist, setSetlist] = useState([]);
    const [timeline, setTimeline] = useState(DEFAULT_TIMELINE);

    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [ticketPrice, setTicketPrice] = useState('');
    const [onsitePrice, setOnsitePrice] = useState('');
    const [isFreeEvent, setIsFreeEvent] = useState(false);

    const [primaryColor, setPrimaryColor] = useState(DEFAULT_THEME.primary);
    const [secondaryColor, setSecondaryColor] = useState(DEFAULT_THEME.secondary);
    const [bgColor, setBgColor] = useState(DEFAULT_THEME.bgPrimary);
    const [bgSecondaryColor, setBgSecondaryColor] = useState(DEFAULT_THEME.bgSecondary);
    const [textColor, setTextColor] = useState(DEFAULT_THEME.textPrimary);
    const [accentColor, setAccentColor] = useState(DEFAULT_THEME.accent);
    const [fontMain, setFontMain] = useState(DEFAULT_THEME.fontMain);
    const [fontNote, setFontNote] = useState(DEFAULT_THEME.fontNote);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const deviceFrameColor = useMemo(() => darkenHex(bgColor, 0.25), [bgColor]);

    useEffect(() => {
        const calculateScale = () => {
            const availableHeight = window.innerHeight - 220;
            setPreviewScale(Math.min(1, availableHeight / 852));
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    useEffect(() => {
        const themeUpdate = {
            primary: primaryColor,
            secondary: secondaryColor,
            bgPrimary: bgColor,
            bgSecondary: bgSecondaryColor,
            textPrimary: textColor,
            accent: accentColor,
            fontMain: normalizeWhitespace(fontMain) || DEFAULT_THEME.fontMain,
            fontNote: normalizeWhitespace(fontNote) || DEFAULT_THEME.fontNote
        };
        sessionStorage.setItem(`preview_theme_${eventId}`, JSON.stringify(themeUpdate));

        const iframe = document.getElementById('preview-iframe');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'previewThemeUpdate', theme: themeUpdate }, '*');
        }
    }, [accentColor, bgColor, bgSecondaryColor, eventId, fontMain, fontNote, primaryColor, secondaryColor, textColor]);

    const buildCurrentDraft = useCallback(
        () => ({
            title,
            date,
            time,
            location,
            address,
            posterUrl,
            setlist,
            timeline,
            payment: {
                isFreeEvent,
                bankName,
                accountNumber,
                accountHolder,
                ticketPrice,
                onsitePrice
            },
            theme: {
                primary: primaryColor,
                secondary: secondaryColor,
                bgPrimary: bgColor,
                bgSecondary: bgSecondaryColor,
                textPrimary: textColor,
                accent: accentColor,
                fontMain,
                fontNote
            }
        }),
        [
            title,
            date,
            time,
            location,
            address,
            posterUrl,
            setlist,
            timeline,
            isFreeEvent,
            bankName,
            accountNumber,
            accountHolder,
            ticketPrice,
            onsitePrice,
            primaryColor,
            secondaryColor,
            bgColor,
            bgSecondaryColor,
            textColor,
            accentColor,
            fontMain,
            fontNote
        ]
    );

    const currentSnapshot = useMemo(() => normalizeDraft(buildCurrentDraft()), [buildCurrentDraft]);
    const isDirty = snapshotReady && initialSnapshotRef.current !== currentSnapshot;

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventRef = doc(db, 'events', eventId);
                const snapshot = await getDoc(eventRef);

                if (!snapshot.exists()) {
                    alert('이벤트를 찾을 수 없습니다.');
                    navigate('/dashboard');
                    return;
                }

                const data = snapshot.data();
                const hydrated = {
                    title: data.title || '',
                    date: data.date || '',
                    time: data.time || '',
                    location: data.location || '',
                    address: data.address || '',
                    posterUrl: data.posterUrl || '',
                    setlist: (data.setlist || []).map((item, index) => ({
                        id: normalizePlain(item?.id || `setlist-${index + 1}`),
                        type: item?.type === 'frame' ? 'frame' : 'song',
                        title: item?.title || '',
                        artist: item?.artist || ''
                    })),
                    timeline: (data.timeline || DEFAULT_TIMELINE).map((item, index) => ({
                        id: normalizePlain(item?.id || `timeline-${index + 1}`),
                        time: normalizePlain(item?.time),
                        title: item?.title || '',
                        icon: item?.icon || 'music'
                    })),
                    payment: {
                        isFreeEvent: data.payment?.isFreeEvent === true,
                        bankName: data.payment?.bankName || '',
                        accountNumber: data.payment?.accountNumber || '',
                        accountHolder: data.payment?.accountHolder || '',
                        ticketPrice: data.payment?.ticketPrice || '',
                        onsitePrice: data.payment?.onsitePrice || ''
                    },
                    theme: {
                        primary: toColorValue(data.theme?.primary, DEFAULT_THEME.primary),
                        secondary: toColorValue(data.theme?.secondary, DEFAULT_THEME.secondary),
                        bgPrimary: toColorValue(data.theme?.bgPrimary, DEFAULT_THEME.bgPrimary),
                        bgSecondary: toColorValue(data.theme?.bgSecondary, DEFAULT_THEME.bgSecondary),
                        textPrimary: toColorValue(data.theme?.textPrimary, DEFAULT_THEME.textPrimary),
                        accent: toColorValue(data.theme?.accent, DEFAULT_THEME.accent),
                        fontMain: normalizeWhitespace(data.theme?.fontMain) || DEFAULT_THEME.fontMain,
                        fontNote: normalizeWhitespace(data.theme?.fontNote) || DEFAULT_THEME.fontNote
                    }
                };

                setTitle(hydrated.title);
                setDate(hydrated.date);
                setTime(hydrated.time);
                setLocation(hydrated.location);
                setAddress(hydrated.address);
                setPosterUrl(hydrated.posterUrl);
                setSetlist(hydrated.setlist);
                setTimeline(hydrated.timeline);

                setIsFreeEvent(hydrated.payment.isFreeEvent);
                setBankName(hydrated.payment.bankName);
                setAccountNumber(hydrated.payment.accountNumber);
                setAccountHolder(hydrated.payment.accountHolder);
                setTicketPrice(hydrated.payment.ticketPrice);
                setOnsitePrice(hydrated.payment.onsitePrice);

                setPrimaryColor(hydrated.theme.primary);
                setSecondaryColor(hydrated.theme.secondary);
                setBgColor(hydrated.theme.bgPrimary);
                setBgSecondaryColor(hydrated.theme.bgSecondary);
                setTextColor(hydrated.theme.textPrimary);
                setAccentColor(hydrated.theme.accent);
                setFontMain(hydrated.theme.fontMain);
                setFontNote(hydrated.theme.fontNote);

                initialSnapshotRef.current = normalizeDraft(hydrated);
                setSnapshotReady(true);
            } catch (error) {
                console.error('Failed to load event:', error);
                alert('이벤트를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, navigate]);

    useEffect(() => {
        const beforeUnload = (event) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [isDirty]);

    // popstate 기반 네비게이션 차단 (BrowserRouter 호환)
    useEffect(() => {
        if (!isDirty) return;
        const handlePopState = () => {
            const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 이동할까요?');
            if (!confirmed) {
                window.history.pushState(null, '', window.location.href);
            }
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isDirty]);

    useEffect(
        () => () => {
            if (posterObjectUrlRef.current) {
                URL.revokeObjectURL(posterObjectUrlRef.current);
                posterObjectUrlRef.current = '';
            }
        },
        []
    );

    const handleDelete = async () => {
        if (!window.confirm(`"${title || '이 이벤트'}"를 삭제하시겠습니까?`)) return;
        if (!window.confirm('정말로 삭제하면 되돌릴 수 없습니다. 계속할까요?')) return;

        try {
            await deleteDoc(doc(db, 'events', eventId));
            alert('이벤트가 삭제되었습니다.');
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const extractColorsFromPoster = useCallback(
        async (file) => {
            setExtractingColors(true);
            try {
                const imageBase64 = await toBase64(file);
                const callable = httpsCallable(functions, 'extractPosterColors');
                const response = await callable({ eventId, imageBase64 });
                const colors = response.data?.colors;
                if (!colors) throw new Error('No colors in response');

                const bg = toColorValue(colors.bgPrimary, DEFAULT_THEME.bgPrimary);
                const rawText = toColorValue(colors.textPrimary, DEFAULT_THEME.textPrimary);
                const correctedText = ensureContrast(rawText, bg);

                setPrimaryColor(toColorValue(colors.primary, DEFAULT_THEME.primary));
                setSecondaryColor(toColorValue(colors.secondary, DEFAULT_THEME.secondary));
                setBgColor(bg);
                setBgSecondaryColor(toColorValue(colors.bgSecondary, DEFAULT_THEME.bgSecondary));
                setTextColor(correctedText);
                setAccentColor(toColorValue(colors.secondary, DEFAULT_THEME.accent));
            } catch (error) {
                console.error('Poster color extraction failed:', error);
                alert('색상 자동 추출에 실패했습니다. 수동으로 조정해주세요.');
            } finally {
                setExtractingColors(false);
            }
        },
        [eventId]
    );

    const handlePosterUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('10MB 이하 이미지만 업로드할 수 있습니다.');
            return;
        }

        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `events/${eventId}/poster_${Date.now()}.${ext}`;
            const ref = storageRef(storage, path);
            await uploadBytes(ref, file);
            const uploadedUrl = await getDownloadURL(ref);
            setPosterUrl(uploadedUrl);
            // 즉시 Firestore에 posterUrl 저장 (iframe 리로드 시 반영되도록)
            await updateDoc(doc(db, 'events', eventId), { posterUrl: uploadedUrl });
            await extractColorsFromPoster(file);
        } catch (error) {
            console.error('Poster upload failed:', error);
            if (posterObjectUrlRef.current) URL.revokeObjectURL(posterObjectUrlRef.current);
            posterObjectUrlRef.current = URL.createObjectURL(file);
            setPosterUrl(posterObjectUrlRef.current);
            alert('포스터 업로드에 실패했습니다. 미리보기는 로컬 이미지로 유지합니다.');
            await extractColorsFromPoster(file);
        } finally {
            setUploading(false);
            setReloadKey(Date.now());
            event.target.value = '';
        }
    };

    const normalizeForSave = () => {
        const normalizedSetlist = normalizeSetlist(setlist)
            .filter((item) => item.title || item.artist)
            .map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                artist: item.type === 'frame' ? '' : item.artist
            }));

        const normalizedTimeline = normalizeTimeline(timeline)
            .filter((item) => item.title)
            .map((item) => ({
                id: item.id,
                time: item.time,
                title: item.title,
                icon: item.icon
            }));

        return {
            title: normalizeWhitespace(title),
            date: normalizePlain(date),
            time: normalizePlain(time),
            location: normalizeWhitespace(location),
            address: normalizeWhitespace(address),
            posterUrl: normalizePlain(posterUrl),
            setlist: normalizedSetlist,
            timeline: normalizedTimeline,
            payment: {
                isFreeEvent: Boolean(isFreeEvent),
                bankName: normalizeWhitespace(bankName),
                accountNumber: normalizePlain(accountNumber),
                accountHolder: normalizeWhitespace(accountHolder),
                ticketPrice: normalizePlain(ticketPrice),
                onsitePrice: normalizePlain(onsitePrice)
            },
            theme: {
                primary: toColorValue(primaryColor, DEFAULT_THEME.primary),
                secondary: toColorValue(secondaryColor, DEFAULT_THEME.secondary),
                bgPrimary: toColorValue(bgColor, DEFAULT_THEME.bgPrimary),
                bgSecondary: toColorValue(bgSecondaryColor, DEFAULT_THEME.bgSecondary),
                textPrimary: toColorValue(textColor, DEFAULT_THEME.textPrimary),
                accent: toColorValue(accentColor, DEFAULT_THEME.accent),
                fontMain: normalizeWhitespace(fontMain) || DEFAULT_THEME.fontMain,
                fontNote: normalizeWhitespace(fontNote) || DEFAULT_THEME.fontNote
            }
        };
    };

    const handleSave = async () => {
        if (saving || !snapshotReady) return;
        setSaving(true);
        try {
            const normalized = normalizeForSave();
            await updateDoc(doc(db, 'events', eventId), normalized);

            setTitle(normalized.title);
            setDate(normalized.date);
            setTime(normalized.time);
            setLocation(normalized.location);
            setAddress(normalized.address);
            setPosterUrl(normalized.posterUrl);
            setSetlist(normalized.setlist);
            setTimeline(normalized.timeline);
            setIsFreeEvent(normalized.payment.isFreeEvent);
            setBankName(normalized.payment.bankName);
            setAccountNumber(normalized.payment.accountNumber);
            setAccountHolder(normalized.payment.accountHolder);
            setTicketPrice(normalized.payment.ticketPrice);
            setOnsitePrice(normalized.payment.onsitePrice);
            setPrimaryColor(normalized.theme.primary);
            setSecondaryColor(normalized.theme.secondary);
            setBgColor(normalized.theme.bgPrimary);
            setBgSecondaryColor(normalized.theme.bgSecondary);
            setTextColor(normalized.theme.textPrimary);
            setAccentColor(normalized.theme.accent);
            setFontMain(normalized.theme.fontMain);
            setFontNote(normalized.theme.fontNote);

            initialSnapshotRef.current = normalizeDraft(normalized);
            setReloadKey(Date.now());
            alert('저장되었습니다.');
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const addSetlistSong = () => setSetlist((prev) => [...prev, { id: createId('setlist'), type: 'song', title: '', artist: '' }]);
    const addSetlistFrame = () => setSetlist((prev) => [...prev, { id: createId('setlist'), type: 'frame', title: '새 구간', artist: '' }]);
    const removeSetlistItem = (id) => setSetlist((prev) => prev.filter((item) => item.id !== id));
    const updateSetlistItem = (id, field, value) => setSetlist((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

    const addTimelineItem = () => setTimeline((prev) => [...prev, { id: createId('timeline'), time: '', title: '', icon: 'music' }]);
    const removeTimelineItem = (id) => setTimeline((prev) => prev.filter((item) => item.id !== id));
    const updateTimelineItem = (id, field, value) => setTimeline((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

    const handleSetlistDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setSetlist((prev) => {
            const oldIndex = prev.findIndex((item) => item.id === active.id);
            const newIndex = prev.findIndex((item) => item.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleTimelineDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setTimeline((prev) => {
            const oldIndex = prev.findIndex((item) => item.id === active.id);
            const newIndex = prev.findIndex((item) => item.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const mainFontPreset = FONT_PRESETS_MAIN.includes(fontMain) ? fontMain : '__custom__';
    const noteFontPreset = FONT_PRESETS_NOTE.includes(fontNote) ? fontNote : '__custom__';

    if (loading) {
        return <div style={{ padding: '2rem', color: '#64748b' }}>Loading...</div>;
    }

    const inputStyle = {
        width: '100%',
        padding: '0.5rem',
        boxSizing: 'border-box',
        background: 'var(--ui-surface-soft)',
        border: '1px solid var(--ui-border-soft)',
        borderTop: '1px solid var(--ui-border-strong)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-main)',
    };
    const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: 500 };
    const cardStyle = {
        backgroundColor: 'var(--ui-surface-hover)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--ui-border-soft)',
    };
    const sectionGap = { display: 'flex', flexDirection: 'column', gap: '1rem' };

    return (
        <div>
            <AIProgressTimer
                active={extractingColors}
                title="테마 색상 자동 추출 중"
                icon="🎨"
                estimatedSeconds={10}
                steps={[
                    { label: '포스터 이미지를 분석하는 중...' },
                    { label: '대표 색상을 추출하는 중...' },
                    { label: '웹 테마 팔레트로 정리하는 중...' }
                ]}
            />

            <div style={{ marginBottom: '1rem' }}>
                <Link
                    to=".."
                    onClick={(e) => {
                        if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 이동할까요?')) {
                            e.preventDefault();
                        }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                >
                    <ArrowLeft size={16} /> 목록으로 돌아가기
                </Link>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    marginBottom: '2rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    backgroundColor: 'var(--ui-surface-hover)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid var(--ui-border-soft)',
                    margin: '0 -1rem 2rem -1rem',
                    boxShadow: '0 4px 6px -1px var(--ui-scrim)',
                }}
            >
                <h2>{title || '이벤트 관리'}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a
                        href={`/e/${eventId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: 'var(--ui-surface-soft)', color: 'var(--text-primary)', border: '1px solid var(--ui-border-soft)', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                        <ExternalLink size={14} /> 실제 배포 페이지
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: isDirty ? 'var(--ui-surface-hover)' : 'var(--ui-surface-soft)', color: 'var(--text-primary)', border: '1px solid var(--ui-border-soft)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <Save size={14} /> {saving ? '저장 중...' : isDirty ? '저장 [미저장 상태]' : '저장 (미리보기에 반영)'}
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: 'var(--text-on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <Trash2 size={14} /> 삭제
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* 왼쪽 에디터 */}
                <div style={{ ...sectionGap, flex: '1 1 500px' }}>

                    {/* 포스터 + 테마 + 기본 정보 (HEAD 순서) */}
                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <h3 style={{ margin: 0 }}>포스터 업로드</h3>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePosterUpload} style={{ display: 'none' }} />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                width: '100%', padding: '0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                backgroundColor: uploading ? 'rgba(246,196,88,0.12)' : 'var(--ui-surface-soft)',
                                border: uploading ? '2px dashed rgba(246,196,88,0.6)' : '2px dashed var(--ui-border-soft)',
                                borderRadius: '8px',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                color: uploading ? 'rgba(246,196,88,0.9)' : 'var(--text-secondary)',
                                fontWeight: uploading ? 'bold' : 'normal',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Upload size={16} />
                            {uploading ? '⏳ 포스터 업로드 중입니다...' : '포스터 이미지 파일 업로드'}
                        </button>

                        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--ui-surface-soft)', borderRadius: '8px', border: '1px solid var(--ui-border-soft)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>테마 색상</h4>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>포스터 업로드 시 자동 추출</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                                {[
                                    ['Primary (강조)', primaryColor, setPrimaryColor],
                                    ['Secondary', secondaryColor, setSecondaryColor],
                                    ['Background', bgColor, setBgColor],
                                    ['Background 2', bgSecondaryColor, setBgSecondaryColor],
                                    ['Text', textColor, setTextColor],
                                    ['Accent', accentColor, setAccentColor]
                                ].map(([label, value, setter]) => (
                                    <div key={label}>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.3rem' }}>{label}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <input type="color" value={value} onChange={(event) => setter(event.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                            <input type="text" value={value} onChange={(event) => setter(event.target.value)} style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid var(--ui-border-soft)', borderRadius: '4px', background: 'var(--ui-surface-soft)', color: 'var(--text-primary)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>폰트 설정</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '0.8rem' }}>기본 본문 폰트</label>
                                <select value={mainFontPreset} onChange={(event) => { if (event.target.value !== '__custom__') setFontMain(event.target.value); }} style={inputStyle}>
                                    {FONT_PRESETS_MAIN.map((font) => (<option key={font} value={font}>{font}</option>))}
                                    <option value="__custom__">직접 입력</option>
                                </select>
                                <input value={fontMain} onChange={(event) => setFontMain(event.target.value)} style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="예: Pretendard" />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '0.8rem' }}>게시판/노트 폰트</label>
                                <select value={noteFontPreset} onChange={(event) => { if (event.target.value !== '__custom__') setFontNote(event.target.value); }} style={inputStyle}>
                                    {FONT_PRESETS_NOTE.map((font) => (<option key={font} value={font}>{font}</option>))}
                                    <option value="__custom__">직접 입력</option>
                                </select>
                                <input value={fontNote} onChange={(event) => setFontNote(event.target.value)} style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="예: Nanum Pen Script" />
                            </div>
                        </div>

                        <h3 style={{ margin: '1rem 0 0 0' }}>기본 정보</h3>
                        <div>
                            <label style={labelStyle}>이벤트 제목</label>
                            <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>날짜</label>
                                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>시작 시간</label>
                                <TimeFieldWithPicker value={time} onChange={setTime} buttonLabel="시작 시간 선택" />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>장소 이름</label>
                                <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} style={inputStyle} placeholder="예: 홍대 웨스트브릿지" />
                            </div>
                            <div>
                                <label style={labelStyle}>상세 주소</label>
                                <input type="text" value={address} onChange={(event) => setAddress(event.target.value)} style={inputStyle} placeholder="도로명/지번 주소 입력" />
                            </div>
                        </div>
                    </div>

                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>셋리스트 (공연 순서)</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={addSetlistFrame} style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--ui-surface-soft)', color: 'var(--text-primary)', border: '1px solid var(--ui-border-soft)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>+ 프레임(1부, 2부) 추가</button>
                                <button onClick={addSetlistSong} style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--ui-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--ui-border-soft)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>+ 곡 추가</button>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>관객 페이지(/info)에 보여질 순서입니다.</p>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSetlistDragEnd}>
                            <SortableContext items={setlist.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                                <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem' }}>
                                    {setlist.length === 0 && <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '1rem', backgroundColor: 'var(--ui-surface-soft)', borderRadius: '4px' }}>아직 추가된 항목이 없습니다.</div>}
                                    {setlist.map((item) => (
                                        <SortableRow key={item.id} id={item.id}>
                                            {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                                                <div
                                                    ref={setNodeRef}
                                                    style={{
                                                        ...style,
                                                        display: 'grid',
                                                        gridTemplateColumns: 'auto 1fr auto',
                                                        gap: '0.6rem',
                                                        alignItems: 'center',
                                                        border: '1px solid var(--ui-border-soft)',
                                                        borderRadius: 10,
                                                        padding: '0.5rem',
                                                        background: isDragging ? 'var(--ui-surface-hover)' : 'var(--ui-surface-soft)'
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        {...attributes}
                                                        {...listeners}
                                                        style={{ border: 'none', background: 'transparent', padding: '0.2rem', cursor: 'grab', color: 'var(--text-tertiary)' }}
                                                        aria-label="순서 이동"
                                                    >
                                                        <GripVertical size={16} />
                                                    </button>
                                                    <div style={{ display: 'grid', gap: '0.4rem', gridTemplateColumns: item.type === 'frame' ? '1fr' : '1fr 1fr' }}>
                                                        <input
                                                            value={item.title}
                                                            onChange={(event) => updateSetlistItem(item.id, 'title', event.target.value)}
                                                            style={inputStyle}
                                                            placeholder={item.type === 'frame' ? '구간 제목' : '곡 제목'}
                                                        />
                                                        {item.type !== 'frame' && (
                                                            <input
                                                                value={item.artist || ''}
                                                                onChange={(event) => updateSetlistItem(item.id, 'artist', event.target.value)}
                                                                style={inputStyle}
                                                                placeholder="아티스트 (선택)"
                                                            />
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSetlistItem(item.id)}
                                                        style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </SortableRow>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>공연 타임라인</h3>
                            <button onClick={addTimelineItem} style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--ui-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--ui-border-soft)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                + 스케줄 추가
                            </button>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTimelineDragEnd}>
                            <SortableContext items={timeline.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                                <div style={{ display: 'grid', gap: '0.7rem', marginTop: '0.9rem' }}>
                                    {timeline.map((item) => (
                                        <SortableRow key={item.id} id={item.id}>
                                            {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                                                <div
                                                    ref={setNodeRef}
                                                    style={{
                                                        ...style,
                                                        display: 'grid',
                                                        gridTemplateColumns: 'auto 150px 1fr auto',
                                                        gap: '0.6rem',
                                                        alignItems: 'center',
                                                        border: '1px solid var(--ui-border-soft)',
                                                        borderRadius: 10,
                                                        padding: '0.6rem',
                                                        background: isDragging ? 'var(--ui-surface-hover)' : 'var(--ui-surface-soft)'
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        {...attributes}
                                                        {...listeners}
                                                        aria-label="순서 이동"
                                                        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'grab', color: 'var(--text-tertiary)' }}
                                                    >
                                                        <GripVertical size={16} />
                                                    </button>

                                                    <TimeFieldWithPicker value={item.time} onChange={(value) => updateTimelineItem(item.id, 'time', value)} />

                                                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                                                        <input
                                                            value={item.title}
                                                            onChange={(event) => updateTimelineItem(item.id, 'title', event.target.value)}
                                                            style={inputStyle}
                                                            placeholder="내용 (예: 관객 입장)"
                                                        />
                                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                            {TIMELINE_ICONS.map((icon) => {
                                                                const active = icon.value === item.icon;
                                                                return (
                                                                    <button
                                                                        key={icon.value}
                                                                        type="button"
                                                                        onClick={() => updateTimelineItem(item.id, 'icon', icon.value)}
                                                                        style={{
                                                                            border: active ? '1px solid var(--primary-color)' : '1px solid var(--ui-border-soft)',
                                                                            background: active ? 'var(--ui-surface-hover)' : 'var(--ui-surface-soft)',
                                                                            borderRadius: 999,
                                                                            padding: '0.25rem 0.55rem',
                                                                            fontSize: '0.82rem',
                                                                            color: 'var(--text-primary)',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4
                                                                        }}
                                                                    >
                                                                        <span>{icon.symbol}</span>
                                                                        <span>{icon.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeTimelineItem(item.id)}
                                                        style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 700 }}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </SortableRow>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>결제/예약 정보</h3>
                            <div
                                onClick={() => setIsFreeEvent(!isFreeEvent)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <span style={{ fontSize: '0.9rem', color: isFreeEvent ? 'var(--text-tertiary)' : 'var(--text-primary)', fontWeight: isFreeEvent ? 'normal' : 'bold' }}>유료 공연</span>
                                <div style={{ width: '46px', height: '26px', backgroundColor: isFreeEvent ? 'var(--success-color)' : 'var(--ui-surface-hover)', borderRadius: '13px', position: 'relative', transition: 'background-color 0.3s' }}>
                                    <div style={{ width: '22px', height: '22px', backgroundColor: 'var(--text-on-primary)', borderRadius: '50%', position: 'absolute', top: '2px', left: isFreeEvent ? '22px' : '2px', transition: 'left 0.3s', boxShadow: '0 2px 4px var(--ui-scrim)' }} />
                                </div>
                                <span style={{ fontSize: '0.9rem', color: isFreeEvent ? 'var(--success-color)' : 'var(--text-tertiary)', fontWeight: isFreeEvent ? 'bold' : 'normal' }}>무료 공연</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>예약 페이지에 표시될 정보입니다.</p>

                        {!isFreeEvent ? (
                            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>은행명</label>
                                    <input type="text" value={bankName} onChange={(event) => setBankName(event.target.value)} style={inputStyle} placeholder="예: 카카오뱅크" />
                                </div>
                                <div>
                                    <label style={labelStyle}>계좌번호</label>
                                    <input type="text" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} style={inputStyle} placeholder="예: 1234-56-7890" />
                                </div>
                                <div>
                                    <label style={labelStyle}>예금주</label>
                                    <input type="text" value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} style={inputStyle} placeholder="예: 홍길동" />
                                </div>
                                <div>
                                    <label style={labelStyle}>일반 예매가</label>
                                    <input type="text" value={ticketPrice} onChange={(event) => setTicketPrice(event.target.value)} style={inputStyle} placeholder="예: 5000" />
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: 'var(--success-color)', borderRadius: '8px', fontSize: '0.9rem', marginTop: '1rem' }}>
                                ℹ️ 무료 공연으로 설정되어 관객은 계좌 입금 단계 없이 예매가 즉시 마무리됩니다. 현장 결제 정보도 노출되지 않습니다.
                            </div>
                        )}
                    </div>
                </div>

                <div
                    style={{
                        flex: `0 0 ${417 * previewScale}px`,
                        position: 'sticky',
                        top: '6rem',
                        height: 'calc(100vh - 8rem)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.8rem', justifyContent: 'center' }}>
                        {PREVIEW_TABS.map((tab) => (
                            <button
                                key={tab.path}
                                onClick={() => setPreviewTab(tab.path)}
                                style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.8rem',
                                    backgroundColor: previewTab === tab.path ? 'var(--ui-surface-hover)' : 'var(--ui-surface-soft)',
                                    color: previewTab === tab.path ? 'var(--text-primary)' : 'var(--ui-text-muted)',
                                    border: '1px solid var(--ui-border-soft)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsEnlargedPreviewOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                backgroundColor: 'var(--primary-color)',
                                color: 'var(--text-on-primary)',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginLeft: '0.5rem'
                            }}
                        >
                            <Maximize2 size={13} />
                            크게 보기
                        </button>
                    </div>

                    <div
                        style={{
                            width: 393,
                            height: 852,
                            border: `12px solid ${deviceFrameColor}`,
                            borderRadius: 44,
                            boxShadow: '0 20px 40px var(--ui-scrim)',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: deviceFrameColor,
                            zoom: previewScale
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 120,
                                height: 35,
                                borderRadius: 18,
                                backgroundColor: deviceFrameColor,
                                zIndex: 10,
                                boxShadow: 'inset 0 0 4px var(--ui-border-soft)'
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: 22,
                                left: '50%',
                                transform: 'translateX(30px)',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: 'var(--ui-device-lens)',
                                zIndex: 11
                            }}
                        />
                        <iframe
                            id="preview-iframe"
                            key={reloadKey}
                            title="Live Preview"
                            src={`/e/${eventId}${previewTab}?t=${reloadKey}`}
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                        />
                    </div>

                    <a
                        href={`/e/${eventId}${previewTab}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: '0.7rem', color: '#334155', fontSize: '0.85rem', display: 'inline-flex', gap: 5, alignItems: 'center' }}
                    >
                        새 탭에서 열기
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {isEnlargedPreviewOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <button
                        onClick={() => setIsEnlargedPreviewOpen(false)}
                        style={{
                            position: 'absolute',
                            top: 24,
                            right: 24,
                            border: 'none',
                            background: 'transparent',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                        aria-label="닫기"
                    >
                        <X size={40} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {PREVIEW_TABS.map((tab) => (
                                <button
                                    key={tab.path}
                                    onClick={() => setPreviewTab(tab.path)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem',
                                        fontWeight: previewTab === tab.path ? 700 : 400,
                                        backgroundColor: previewTab === tab.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                                        color: previewTab === tab.path ? '#fff' : 'rgba(255,255,255,0.55)',
                                        border: previewTab === tab.path ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div
                            style={{
                                width: 393,
                                height: 852,
                                border: `12px solid ${deviceFrameColor}`,
                                borderRadius: 44,
                                overflow: 'hidden',
                                position: 'relative',
                                background: deviceFrameColor,
                                boxShadow: '0 32px 70px rgba(0,0,0,0.45)',
                                zoom: Math.min(1.8, (window.innerHeight - 48) / 852)
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 120,
                                    height: 35,
                                    borderRadius: 18,
                                    background: deviceFrameColor,
                                    zIndex: 10
                                }}
                            />
                            <iframe
                                key={`large-${reloadKey}`}
                                title="Large Preview"
                                src={`/e/${eventId}${previewTab}?t=${reloadKey}`}
                                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    position: 'fixed',
                    right: 22,
                    bottom: 22,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0.6rem 0.8rem',
                    borderRadius: 12,
                    background: isDirty ? '#7f1d1d' : '#0f766e',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.2)'
                }}
            >
                <Clock3 size={14} />
                {isDirty ? '미저장 상태' : '저장됨'}
            </div>
        </div>
    );
};

export default ManageEvent;
