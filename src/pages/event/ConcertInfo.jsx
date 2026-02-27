import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { useEvent } from '../../contexts/EventContext';
import GoogleAd from '../../components/GoogleAd';
import { AD_SLOTS } from '../../config/adsense';
import classes from './ConcertInfo.module.css';

const ConcertInfo = () => {
    const { eventData } = useEvent();

    // 시간 및 장소 동기화
    const eventDate = eventData?.date || '';
    const eventTime = eventData?.time || '';
    const eventLocation = eventData?.location || '';
    const eventAddress = eventData?.address || '';

    // Parse setlist into frames
    const setlistItems = eventData?.setlist || [];

    const parts = [];
    let currentPart = null;

    setlistItems.forEach(item => {
        if (item.type === 'frame') {
            if (currentPart) parts.push(currentPart);
            currentPart = { id: item.id, title: item.title, songs: [] };
        } else {
            if (!currentPart) {
                // If there's a song before the first frame, create a default frame
                currentPart = { id: 'default', title: 'Setlist', songs: [] };
            }
            currentPart.songs.push(item);
        }
    });
    if (currentPart) parts.push(currentPart);

    return (
        <div className={classes.container}>

            <div className={classes.infoCard}>
                <div className={classes.infoRow}>
                    <Clock className={classes.icon} />
                    <div>
                        <h3>일시</h3>
                        <p>{eventDate ? `${eventDate} ${eventTime}` : '추후 공지'}</p>
                    </div>
                </div>
                <div className={classes.infoRow}>
                    <MapPin className={classes.icon} />
                    <div>
                        <h3>장소</h3>
                        <p>{eventLocation || '추후 공지'}</p>
                        {eventAddress && <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.2rem' }}>{eventAddress}</p>}
                    </div>
                </div>
            </div>

            {parts.length > 0 && (
                <>
                    {/* 프레임 간 구분 대신 1회만 표시되도록 수정된 데코레이션 효과 */}
                    <div className={classes.intermission}>
                        <div className={classes.intermissionLine}></div>
                    </div>

                    <div className={classes.setlistContainer}>
                        {parts.map((part, index) => (
                            <React.Fragment key={part.id}>
                                <div className={classes.part}>
                                    <h3 className={classes.partTitle}>{part.title}</h3>
                                    <ul className={classes.list}>
                                        {part.songs.map((song) => (
                                            <li key={song.id} className={classes.item}>
                                                <span className={classes.songTitle}>{song.title}</span>
                                                <span className={classes.artist}>{song.artist}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </>
            )}

            {/* 광고 영역 */}
            <GoogleAd
                slotId={AD_SLOTS.EVENT_CONCERT_INFO.slotId}
                format={AD_SLOTS.EVENT_CONCERT_INFO.format}
                label={AD_SLOTS.EVENT_CONCERT_INFO.label}
                style={{ marginTop: '1.5rem' }}
            />
        </div>
    );
};

export default ConcertInfo;
