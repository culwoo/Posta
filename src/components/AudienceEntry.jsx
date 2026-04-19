import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import classes from './AudienceEntry.module.css';

const AudienceEntry = () => {
    const { audienceLogin } = useAuth();
    const [nickname, setNickname] = useState('');

    const handleRandomEnter = () => {
        // Pass empty to let context generate random
        audienceLogin('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (nickname.trim()) {
            audienceLogin(nickname);
        }
    };

    return (
        <div className={classes.container}>
            <h2 className={classes.title}>환영합니다!</h2>
            <p className={classes.description}>
                공연을 즐기기 위해 닉네임을 설정해주세요.<br />
                (입력하지 않으면 귀여운 닉네임을 지어드려요!)
            </p>

            <div className={classes.card}>
                <form onSubmit={handleSubmit} className={classes.form}>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="사용할 닉네임 입력 (선택)"
                        className={classes.input}
                    />
                    <div className={classes.actions}>
                        <button type="button" onClick={handleRandomEnter} className={classes.randomBtn}>
                            🎲 랜덤 닉네임으로 입장
                        </button>
                        <button type="submit" className={classes.submitBtn}>
                            입장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AudienceEntry;
