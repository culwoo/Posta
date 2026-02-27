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
import classes from './DashboardFeature.module.css';

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

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
        if (selectedFile) {
            return URL.createObjectURL(selectedFile);
        }
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
        <div className={classes.page}>
            <div className={classes.headerRow}>
                <div className={classes.titleBlock}>
                    <h2>설정</h2>
                    <p>호스트 프로필과 이벤트 기본 결제값을 관리합니다.</p>
                </div>
                <div className={classes.actionRow}>
                    <button className={classes.btnPrimary} onClick={handleSave} disabled={saving || loading}>
                        <Save size={15} /> {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>

            {error && <div className={classes.error}>{error}</div>}
            {success && <div className={classes.panel}>{success}</div>}

            {loading ? (
                <div className={classes.loading}>불러오는 중...</div>
            ) : (
                <div className={classes.split}>
                    <div className={classes.panel}>
                        <h3 className={classes.panelTitle}>프로필</h3>
                        <p className={classes.panelHint}>대시보드에 표시되는 기본 프로필 정보입니다.</p>

                        <div className={classes.profileRow} style={{ marginTop: '1rem' }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="profile" className={classes.avatar} />
                            ) : (
                                <div className={classes.avatarFallback}>No Image</div>
                            )}
                            <div>
                                <input
                                    className={classes.fileInput}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSelectFile}
                                />
                                <div className={classes.inlineNote}>이미지 파일만 가능 (최대 5MB)</div>
                                <button
                                    type="button"
                                    className={classes.btnDanger}
                                    style={{ marginTop: '0.5rem' }}
                                    onClick={handleMarkImageRemoval}
                                >
                                    <Trash2 size={15} /> 이미지 제거
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <label className={classes.panelHint}>이름</label>
                            <input
                                className={classes.field}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="호스트 이름"
                            />
                        </div>

                        <div style={{ marginTop: '0.8rem' }}>
                            <label className={classes.panelHint}>소개글</label>
                            <textarea
                                className={classes.textarea}
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                placeholder="간단한 소개를 입력해주세요."
                            />
                        </div>
                    </div>

                    <div className={classes.panel}>
                        <h3 className={classes.panelTitle}>기본 결제값</h3>
                        <p className={classes.panelHint}>새 이벤트 생성 시 자동으로 기본값으로 채워집니다.</p>

                        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.7rem' }}>
                            <div>
                                <label className={classes.panelHint}>은행명</label>
                                <input
                                    className={classes.field}
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={classes.panelHint}>계좌번호</label>
                                <input
                                    className={classes.field}
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={classes.panelHint}>예금주</label>
                                <input
                                    className={classes.field}
                                    value={accountHolder}
                                    onChange={(e) => setAccountHolder(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={classes.panelHint}>기본 예매가</label>
                                <input
                                    className={classes.field}
                                    value={ticketPrice}
                                    onChange={(e) => setTicketPrice(e.target.value)}
                                    placeholder="예: 15000"
                                />
                            </div>
                            <div>
                                <label className={classes.panelHint}>기본 현장가</label>
                                <input
                                    className={classes.field}
                                    value={onsitePrice}
                                    onChange={(e) => setOnsitePrice(e.target.value)}
                                    placeholder="예: 20000"
                                />
                            </div>
                        </div>

                        <div className={classes.inlineNote} style={{ marginTop: '0.75rem' }}>
                            이 값들은 기존 이벤트를 자동 변경하지 않으며, 신규 생성 이벤트에만 적용됩니다.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsDashboard;
