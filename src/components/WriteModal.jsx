import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, updateDoc, orderBy } from '../api/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { X } from 'lucide-react';
import classes from './WriteModal.module.css';

const POST_COLORS = ['#FFF9B0', '#FFC4C4', '#C4F0FF', '#C4FFD6', '#E2C4FF'];

const WriteModal = ({ onClose, postToEdit = null }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [performers, setPerformers] = useState([]);
    const [selectedColor, setSelectedColor] = useState(POST_COLORS[0]);

    // Privacy Settings
    const [isPublic, setIsPublic] = useState(true);
    const [selectedPerformers, setSelectedPerformers] = useState([]); // Array of IDs

    const { eventId } = useEvent();

    useEffect(() => {
        if (!eventId) return;
        const fetchPerformers = async () => {
            try {
                const q = query(collection(db, "events", eventId, "performers"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPerformers(list);
            } catch (err) {
                console.error("Failed to fetch performers:", err);
            }
        };
        fetchPerformers();
    }, [eventId]);

    // Initialize state if editing
    useEffect(() => {
        if (postToEdit) {
            setContent(postToEdit.content || '');
            setSelectedColor(postToEdit.color || POST_COLORS[0]);
            setIsPublic(postToEdit.isPublic);

            // Reconstruct selected performers from user.uid + visibleTo
            // visibleTo = [authorUid, p1, p2...]
            // So we allow those in visibleTo that are NOT author
            if (!postToEdit.isPublic && postToEdit.visibleTo) {
                const pList = postToEdit.visibleTo.filter(uid => uid !== postToEdit.fromUid);
                setSelectedPerformers(pList);
            }
        }
    }, [postToEdit]);

    const handleTogglePerformer = (uid) => {
        if (selectedPerformers.includes(uid)) {
            setSelectedPerformers(selectedPerformers.filter(id => id !== uid));
        } else {
            setSelectedPerformers([...selectedPerformers, uid]);
        }
    };

    const handlePublicChange = (e) => {
        setIsPublic(e.target.checked);
        if (e.target.checked) {
            setSelectedPerformers([]); // Reset selection if public
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (!eventId) {
            alert("이벤트 정보가 없습니다.");
            return;
        }

        // Get names of selected performers for display purposes
        const toNames = isPublic
            ? []
            : performers.filter(p => selectedPerformers.includes(p.uid)).map(p => p.name);

        if (!isPublic && selectedPerformers.length === 0) {
            alert("비공개 메시지를 보낼 공연진을 최소 한 명 선택해주세요.");
            return;
        }

        try {
            const postData = {
                content: content,
                isPublic: isPublic,
                visibleTo: isPublic ? [] : [user?.uid, ...selectedPerformers].filter(Boolean), // Author + Selected
                toNames: toNames,
                color: selectedColor,
                // Do not update createdAt on edit, or maybe update `updatedAt`?
                // Let's leave clear logic: addDoc vs updateDoc
            };

            if (postToEdit) {
                await updateDoc(doc(db, "events", eventId, "posts", postToEdit.id), postData);
            } else {
                // New Post
                await addDoc(collection(db, "events", eventId, "posts"), {
                    ...postData,
                    from: user?.name || '익명',
                    fromUid: user?.uid || 'anonymous',
                    createdAt: new Date().toISOString()
                });
            }

            onClose();
        } catch (err) {
            console.error("Error writing post:", err);
            alert("글 저장 실패");
        }
    };

    return (
        <div className={classes.overlay}>
            <div className={classes.modal}>
                <div className={classes.header}>
                    <h3>{postToEdit ? '응원 메시지 수정하기' : '응원 메시지 남기기'}</h3>
                    <button onClick={onClose} className={classes.closeBtn}><X /></button>
                </div>

                <form onSubmit={handleSubmit} className={classes.form}>
                    <textarea
                        className={classes.textarea}
                        placeholder="따뜻한 응원의 한마디를 남겨주세요!"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{ backgroundColor: selectedColor }}
                        required
                    />

                    <div className={classes.colorPicker}>
                        {POST_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={`${classes.colorBtn} ${selectedColor === color ? classes.selected : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            />
                        ))}
                    </div>

                    <div className={classes.privacySection}>
                        <label className={classes.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={handlePublicChange}
                            />
                            전체 공개 (모두가 볼 수 있어요)
                        </label>

                        {!isPublic && (
                            <div className={classes.performerList}>
                                <p className={classes.helperText}>누구에게 보낼까요? (작성자와 선택된 분만 볼 수 있어요)</p>
                                {performers.map(p => (
                                    <label key={p.id} className={classes.performerTag}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPerformers.includes(p.id)}
                                            onChange={() => handleTogglePerformer(p.id)}
                                        />
                                        {p.name}
                                    </label>
                                ))}
                                {performers.length === 0 && <p className={classes.emptyText}>등록된 공연진이 아직 없습니다.</p>}
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
