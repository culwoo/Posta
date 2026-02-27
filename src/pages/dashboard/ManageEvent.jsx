import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, deleteDoc, storage, storageRef, uploadBytes, getDownloadURL } from '../../api/firebase';
import { ArrowLeft, Save, Trash2, Upload, ExternalLink, Maximize2, X } from 'lucide-react';
import AIProgressTimer from '../../components/AIProgressTimer';

const ManageEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [extractingColors, setExtractingColors] = useState(false);

    // 아이폰 미리보기용 scale
    const [previewScale, setPreviewScale] = useState(1);

    useEffect(() => {
        const calculateScale = () => {
            // 헤더, 탭 버튼, 여백 등(약 200px)을 제외한 화면 높이 기준
            const availableHeight = window.innerHeight - 200;
            // 아이폰 14 Pro 원본 높이 852px 대비 비율 
            const scale = Math.min(1, availableHeight / 852);
            setPreviewScale(scale);
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);
    const [setlist, setSetlist] = useState([]);
    const [timeline, setTimeline] = useState([]); // 타임라인 상태 추가

    // Preview
    const [previewTab, setPreviewTab] = useState('');
    const [reloadKey, setReloadKey] = useState(Date.now());
    const [isEnlargedPreviewOpen, setIsEnlargedPreviewOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [posterUrl, setPosterUrl] = useState('');

    // Payment info
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [ticketPrice, setTicketPrice] = useState('');
    const [onsitePrice, setOnsitePrice] = useState('');
    const [isFreeEvent, setIsFreeEvent] = useState(false);

    // Theme colors (full palette)
    const [primaryColor, setPrimaryColor] = useState('#d04c31');
    const [secondaryColor, setSecondaryColor] = useState('#f6c458');
    const [bgColor, setBgColor] = useState('#131011');
    const [bgSecondaryColor, setBgSecondaryColor] = useState('#3e3a39');
    const [textColor, setTextColor] = useState('#efefef');
    const [accentColor, setAccentColor] = useState('#f6c458');

    // Live Preview용 즉각 테마 반영 로컬 저장소 및 postMessage
    useEffect(() => {
        const themeUpdate = {
            primary: primaryColor,
            secondary: secondaryColor,
            bgPrimary: bgColor,
            bgSecondary: bgSecondaryColor,
            textPrimary: textColor,
            accent: accentColor
        };
        sessionStorage.setItem(`preview_theme_${eventId}`, JSON.stringify(themeUpdate));

        const iframe = document.getElementById('preview-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'previewThemeUpdate', theme: themeUpdate }, '*');
        }
    }, [primaryColor, secondaryColor, bgColor, bgSecondaryColor, textColor, accentColor, eventId]);

    useEffect(() => {
        const fetchEvent = async () => {

            try {
                const docSnap = await getDoc(doc(db, "events", eventId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEventData(data);
                    setTitle(data.title || '');
                    setDate(data.date || '');
                    setTime(data.time || '');
                    setLocation(data.location || '');
                    setAddress(data.address || '');
                    setPosterUrl(data.posterUrl || '');
                    setSetlist(data.setlist || []);
                    setTimeline(data.timeline || [
                        { id: '1', time: '18:30', title: '관객 입장', icon: 'door' },
                        { id: '2', time: '19:00', title: '1부 공연 시작', icon: 'music' },
                        { id: '3', time: '20:00', title: 'Intermission', icon: 'coffee' },
                        { id: '4', time: '20:10', title: '2부 공연 시작', icon: 'flame' }
                    ]);
                    // Payment
                    setBankName(data.payment?.bankName || '');
                    setAccountNumber(data.payment?.accountNumber || '');
                    setAccountHolder(data.payment?.accountHolder || '');
                    setTicketPrice(data.payment?.ticketPrice || '');
                    setOnsitePrice(data.payment?.onsitePrice || '');
                    setIsFreeEvent(data.payment?.isFreeEvent || false);
                    // Theme (full palette)
                    setPrimaryColor(data.theme?.primary || '#d04c31');
                    setSecondaryColor(data.theme?.secondary || '#f6c458');
                    setBgColor(data.theme?.bgPrimary || '#131011');
                    setBgSecondaryColor(data.theme?.bgSecondary || '#3e3a39');
                    setTextColor(data.theme?.textPrimary || '#efefef');
                    setAccentColor(data.theme?.accent || '#f6c458');
                } else {
                    alert("이벤트를 찾을 수 없습니다.");
                }
            } catch (e) {
                console.error("Error loading event:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Remove slug logic here since slug is now the eventId (docId) and cannot be changed
            await updateDoc(doc(db, "events", eventId), {
                title,
                date,
                time,
                location,
                address,
                posterUrl,
                setlist: setlist.filter(item => item.title.trim() !== ''), // 빈 제목 필터링
                timeline: timeline.filter(item => item.title.trim() !== ''),
                payment: {
                    isFreeEvent,
                    bankName,
                    accountNumber,
                    accountHolder,
                    ticketPrice,
                    onsitePrice,
                },
                theme: {
                    primary: primaryColor,
                    secondary: secondaryColor,
                    bgPrimary: bgColor,
                    bgSecondary: bgSecondaryColor,
                    textPrimary: textColor,
                    accent: accentColor,
                }
            });
            alert(`저장되었습니다.`);

            // 미리보기 iframe 새로고침
            setReloadKey(Date.now());
        } catch (e) {
            console.error("Error saving event:", e);
            alert("저장 실패");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`"${title}" 이벤트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        if (!window.confirm("정말로 삭제하시겠습니까? 모든 예약 데이터도 함께 삭제됩니다.")) return;
        try {
            await deleteDoc(doc(db, "events", eventId));
            alert("이벤트가 삭제되었습니다.");
            navigate('/dashboard');
        } catch (e) {
            console.error("Error deleting event:", e);
            alert("삭제 실패");
        }
    };

    const handlePosterUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            alert("이미지 파일만 업로드 가능합니다.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert("10MB 이하의 파일만 업로드 가능합니다.");
            return;
        }

        setUploading(true);
        let uploadedUrl = null;
        try {
            const ext = file.name.split('.').pop();
            const path = `events/${eventId}/poster.${ext}`;
            const ref = storageRef(storage, path);
            await uploadBytes(ref, file);
            uploadedUrl = await getDownloadURL(ref);
            setPosterUrl(uploadedUrl);

            // Auto-save poster URL
            await updateDoc(doc(db, "events", eventId), { posterUrl: uploadedUrl });
            alert("포스터가 업로드되었습니다!");
        } catch (err) {
            console.error("Upload failed:", err);
            // Firebase Storage 실패 시 로컬 미리보기라도 설정
            const localUrl = URL.createObjectURL(file);
            setPosterUrl(localUrl);
            alert("Firebase Storage 업로드에 실패했습니다.\n포스터 URL을 직접 입력하거나 Firebase Console에서 Storage를 활성화해주세요.\n\n색상 추출은 로컬 파일에서 수행 가능합니다.");
        } finally {
            setUploading(false);
            setReloadKey(Date.now());
        }

        // Ask about color extraction (using file directly to avoid CORS)
        if (window.confirm("포스터에서 테마 색상을 자동 추출하시겠습니까?")) {
            extractColorsFromFile(file);
        }
    };

    // File 객체에서 직접 색상 추출 (CORS 문제 회피)
    const extractColorsFromFile = async (file) => {
        setExtractingColors(true);
        try {
            const base64 = await fileToBase64(file);
            await callGeminiForColors(base64);
        } catch (err) {
            console.error("Color extraction failed:", err);
            alert("색상 추출 실패: " + err.message);
        } finally {
            setExtractingColors(false);
        }
    };

    // File -> resized base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 512;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    resolve(base64);
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // URL에서 색상 추출 (포스터에서 추출 버튼 클릭 시)
    const extractColorsFromPoster = async (imageUrl) => {
        setExtractingColors(true);
        try {
            // Fetch image and convert to base64
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // Use canvas to resize and get base64
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const loadPromise = new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            img.src = URL.createObjectURL(blob);
            await loadPromise;

            const canvas = document.createElement('canvas');
            const maxSize = 512;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

            await callGeminiForColors(base64);
        } catch (err) {
            console.error("Color extraction failed:", err);
            alert("색상 추출 실패: " + err.message + "\n\n팁: 파일 업로드로 색상을 추출하거나, 수동으로 설정해주세요.");
        } finally {
            setExtractingColors(false);
        }
    };

    // Gemini API 호출 (공통)
    const callGeminiForColors = async (base64) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            alert("Gemini API 키가 설정되지 않았습니다. .env에 VITE_GEMINI_API_KEY를 추가해주세요.");
            return;
        }

        const prompt = `
Analyze this poster image and extract a cohesive 5-color web theme palette.
Return ONLY a JSON object with these keys:
{
  "primary": "Main brand color (vibrant, for buttons/highlights)",
  "secondary": "Secondary accent color",
  "bgPrimary": "Main background color (very dark for dark mode or very light for light mode)",
  "bgSecondary": "Secondary background color (slightly lighter/darker than main bg)",
  "textPrimary": "Main text color (high contrast with bgPrimary)"
}

Constraints:
1. "primary" should be vibrant but not eye-straining. Adjust saturation if needed.
2. "bgPrimary" should be derived from the poster's darkest/lightest areas but suitable for a web background (e.g., #1a1a1a rather than pure black if the poster is dark).
3. "textPrimary" must be readable on "bgPrimary".
4. "secondary" is for less important accents.
5. Return ONLY valid hex codes (e.g., #RRGGBB).
        `;

        // Try models in order: Best quality pro first -> flash fallbacks
        const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let geminiData = null;

        for (const model of models) {
            try {
                console.log(`Trying color extraction with model: ${model}`);
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                                    { text: prompt }
                                ]
                            }]
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Check if candidate exists
                    if (data.candidates && data.candidates.length > 0) {
                        geminiData = data;
                        console.log(`Successfully extracted colors using ${model}`);
                        break;
                    }
                } else {
                    console.warn(`Model ${model} failed with status ${response.status}`);
                }
            } catch (e) {
                console.error(`Error with model ${model}:`, e);
            }
        }

        if (!geminiData) {
            alert('색상 추출에 실패했습니다. (모든 모델 시도 실패)');
            return;
        }

        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/); // Match JSON across lines
        if (jsonMatch) {
            try {
                const colors = JSON.parse(jsonMatch[0]);

                if (colors.primary) setPrimaryColor(colors.primary);
                if (colors.secondary) {
                    setSecondaryColor(colors.secondary);
                    setAccentColor(colors.secondary);
                }
                if (colors.bgPrimary) setBgColor(colors.bgPrimary);
                if (colors.bgSecondary) setBgSecondaryColor(colors.bgSecondary);
                if (colors.textPrimary) setTextColor(colors.textPrimary);

                alert(`🎨 테마 색상이 추출되었습니다!\n\nPrimary: ${colors.primary}\nBackground: ${colors.bgPrimary}\n\n저장 버튼을 눌러(업데이트 완료 후) 반영 확인 가능합니다.`);
            } catch (e) {
                console.error("JSON parse error:", e);
                alert("색상 정보를 해석하는데 실패했습니다.");
            }
        } else {
            console.error("No JSON found in response:", text);
            alert("색상 추출에 실패했습니다. (응답 형식 오류)");
        }
    };

    const addSetlistSong = () => {
        setSetlist([...setlist, { id: Date.now().toString(), type: 'song', title: '', artist: '' }]);
    };

    const addSetlistFrame = () => {
        setSetlist([...setlist, { id: Date.now().toString(), type: 'frame', title: '1부' }]);
    };

    // 타임라인 관련 함수
    const addTimelineItem = () => {
        setTimeline([...timeline, { id: Date.now().toString(), time: '', title: '', icon: 'music' }]);
    };
    const updateTimelineItem = (id, field, value) => {
        setTimeline(timeline.map(item => item.id === id ? { ...item, [field]: value } : item));
    };
    const removeTimelineItem = (id) => {
        setTimeline(timeline.filter(item => item.id !== id));
    };
    const moveTimelineItem = (index, direction) => {
        if (index + direction < 0 || index + direction >= timeline.length) return;
        const newList = [...timeline];
        const temp = newList[index];
        newList[index] = newList[index + direction];
        newList[index + direction] = temp;
        setTimeline(newList);
    };

    const updateSetlistItem = (id, field, value) => {
        setSetlist(setlist.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeSetlistItem = (id) => {
        setSetlist(setlist.filter(item => item.id !== id));
    };

    // Drag and drop for setlist (simplified swapping for now)
    const moveSetlistItem = (index, direction) => {
        if (index + direction < 0 || index + direction >= setlist.length) return;
        const newList = [...setlist];
        const temp = newList[index];
        newList[index] = newList[index + direction];
        newList[index + direction] = temp;
        setSetlist(newList);
    };

    if (loading) return <div>Loading...</div>;

    const inputStyle = { width: '100%', padding: '0.5rem', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: '500' };
    const cardStyle = { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' };
    const sectionGap = { display: 'flex', flexDirection: 'column', gap: '1rem' };

    return (
        <div>
            <AIProgressTimer
                active={extractingColors}
                title="AI 테마 색상 추출 중"
                icon="🎨"
                estimatedSeconds={12}
                steps={[
                    { label: '포스터 이미지를 분석 준비 중...' },
                    { label: 'AI가 색상 팔레트를 추출 중...' },
                    { label: '테마에 적합한 색상으로 변환 중...' },
                ]}
                tips={[
                    '추출된 색상은 저장 버튼을 눌러 적용할 수 있어요.',
                    '포스터의 대표색을 기반으로 테마가 생성됩니다.',
                    '수동으로 색상을 변경할 수도 있습니다.',
                ]}
            />
            <div style={{ marginBottom: '1rem' }}>
                <Link to=".." style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', textDecoration: 'none' }}>
                    <ArrowLeft size={16} /> 목록으로 돌아가기
                </Link>
            </div>

            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem', marginBottom: '2rem',
                position: 'sticky', top: 0, zIndex: 100,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid #eee',
                margin: '0 -1rem 2rem -1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
                <h2>이벤트 관리: {title}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a
                        href={`/e/${eventId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                        <ExternalLink size={14} /> 실제 배포 페이지
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        <Save size={14} /> {saving ? '저장 중...' : '저장 (미리보기에 반영)'}
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        <Trash2 size={14} /> 삭제
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* 왼쪽 에디터 */}
                <div style={{ ...sectionGap, flex: '1 1 500px' }}>

                    {/* 포스터 및 기본 정보 */}
                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <h3 style={{ margin: 0 }}>포스터 업로드</h3>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handlePosterUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                width: '100%', padding: '0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                backgroundColor: uploading ? '#fff3e0' : '#f5f5f5',
                                border: uploading ? '2px dashed #f57c00' : '2px dashed #ccc',
                                borderRadius: '8px',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                color: uploading ? '#e65100' : '#666',
                                marginBottom: '0.5rem',
                                fontWeight: uploading ? 'bold' : 'normal',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Upload size={16} />
                            {uploading ? '⏳ 포스터 업로드 중입니다...' : '포스터 이미지 파일 업로드'}
                        </button>

                        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>테마 색상</h4>
                                {posterUrl && (
                                    <button
                                        onClick={() => extractColorsFromPoster(posterUrl)}
                                        disabled={extractingColors}
                                        style={{ padding: '0.4rem 0.8rem', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                                    >
                                        {extractingColors ? '추출 중...' : '🎨 AI 색상 추출'}
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                                <div>
                                    <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.3rem' }}>Primary (강조)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.3rem' }}>Secondary</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.3rem' }}>Background</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.3rem' }}>Text</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        <input type="text" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ margin: '1rem 0 0 0' }}>기본 정보</h3>
                        <div>
                            <label style={labelStyle}>이벤트 제목</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>날짜</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>시작 시간</label>
                                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>장소 이름</label>
                                <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="예: 홍대 웨스트브릿지" />
                            </div>
                            <div>
                                <label style={labelStyle}>상세 주소</label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="도로명/지번 주소 입력" />
                            </div>
                        </div>
                    </div>

                    {/* 셋리스트 관리 */}
                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>셋리스트 (공연 순서)</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={addSetlistFrame}
                                    style={{ padding: '0.4rem 0.8rem', backgroundColor: '#e2e8f0', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    + 프레임(1부, 2부) 추가
                                </button>
                                <button
                                    onClick={addSetlistSong}
                                    style={{ padding: '0.4rem 0.8rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    + 곡 추가
                                </button>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>관객 페이지(/info)에 보여질 순서입니다.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {setlist.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                    아직 추가된 항목이 없습니다.
                                </div>
                            ) : setlist.map((item, idx) => (
                                <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: item.type === 'frame' ? '#e2e8f0' : '#f9f9f9', padding: '0.5rem', borderRadius: '4px', borderLeft: item.type === 'frame' ? '4px solid #3b82f6' : '4px solid transparent' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <button onClick={() => moveSetlistItem(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === 0 ? '#ccc' : '#666' }}>▲</button>
                                        <button onClick={() => moveSetlistItem(idx, 1)} disabled={idx === setlist.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === setlist.length - 1 ? '#ccc' : '#666' }}>▼</button>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {item.type === 'frame' ? (
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) => updateSetlistItem(item.id, 'title', e.target.value)}
                                                placeholder="프레임 이름 (예: 1부, Intermission)"
                                                style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                                            />
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) => updateSetlistItem(item.id, 'title', e.target.value)}
                                                    placeholder="곡명 (예: 밤양갱)"
                                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={item.artist}
                                                    onChange={(e) => updateSetlistItem(item.id, 'artist', e.target.value)}
                                                    placeholder="아티스트명 (선택)"
                                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                                />
                                            </>
                                        )}
                                    </div>
                                    <button onClick={() => removeSetlistItem(item.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.5rem' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 공연 타임라인 관리 */}
                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>공연 타임라인</h3>
                            <button
                                onClick={addTimelineItem}
                                style={{ padding: '0.4rem 0.8rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                + 스케줄 추가
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {timeline.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                    아직 추가된 스케줄이 없습니다.
                                </div>
                            ) : timeline.map((item, idx) => (
                                <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <button onClick={() => moveTimelineItem(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === 0 ? '#ccc' : '#666' }}>▲</button>
                                        <button onClick={() => moveTimelineItem(idx, 1)} disabled={idx === timeline.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === timeline.length - 1 ? '#ccc' : '#666' }}>▼</button>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="time"
                                            value={item.time}
                                            onChange={(e) => updateTimelineItem(item.id, 'time', e.target.value)}
                                            style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px', width: '130px' }}
                                        />
                                        <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => updateTimelineItem(item.id, 'title', e.target.value)}
                                            placeholder="내용 (예: 관객 입장)"
                                            style={{ flex: 1, padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px', minWidth: '120px' }}
                                        />
                                        <select
                                            value={item.icon}
                                            onChange={(e) => updateTimelineItem(item.id, 'icon', e.target.value)}
                                            style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                        >
                                            <option value="door">문 (입장)</option>
                                            <option value="music">음표 (공연)</option>
                                            <option value="coffee">커피 (휴식)</option>
                                            <option value="flame">불꽃 (하이라이트)</option>
                                        </select>
                                    </div>
                                    <button onClick={() => removeTimelineItem(item.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.5rem' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 입금 정보 */}
                    <div style={{ ...cardStyle, ...sectionGap }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>결제/예약 정보</h3>
                            <div
                                onClick={() => setIsFreeEvent(!isFreeEvent)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                <span style={{ fontSize: '0.9rem', color: isFreeEvent ? '#888' : '#333', fontWeight: isFreeEvent ? 'normal' : 'bold' }}>유료 공연</span>
                                <div style={{
                                    width: '46px', height: '26px', backgroundColor: isFreeEvent ? '#4caf50' : '#cbd5e1',
                                    borderRadius: '13px', position: 'relative', transition: 'background-color 0.3s'
                                }}>
                                    <div style={{
                                        width: '22px', height: '22px', backgroundColor: '#fff', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: isFreeEvent ? '22px' : '2px', transition: 'left 0.3s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.9rem', color: isFreeEvent ? '#4caf50' : '#888', fontWeight: isFreeEvent ? 'bold' : 'normal' }}>무료 공연</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>예약 페이지에 표시될 정보입니다.</p>

                        {!isFreeEvent && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>은행명</label>
                                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle} placeholder="예: 카카오뱅크" />
                                </div>
                                <div>
                                    <label style={labelStyle}>계좌번호</label>
                                    <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} style={inputStyle} placeholder="예: 1234-56-7890" />
                                </div>
                                <div>
                                    <label style={labelStyle}>예금주</label>
                                    <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} style={inputStyle} placeholder="예: 홍길동" />
                                </div>
                                <div>
                                    <label style={labelStyle}>일반 예매가</label>
                                    <input type="text" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} style={inputStyle} placeholder="예: 5000" />
                                </div>
                            </div>
                        )}
                        {isFreeEvent && (
                            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '0.9rem', marginTop: '1rem' }}>
                                ℹ️ 무료 공연으로 설정되어 관객은 계좌 입금 단계 없이 예매가 즉시 마무리됩니다. 현장 결제 정보도 노출되지 않습니다.
                            </div>
                        )}
                    </div>

                </div>

                {/* 오른쪽 휴대폰 미리보기 (Live Preview Iframe) */}
                <div style={{ flex: `0 0 ${417 * previewScale}px`, position: 'sticky', top: '6rem', height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    {/* 미리보기 탭 버튼 (미리보기 화면 전환용) */}
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.8rem', justifyContent: 'center', width: '100%', alignItems: 'center' }}>
                        {[
                            { path: '', label: '기본(홈)' },
                            { path: '/reserve', label: '예약' },
                            { path: '/onsite', label: '현장결제' },
                            { path: '/checkin', label: 'QR입장' },
                            { path: '/admin', label: '관리자' }
                        ].map(tab => (
                            <button
                                key={tab.path}
                                onClick={() => setPreviewTab(tab.path)}
                                style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.8rem',
                                    backgroundColor: previewTab === tab.path ? '#333' : '#e2e8f0',
                                    color: previewTab === tab.path ? '#fff' : '#333',
                                    border: 'none',
                                    borderRadius: '4px',
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
                                backgroundColor: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginLeft: '0.5rem'
                            }}
                        >
                            <Maximize2 size={12} />
                            크게 보기
                        </button>
                    </div>

                    <div style={{
                        width: '393px',
                        height: '852px', // iPhone 14 Pro
                        border: '12px solid #111',
                        borderRadius: '44px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#fff',
                        zoom: previewScale
                    }}>
                        {/* 스마트폰 노치 (Dynamic Island 느낌) 디자인 */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '120px',
                            height: '35px',
                            backgroundColor: '#000',
                            borderRadius: '18px',
                            zIndex: 10,
                            boxShadow: 'inset 0 0 4px rgba(255,255,255,0.1)'
                        }}></div>

                        {/* 다이나믹 아일랜드 렌즈 디테일 */}
                        <div style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(30px)', width: '12px', height: '12px', backgroundColor: '#111', borderRadius: '50%', zIndex: 11 }}></div>

                        {/* 라이브 미리보기 Iframe */}
                        <iframe
                            key={reloadKey} // key 변경 시 강제 리렌더
                            id="preview-iframe"
                            src={`/e/${eventId}${previewTab}?t=${reloadKey}`}
                            title="Live Preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Enlarged Modal Overlay */}
            {isEnlargedPreviewOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(15px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => setIsEnlargedPreviewOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '2rem', right: '3rem',
                            background: 'none', border: 'none', color: '#fff',
                            cursor: 'pointer', zIndex: 10000,
                            padding: '1rem'
                        }}
                    >
                        <X size={48} />
                    </button>

                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {/* 탭 버튼 - 아이폰이 화면 중앙에 오기 위해 탭 버튼은 스크린 좌측 공간의 중앙에 absolute로 배치 */}
                        <div style={{ position: 'fixed', right: 'min(calc(50vw + 340px), calc(100vw - 200px))', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10000, background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            {[
                                { path: '', label: '기본(홈)' },
                                { path: '/reserve', label: '예약' },
                                { path: '/onsite', label: '현장결제' },
                                { path: '/checkin', label: 'QR입장' },
                                { path: '/admin', label: '관리자' }
                            ].map(tab => (
                                <button
                                    key={`large-${tab.path}`}
                                    onClick={() => setPreviewTab(tab.path)}
                                    style={{
                                        padding: '1rem 2rem',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        backgroundColor: previewTab === tab.path ? '#fff' : 'transparent',
                                        color: previewTab === tab.path ? '#000' : '#fff',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                        width: '180px'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div style={{
                            width: '393px',
                            height: '852px', // iPhone 14 Pro
                            border: '12px solid #111',
                            borderRadius: '44px',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: '#fff',
                            zoom: Math.min(1.5, (window.innerHeight - 80) / 852) // 창 위아래 여백 살짝 두고 가득 차게
                        }}>
                            {/* 스마트폰 노치 (Dynamic Island 느낌) 디자인 */}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '120px',
                                height: '35px',
                                backgroundColor: '#000',
                                borderRadius: '18px',
                                zIndex: 10,
                                boxShadow: 'inset 0 0 4px rgba(255,255,255,0.1)'
                            }}></div>

                            {/* 라이브 미리보기 Iframe */}
                            <iframe
                                key={`large-${reloadKey}`}
                                src={`/e/${eventId}${previewTab}?t=${reloadKey}`}
                                title="Live Preview Large"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    display: 'block'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageEvent;
