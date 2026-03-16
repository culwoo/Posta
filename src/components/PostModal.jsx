import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, db, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from '../api/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { Pencil, Trash2, X } from 'lucide-react';
import classes from './PostModal.module.css';

const toRgb = (hex) => {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
};

const getContrastPalette = (hex) => {
    const { r, g, b } = toRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isLight = brightness > 160;
    return {
        text: isLight ? '#1f2937' : '#f8fafc',
        muted: isLight ? 'rgba(31, 41, 55, 0.65)' : 'rgba(248, 250, 252, 0.65)',
        panel: isLight ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.52)',
        panelBorder: isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(248, 250, 252, 0.16)',
        input: isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 23, 42, 0.7)'
    };
};

const PostModal = ({ post, onClose, isMine, canDelete, onEdit, onDelete }) => {
    const { user } = useAuth();
    const { eventId } = useEvent();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (!post?.id || !eventId) return;
        const commentQuery = query(collection(db, 'events', eventId, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(
            commentQuery,
            (snapshot) => {
                const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
                setComments(list);
            },
            (error) => console.error('Error fetching comments:', error)
        );
        return () => unsubscribe();
    }, [eventId, post?.id]);

    const handleSubmitComment = async (event) => {
        event.preventDefault();
        if (!newComment.trim() || !user || isSubmitting) return;
        if (!eventId) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'events', eventId, 'posts', post.id, 'comments'), {
                postId: post.id,
                content: newComment.trim(),
                author: user.name || '익명',
                authorUid: user.uid,
                createdAt: serverTimestamp()
            });
            setNewComment('');
            updateDoc(doc(db, 'events', eventId, 'posts', post.id), {
                commentCount: increment(1)
            }).catch((err) => console.warn('commentCount update failed:', err));
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('댓글 등록에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
        if (!eventId) return;
        try {
            await deleteDoc(doc(db, 'events', eventId, 'posts', post.id, 'comments', commentId));
            updateDoc(doc(db, 'events', eventId, 'posts', post.id), {
                commentCount: increment(-1)
            }).catch((err) => console.warn('commentCount update failed:', err));
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    if (!post) return null;

    const palette = useMemo(() => getContrastPalette(post.color || '#FFF9B0'), [post.color]);
    const formattedDate = `${new Date(post.createdAt).toLocaleDateString()} ${new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const isAdmin = user?.isAdmin === true;

    return (
        <div className={classes.overlay} onClick={onClose}>
            <div
                className={classes.modal}
                onClick={(event) => event.stopPropagation()}
                style={{
                    backgroundColor: post.color || '#FFF9B0',
                    color: palette.text,
                    ['--modal-text']: palette.text,
                    ['--modal-muted']: palette.muted,
                    ['--modal-panel']: palette.panel,
                    ['--modal-panel-border']: palette.panelBorder,
                    ['--modal-input-bg']: palette.input
                }}
            >
                <div className={classes.header}>
                    <div className={classes.fromInfo}>
                        <span className={classes.from}>From. {post.from}</span>
                        <span className={classes.date}>{formattedDate}</span>
                    </div>
                    <button className={classes.closeBtn} onClick={onClose} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                {(isMine || canDelete) && (
                    <div className={classes.postActions}>
                        {isMine && (
                            <button className={classes.editBtn} onClick={onEdit}>
                                <Pencil size={15} />
                                수정
                            </button>
                        )}
                        {(isMine || canDelete) && (
                            <button className={classes.deleteBtn} onClick={onDelete}>
                                <Trash2 size={15} />
                                삭제
                            </button>
                        )}
                    </div>
                )}

                <div className={classes.contentBody}>
                    <p className={classes.content}>{post.content}</p>
                </div>

                <div className={classes.footer}>
                    <span className={classes.toLabel}>To.</span>
                    <div className={classes.recipientList}>
                        {post.isPublic ? (
                            <span className={classes.recipientBadge}>전체 공개</span>
                        ) : (
                            (post.toNames || []).map((name, index) => (
                                <span key={`${name}-${index}`} className={classes.recipientBadge}>
                                    {name}
                                </span>
                            ))
                        )}
                    </div>
                </div>

                <div className={classes.commentSection}>
                    <div className={classes.commentHeader}>댓글 ({comments.length})</div>

                    <div className={classes.commentList}>
                        {comments.length === 0 ? (
                            <p className={classes.commentEmpty}>첫 번째 댓글을 남겨주세요.</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className={classes.commentItem}>
                                    <div>
                                        <span className={classes.commentAuthor}>{comment.author}</span>
                                        {comment.createdAt && (
                                            <span className={classes.commentDate}>
                                                {new Date(comment.createdAt?.seconds * 1000).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <p className={classes.commentText}>{comment.content}</p>

                                    {user && (user.uid === comment.authorUid || isAdmin) && (
                                        <button
                                            className={classes.deleteCommentBtn}
                                            onClick={() => handleDeleteComment(comment.id)}
                                            title="댓글 삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {user ? (
                        <form onSubmit={handleSubmitComment} className={classes.commentForm}>
                            <textarea
                                className={classes.commentInput}
                                placeholder="따뜻한 댓글을 남겨보세요..."
                                value={newComment}
                                onChange={(event) => setNewComment(event.target.value)}
                                rows={2}
                            />
                            <button type="submit" className={classes.submitBtn} disabled={!newComment.trim() || isSubmitting}>
                                등록
                            </button>
                        </form>
                    ) : (
                        <p className={classes.commentLoginHint}>댓글을 작성하려면 로그인이 필요합니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostModal;
