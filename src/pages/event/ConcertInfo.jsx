import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { useEvent } from '../../contexts/EventContext';
import GlassCard from '../../components/ui/GlassCard';

const ConcertInfo = () => {
    const { eventData } = useEvent();

    const eventDate = eventData?.date || '';
    const eventTime = eventData?.time || '';
    const eventLocation = eventData?.location || '';
    const eventAddress = eventData?.address || '';

    const setlistItems = eventData?.setlist || [];

    const parts = [];
    let currentPart = null;

    setlistItems.forEach(item => {
        if (item.type === 'frame') {
            if (currentPart) parts.push(currentPart);
            currentPart = { id: item.id, title: item.title, songs: [] };
        } else {
            if (!currentPart) {
                currentPart = { id: 'default', title: 'Setlist', songs: [] };
            }
            currentPart.songs.push(item);
        }
    });
    if (currentPart) parts.push(currentPart);

    return (
        <div style={{
            maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem',
            animation: 'concertFadeIn 0.6s ease-out', fontFamily: 'var(--font-main)',
        }}>
            <style>{`
                @keyframes concertFadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
                .concert-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem}
                .concert-setlist-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;align-items:stretch}
                .concert-song-item{display:flex;justify-content:space-between;align-items:center;padding:1rem 0;border-bottom:1px solid var(--ui-border-soft);gap:1.5rem;transition:background .15s ease}
                .concert-song-item:last-child{border-bottom:none}
                .concert-song-item:hover{background:var(--ui-surface-soft);border-radius:8px;margin:0 -.5rem;padding:1rem .5rem}
                @media(max-width:1024px){.concert-setlist-grid{grid-template-columns:1fr;gap:2.5rem}}
                @media(max-width:500px){.concert-song-item{flex-direction:column;align-items:flex-start;gap:.4rem}.concert-artist{font-size:.9rem!important;align-self:flex-start;white-space:normal!important}}
            `}</style>

            {/* ── Info Card ── */}
            <GlassCard level={1} style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                {/* top highlight */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: 'linear-gradient(90deg, transparent, var(--ui-border-strong), transparent)',
                }} />
                <div className="concert-info-grid">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem' }}>
                        <Clock style={{
                            color: 'var(--accent-color)', width: 28, height: 28, minWidth: 28,
                            marginTop: '0.1rem', filter: 'drop-shadow(0 2px 6px rgba(246,196,88,0.4))',
                        }} />
                        <div>
                            <h3 style={{
                                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: 'var(--ui-text-muted)', margin: '0 0 0.5rem 0', fontWeight: 600,
                            }}>
                                일시
                            </h3>
                            <p style={{
                                fontSize: '1.15rem', fontWeight: 500, color: 'var(--text-primary)',
                                margin: 0, lineHeight: 1.5, wordBreak: 'keep-all',
                                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            }}>
                                {eventDate ? `${eventDate} ${eventTime}` : '추후 공지'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem' }}>
                        <MapPin style={{
                            color: 'var(--accent-color)', width: 28, height: 28, minWidth: 28,
                            marginTop: '0.1rem', filter: 'drop-shadow(0 2px 6px rgba(246,196,88,0.4))',
                        }} />
                        <div>
                            <h3 style={{
                                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: 'var(--ui-text-muted)', margin: '0 0 0.5rem 0', fontWeight: 600,
                            }}>
                                장소
                            </h3>
                            <p style={{
                                fontSize: '1.15rem', fontWeight: 500, color: 'var(--text-primary)',
                                margin: 0, lineHeight: 1.5, wordBreak: 'keep-all',
                                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            }}>
                                {eventLocation || '추후 공지'}
                            </p>
                            {eventAddress && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', marginTop: '0.2rem', margin: '0.2rem 0 0' }}>
                                    {eventAddress}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>

            {parts.length > 0 && (
                <>
                    {/* ── Intermission Divider ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '3.5rem 0' }}>
                        <div style={{
                            width: 120, height: 1,
                            background: 'linear-gradient(to right, transparent, var(--ui-border-strong), transparent)',
                        }} />
                    </div>

                    {/* ── Setlist ── */}
                    <div className="concert-setlist-grid">
                        {parts.map((part) => (
                            <React.Fragment key={part.id}>
                                <GlassCard level={1} hover style={{ padding: '2.5rem', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                    {/* top highlight */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                                        background: 'linear-gradient(90deg, transparent, var(--ui-border-soft), transparent)',
                                    }} />
                                    <h3 style={{
                                        textAlign: 'center', color: 'var(--text-primary)',
                                        fontSize: '2rem', marginBottom: '2.5rem',
                                        fontFamily: 'var(--font-main)', fontWeight: 700,
                                        position: 'relative', paddingBottom: '1rem',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    }}>
                                        {part.title}
                                        {/* underline accent */}
                                        <span style={{
                                            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                            width: 50, height: 3, display: 'block',
                                            background: 'linear-gradient(90deg, rgba(208,76,49,0.8), rgba(246,196,88,0.6))',
                                            borderRadius: 2, boxShadow: '0 0 8px rgba(208,76,49,0.3)',
                                        }} />
                                    </h3>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {part.songs.map((song) => (
                                            <li key={song.id} className="concert-song-item">
                                                <span style={{
                                                    fontSize: '1.15rem', fontWeight: 600,
                                                    color: 'var(--text-primary)', lineHeight: 1.3,
                                                    textAlign: 'left', flex: 1,
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                                }}>
                                                    {song.title}
                                                </span>
                                                <span className="concert-artist" style={{
                                                    fontSize: '0.95rem', color: 'var(--ui-text-muted)',
                                                    textAlign: 'right', whiteSpace: 'nowrap',
                                                }}>
                                                    {song.artist}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            </React.Fragment>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ConcertInfo;
