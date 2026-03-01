import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Pencil, X } from 'lucide-react';
import classes from './StickyNote.module.css';

const toRgb = (hex) => {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
};

const getTextColor = (hex) => {
    const { r, g, b } = toRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? '#1f2937' : '#f8fafc';
};

const getStableRotation = (seed) => {
    const raw = String(seed || '');
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) hash = (hash << 5) - hash + raw.charCodeAt(i);
    const normalized = (hash % 7) - 3;
    return Math.max(-3, Math.min(3, normalized));
};

const StickyNote = ({ post, isMine, canDelete, onDelete, onEdit, onClick }) => {
    const rotation = useMemo(() => getStableRotation(post.id || post.createdAt || post.content), [post.content, post.createdAt, post.id]);
    const textColor = useMemo(() => getTextColor(post.color || '#FFF9B0'), [post.color]);
    const mutedColor = useMemo(() => (textColor === '#f8fafc' ? 'rgba(248, 250, 252, 0.72)' : 'rgba(31, 41, 55, 0.72)'), [textColor]);
    const hintColor = useMemo(() => (textColor === '#f8fafc' ? 'rgba(248, 250, 252, 0.88)' : 'rgba(15, 23, 42, 0.84)'), [textColor]);
    const commentCount = Number(post.commentCount || 0);

    return (
        <motion.div
            className={classes.note}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.035, y: -3 }}
            onClick={onClick}
            style={{
                backgroundColor: post.color || '#FFF9B0',
                rotate: rotation,
                border: isMine ? '2px solid var(--primary-color)' : '2px solid rgba(255,255,255,0.3)',
                color: textColor
            }}
        >
            {(isMine || canDelete) && (
                <div className={classes.actions}>
                    {isMine && (
                        <button
                            className={classes.actionBtn}
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit();
                            }}
                            title="수정"
                        >
                            <Pencil size={14} />
                        </button>
                    )}
                    <button
                        className={classes.actionBtn}
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete();
                        }}
                        title="삭제"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className={classes.header}>
                <span className={classes.from} style={{ color: textColor }}>From. {post.from}</span>
                {post.isPublic ? (
                    <span className={classes.badgePublic} style={{ color: textColor }}>전체</span>
                ) : (
                    <span className={classes.badgePrivate} style={{ color: textColor }}>To. {post.toNames?.join(', ')}</span>
                )}
            </div>

            <p className={classes.content} style={{ color: textColor }}>{post.content}</p>

            <div className={classes.footer}>
                <span style={{ color: mutedColor }}>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>

            <div className={classes.openHint} style={{ color: hintColor }}>
                <MessageCircle size={14} />
                <span>클릭해 열기 · 댓글 {commentCount}</span>
            </div>
        </motion.div>
    );
};

export default StickyNote;
