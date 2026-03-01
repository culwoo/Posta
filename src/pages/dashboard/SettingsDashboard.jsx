import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import {
    auth,
    db,
    storage,
    doc,
    getDoc,
    setDoc,
    updateProfile,
    storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const glassInputStyle = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: 'var(--ui-surface-soft)',
    border: '1px solid var(--ui-border-soft)',
    borderTop: '1px solid var(--ui-border-strong)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-main)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 500,
    fontSize: '0.82rem',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-main)',
};

const parseStoragePathFromUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    try {
        const marker = '/o/';
        const markerIndex = url.indexOf(marker);
        if (markerIndex < 0) return '';
        const encodedPath = url.slice(markerIndex + marker.length).split('?')[0];
        return decodeURIComponent(encodedPath);
    } catch {
        return '';
    }
};

const SettingsDashboard = () => {
    const { user, updateOrganizerName } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [displayName, setDisplayName] = useState('');
    const [intro, setIntro] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [originalProfileImageUrl, setOriginalProfileImageUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);

    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [ticketPrice, setTicketPrice] = useState('');
    const [onsitePrice, setOnsitePrice] = useState('');

    const previewUrl = useMemo(() => {
        if (selectedFile) return URL.createObjectURL(selectedFile);
        return profileImageUrl;
    }, [selectedFile, profileImageUrl]);

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const loadSettings = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        setError('');
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            const data = snap.exists() ? snap.data() : {};
            const settings = data?.settings || {};
            const profile = settings?.profile || {};
            const defaults = settings?.defaults?.payment || {};

            setDisplayName(data?.name || user.name || '');
            setIntro(profile?.intro || '');
            setProfileImageUrl(profile?.profileImageUrl || '');
            setOriginalProfileImageUrl(profile?.profileImageUrl || '');
            setBankName(defaults?.bankName || '');
            setAccountNumber(defaults?.accountNumber || '');
            setAccountHolder(defaults?.accountHolder || '');
            setTicketPrice(defaults?.ticketPrice || '');
            setOnsitePrice(defaults?.onsitePrice || '');
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('설정 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [user?.uid, user?.name]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSelectFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > MAX_PROFILE_IMAGE_SIZE) {
            setError('프로필 이미지는 5MB 이하만 허용됩니다.');
            return;
        }
        setError('');
        setSelectedFile(file);
        setRemoveImage(false);
    };

    const handleMarkImageRemoval = () => {
        setRemoveImage(true);
        setSelectedFile(null);
        setProfileImageUrl('');
    };

    const deleteOldProfileImageIfNeeded = async (nextImageUrl) => {
        const oldPath = parseStoragePathFromUrl(originalProfileImageUrl);
        if (!oldPath) return;
        const nextPath = parseStoragePathFromUrl(nextImageUrl);
        if (nextPath === oldPath) return;
        try {
            await deleteObject(storageRef(storage, oldPath));
        } catch (err) {
            console.warn('Old profile image delete failed:', err);
        }
    };

    const handleSave = async () => {
        if (!user?.uid || saving) return;
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            let nextImageUrl = removeImage ? '' : profileImageUrl;

            if (selectedFile) {
                const extension = selectedFile.name.split('.').pop() || 'jpg';
                const sanitizedExt = String(extension).replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
                const path = `users/${user.uid}/profile/${Date.now()}.${sanitizedExt}`;
                const ref = storageRef(storage, path);
                await uploadBytes(ref, selectedFile);
                nextImageUrl = await getDownloadURL(ref);
            }

            const nameToSave = (displayName || '').trim() || user.name || 'Creator';
            const payload = {
                name: nameToSave,
                settings: {
                    profile: {
                        intro: intro.trim(),
                        profileImageUrl: nextImageUrl || ''
                    },
                    defaults: {
                        payment: {
                            bankName: bankName.trim(),
                            accountNumber: accountNumber.trim(),
                            accountHolder: accountHolder.trim(),
                            ticketPrice: String(ticketPrice || '').trim(),
                            onsitePrice: String(onsitePrice || '').trim()
                        }
                    }
                },
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', user.uid), payload, { merge: true });

            if (auth.currentUser && auth.currentUser.displayName !== nameToSave) {
                await updateProfile(auth.currentUser, { displayName: nameToSave });
            }
            if (typeof updateOrganizerName === 'function') {
                updateOrganizerName(nameToSave);
            }

            await deleteOldProfileImageIfNeeded(nextImageUrl);

            setProfileImageUrl(nextImageUrl || '');
            setOriginalProfileImageUrl(nextImageUrl || '');
            setSelectedFile(null);
            setRemoveImage(false);
            setSuccess('설정이 저장되었습니다.');
        } catch (err) {
            console.error('Failed to save settings:', err);
            setError('저장에 실패했습니다. 입력값 또는 네트워크 상태를 확인해주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        fontFamily: 'var(--font-main)',
                        color: 'var(--text-primary)',
                    }}>
                        설정
                    </h2>
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                        호스트 프로필과 이벤트 기본 결제값을 관리합니다.
                    </p>
                </div>
                <GlassButton variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
                    <Save size={15} /> {saving ? '저장 중...' : '저장'}
                </GlassButton>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(255, 71, 87, 0.08)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(255, 71, 87, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            {success && (
                <GlassCard level={1} style={{ padding: '0.75rem', color: 'var(--success-color)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                    {success}
                </GlassCard>
            )}

            {loading ? (
                <div style={{ color: 'var(--text-tertiary)', padding: '2rem 0', fontFamily: 'var(--font-main)' }}>불러오는 중...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }} className="settings-split">
                    {/* Profile Panel */}
                    <GlassCard level={1} style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                            프로필
                        </h3>
                        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                            대시보드에 표시되는 기본 프로필 정보입니다.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1.2rem' }}>
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="profile"
                                    style={{
                                        width: '84px', height: '84px',
                                        borderRadius: '999px',
                                        border: '2px solid var(--ui-border-soft)',
                                        background: 'var(--ui-surface-soft)',
                                        objectFit: 'cover',
                                        boxShadow: '0 4px 16px var(--ui-scrim)',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '84px', height: '84px',
                                    borderRadius: '999px',
                                    border: '2px solid var(--ui-border-soft)',
                                    background: 'var(--ui-surface-soft)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-tertiary)', fontWeight: 700,
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.75rem',
                                    flexShrink: 0,
                                }}>
                                    No Image
                                </div>
                            )}
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSelectFile}
                                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-main)' }}
                                />
                                <div style={{ marginTop: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'var(--font-main)' }}>
                                    이미지 파일만 가능 (최대 5MB)
                                </div>
                                <GlassButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkImageRemoval}
                                    style={{ marginTop: '0.5rem', color: 'rgba(255,107,107,0.8)', fontSize: '0.82rem' }}
                                >
                                    <Trash2 size={14} /> 이미지 제거
                                </GlassButton>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.2rem' }}>
                            <label style={labelStyle}>이름</label>
                            <input
                                style={glassInputStyle}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="호스트 이름"
                            />
                        </div>

                        <div style={{ marginTop: '0.8rem' }}>
                            <label style={labelStyle}>소개글</label>
                            <textarea
                                style={{
                                    ...glassInputStyle,
                                    minHeight: '100px',
                                    resize: 'vertical',
                                }}
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                placeholder="간단한 소개를 입력해주세요."
                            />
                        </div>
                    </GlassCard>

                    {/* Payment Defaults Panel */}
                    <GlassCard level={1} style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, fontFamily: 'var(--font-main)', letterSpacing: '-0.02em' }}>
                            기본 결제값
                        </h3>
                        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                            새 이벤트 생성 시 자동으로 기본값으로 채워집니다.
                        </p>

                        <div style={{ marginTop: '1.2rem', display: 'grid', gap: '0.8rem' }}>
                            <div>
                                <label style={labelStyle}>은행명</label>
                                <input style={glassInputStyle} value={bankName} onChange={(e) => setBankName(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>계좌번호</label>
                                <input style={glassInputStyle} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>예금주</label>
                                <input style={glassInputStyle} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>기본 예매가</label>
                                <input style={glassInputStyle} value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} placeholder="예: 15000" />
                            </div>
                            <div>
                                <label style={labelStyle}>기본 현장가</label>
                                <input style={glassInputStyle} value={onsitePrice} onChange={(e) => setOnsitePrice(e.target.value)} placeholder="예: 20000" />
                            </div>
                        </div>

                        <div style={{ marginTop: '0.8rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'var(--font-main)' }}>
                            이 값들은 기존 이벤트를 자동 변경하지 않으며, 신규 생성 이벤트에만 적용됩니다.
                        </div>
                    </GlassCard>
                </div>
            )}

            <style>{`
                @media (max-width: 900px) {
                    .settings-split { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 768px) {
                    .settings-split { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default SettingsDashboard;
