import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, db, doc, getDocs, orderBy, query, updateDoc } from '../api/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { Check, X } from 'lucide-react';
import classes from './WriteModal.module.css';

const POST_COLORS = [
    { hex: '#FFF9B0', name: '버터 옐로우' },
    { hex: '#FFC4C4', name: '코랄 핑크' },
    { hex: '#C4F0FF', name: '스카이 블루' },
    { hex: '#C4FFD6', name: '민트 그린' },
    { hex: '#E2C4FF', name: '라벤더' }
];

const toRgb = (hex) => {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
};

const getContrastText = (hex) => {
    const { r, g, b } = toRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? '#1f2937' : '#f8fafc';
};

const withAlpha = (hex, alpha) => {
    const { r, g, b } = toRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const WriteModal = ({ onClose, postToEdit = null }) => {
    const { user } = useAuth();
    const { eventId } = useEvent();

    const [content, setContent] = useState('');
    const [performers, setPerformers] = useState([]);
    const [selectedColor, setSelectedColor] = useState(POST_COLORS[0].hex);
    const [isPublic, setIsPublic] = useState(true);
    const [selectedPerformers, setSelectedPerformers] = useState([]);

    const textColor = useMemo(() => getContrastText(selectedColor), [selectedColor]);
    const placeholderColor = useMemo(() => withAlpha(textColor, 0.55), [textColor]);
    const panelBorderColor = useMemo(() => withAlpha(textColor, 0.18), [textColor]);

    useEffect(() => {
        if (!eventId) return;
        const fetchPerformers = async () => {
            try {
                const performerQuery = query(collection(db, 'events', eventId, 'performers'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(performerQuery);
                const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
                setPerformers(list);
            } catch (error) {
                console.error('Failed to fetch performers:', error);
            }
        };
        fetchPerformers();
    }, [eventId]);

    useEffect(() => {
        if (!postToEdit) return;
        setContent(postToEdit.content || '');
        setSelectedColor(postToEdit.color || POST_COLORS[0].hex);
        setIsPublic(postToEdit.isPublic);
        if (!postToEdit.isPublic && Array.isArray(postToEdit.visibleTo)) {
            const visible = postToEdit.visibleTo.filter((uid) => uid !== postToEdit.fromUid);
            setSelectedPerformers(visible);
        }
    }, [postToEdit]);

    const handleTogglePerformer = (uid) => {
        setSelectedPerformers((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
    };

    const handlePublicChange = (event) => {
        const checked = event.target.checked;
        setIsPublic(checked);
        if (checked) setSelectedPerformers([]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!content.trim()) return;
        if (!eventId) {
            alert('이벤트 정보를 찾을 수 없습니다.');
            return;
        }

        if (!isPublic && selectedPerformers.length === 0) {
            alert('비공개 메시지는 최소 1명 이상의 공연진을 선택해주세요.');
            return;
        }

        const toNames = isPublic
            ? []
            : performers
                .filter((performer) => selectedPerformers.includes(performer.id))
                .map((performer) => performer.boardDisplayName || performer.name)
                .filter(Boolean);

        const authorName =
            user?.role === 'performer'
                ? user?.boardDisplayName || user?.name || '익명'
                : user?.name || '익명';

        const postData = {
            content: content.trim(),
            isPublic,
            visibleTo: isPublic ? [] : [user?.uid, ...selectedPerformers].filter(Boolean),
            toNames,
            color: selectedColor
        };

        try {
            if (postToEdit) {
                await updateDoc(doc(db, 'events', eventId, 'posts', postToEdit.id), postData);
            } else {
                await addDoc(collection(db, 'events', eventId, 'posts'), {
                    ...postData,
                    from: authorName,
                    fromUid: user?.uid || 'anonymous',
                    createdAt: new Date().toISOString()
                });
            }
            onClose();
        } catch (error) {
            console.error('Error writing post:', error);
            alert('응원글 저장에 실패했습니다.');
        }
    };

    return (
        <div className={classes.overlay}>
            <div className={classes.modal}>
                <div className={classes.header}>
                    <h3>{postToEdit ? '응원 메시지 수정' : '응원 메시지 남기기'}</h3>
                    <button onClick={onClose} className={classes.closeBtn} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={classes.form}>
                    <textarea
                        className={classes.textarea}
                        placeholder="마음 담긴 응원의 한마디를 남겨주세요."
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        style={{
                            backgroundColor: selectedColor,
                            color: textColor,
                            borderColor: panelBorderColor,
                            ['--placeholder-color']: placeholderColor
                        }}
                        required
                    />

                    <div className={classes.colorPicker}>
                        {POST_COLORS.map((color) => {
                            const active = selectedColor === color.hex;
                            return (
                                <button
                                    key={color.hex}
                                    type="button"
                                    className={`${classes.colorBtn} ${active ? classes.selected : ''}`}
                                    onClick={() => setSelectedColor(color.hex)}
                                    aria-label={`${color.name} 선택`}
                                >
                                    <span className={classes.colorDot} style={{ backgroundColor: color.hex }} />
                                    <span className={classes.colorName}>{color.name}</span>
                                    {active && <Check size={14} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className={classes.privacySection}>
                        <label className={classes.checkboxLabel}>
                            <input type="checkbox" checked={isPublic} onChange={handlePublicChange} />
                            전체 공개 (모두에게 보입니다)
                        </label>

                        {!isPublic && (
                            <div className={classes.performerList}>
                                <p className={classes.helperText}>누구에게 보낼까요? (작성자 + 선택 공연진만 볼 수 있어요)</p>
                                {performers.map((performer) => (
                                    <label key={performer.id} className={classes.performerTag}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPerformers.includes(performer.id)}
                                            onChange={() => handleTogglePerformer(performer.id)}
                                        />
                                        {performer.boardDisplayName || performer.name}
                                    </label>
                                ))}
                                {performers.length === 0 && <p className={classes.emptyText}>등록된 공연진이 없습니다.</p>}
                            </div>
                        )}
                    </div>

                    <button type="submit" className={classes.submitBtn}>
                        {postToEdit ? '수정 완료' : '게시판에 붙이기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WriteModal;
