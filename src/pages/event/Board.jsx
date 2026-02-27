import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, deleteDoc, doc } from '../../api/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
import { Plus } from 'lucide-react';
import StickyNote from '../../components/StickyNote';
import WriteModal from '../../components/WriteModal';
import PostModal from '../../components/PostModal';
import GoogleAd from '../../components/GoogleAd';
import { AD_SLOTS } from '../../config/adsense';
import classes from './Board.module.css';

const Board = () => {
    const { eventId } = useEvent();
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [viewingPost, setViewingPost] = useState(null);


    useEffect(() => {
        if (!eventId) return;

        const q = query(collection(db, "events", eventId, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(allPosts);
        });
        return unsubscribe;
    }, [eventId]);

    const handleViewPost = (post) => {
        setViewingPost(post);
    };

    const isAdmin = user?.isAdmin === true;

    // Filter posts based on privacy
    const filteredPosts = posts.filter(post => {
        if (post.isPublic) return true;

        // If not logged in, can't see private posts
        if (!user) return false;

        // Check visibility logic: am I the author OR am I in the receiver list?
        // Updated Logic: Check by UID (Device ID for guests)
        const myUid = user.uid;

        // 1. Am I the author?
        if (post.fromUid === myUid) return true;

        // 2. Am I in visibleTo list?
        if (post.visibleTo && post.visibleTo.includes(myUid)) return true;

        return false;
    });

    // Delete Handler
    const handleDelete = async (postId) => {
        if (!window.confirm("정말 이 응원 메시지를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "events", eventId, "posts", postId));
        } catch (err) {
            console.error("Failed to delete post:", err);
            alert("삭제 실패");
        }
    };

    // Edit Handler
    const handleEdit = (post) => {
        setEditingPost(post);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPost(null);
    };

    return (
        <div className={classes.board}>
            <div className={classes.boardHeader}>

                <p>우리들의 이야기를 자유롭게 남겨주세요!</p>
            </div>

            <GoogleAd
                slotId={AD_SLOTS.EVENT_BOARD.slotId}
                format={AD_SLOTS.EVENT_BOARD.format}
                label={AD_SLOTS.EVENT_BOARD.label}
                style={{ margin: '0 0 0.5rem' }}
            />

            <div className={classes.postsContainer}>
                {filteredPosts.map(post => (
                    <StickyNote
                        key={post.id}
                        post={post}
                        isMine={user && post.fromUid === user.uid}
                        canDelete={isAdmin && post.isPublic}
                        onDelete={() => handleDelete(post.id)}
                        onEdit={() => handleEdit(post)}
                        onClick={() => handleViewPost(post)}
                    />
                ))}
                {filteredPosts.length === 0 && (
                    <div className={classes.emptyState}>
                        <p>아직 작성된 응원 메시지가 없어요.<br />첫 번째 주인공이 되어보세요!</p>
                    </div>
                )}
            </div>

            <button className={classes.fab} onClick={() => setShowModal(true)}>
                <Plus size={24} /> 글쓰기
            </button>

            {showModal && (
                <WriteModal
                    onClose={handleCloseModal}
                    postToEdit={editingPost}
                />
            )}

            {viewingPost && (
                <PostModal
                    post={viewingPost}
                    onClose={() => setViewingPost(null)}
                />
            )}
        </div>
    );
};

export default Board;
