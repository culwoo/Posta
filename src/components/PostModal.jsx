import React, { useEffect, useState } from 'react';
import classes from './PostModal.module.css';
import { X, Trash2 } from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from '../api/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';

const PostModal = ({ post, onClose }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            console.log("Cleanup: scroll restoration and snapshot unsubscribe");
        };
    }, []);

    const { eventId } = useEvent();

    // Fetch Comments
    useEffect(() => {
        if (!post?.id || !eventId) return;

        const q = query(
            collection(db, "events", eventId, "posts", post.id, "comments"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(list);
        }, (error) => {
            console.error("Error fetching comments:", error);
        });

        return () => unsubscribe();
    }, [post?.id, eventId]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || isSubmitting) return;

        if (!eventId) {
            alert("이벤트 정보가 없습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "events", eventId, "posts", post.id, "comments"), {
                postId: post.id, // Redundant but harmless, keeping for reference
                content: newComment.trim(),
                author: user.name || '알 수 없음',
                authorUid: user.uid,
                createdAt: serverTimestamp()
            });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("댓글 등록 실패");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
        if (!eventId) return;
        try {
            await deleteDoc(doc(db, "events", eventId, "posts", post.id, "comments", commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("삭제 실패");
        }
    };

    if (!post) return null;

    const formattedDate = new Date(post.createdAt).toLocaleDateString() + ' ' +
        new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isAdmin = user?.isAdmin === true;

    return (
        <div className={classes.overlay} onClick={onClose}>
            <div
                className={classes.modal}
                style={{ backgroundColor: post.color || '#FFF9B0' }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className={classes.header}>
                    <div className={classes.fromInfo}>
                        <span className={classes.from}>From. {post.from}</span>
                        <span className={classes.date}>{formattedDate}</span>
                    </div>
                    <button className={classes.closeBtn} onClick={onClose} aria-label="닫기">
                        <X size={24} />
                    </button>
                </div>

                <div className={classes.contentBody}>
                    <p className={classes.content}>{post.content}</p>
                </div>

                <div className={classes.footer}>
                    <span className={classes.toLabel}>To.</span>
                    <div className={classes.recipientList}>
                        {post.isPublic ? (
                            <span className={classes.recipientBadge}>전체 공개</span>
                        ) : (
                            post.toNames && post.toNames.length > 0 ? (
                                post.toNames.map((name, index) => (
                                    <span key={index} className={classes.recipientBadge}>
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <span className={classes.recipientBadge}>수신자 없음</span>
                            )
                        )}
                    </div>
                </div>

                {/* Comment Section */}
                <div className={classes.commentSection}>
                    <div className={classes.commentHeader}>댓글 ({comments.length})</div>

                    <div className={classes.commentList}>
                        {comments.length === 0 ? (
                            <p style={{ color: '#636e72', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                                첫 번째 댓글을 남겨주세요!
                            </p>
                        ) : (
                            comments.map(comment => (
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

                                    {(user && (user.uid === comment.authorUid || isAdmin)) && (
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
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={1}
                            />
                            <button
                                type="submit"
                                className={classes.submitBtn}
                                disabled={!newComment.trim() || isSubmitting}
                            >
                                등록
                            </button>
                        </form>
                    ) : (
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#636e72' }}>
                            댓글을 작성하려면 로그인이 필요합니다.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostModal;
