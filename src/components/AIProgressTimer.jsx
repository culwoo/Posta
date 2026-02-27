import React, { useState, useEffect, useMemo } from 'react';
import classes from './AIProgressTimer.module.css';

/**
 * AI 작업 진행 상태 타이머 컴포넌트
 *
 * @param {boolean} active - 타이머 활성화 여부
 * @param {string} title - 타이머 제목 (예: "AI 영수증 분석 중")
 * @param {string} icon - 아이콘 이모지 (기본: "🤖")
 * @param {number} estimatedSeconds - 예상 소요 시간 (초, 기본: 15)
 * @param {Array<{label: string}>} steps - 진행 단계 목록
 * @param {string[]} tips - 대기 중 표시할 랜덤 팁 메시지들
 * @param {'overlay'|'inline'} variant - 표시 모드 (기본: 'overlay')
 */
const AIProgressTimer = ({
    active = false,
    title = 'AI가 처리 중입니다',
    icon = '🤖',
    estimatedSeconds = 15,
    steps = [],
    tips = [],
    variant = 'overlay',
}) => {
    const [elapsed, setElapsed] = useState(0);
    const [currentTip, setCurrentTip] = useState('');

    // 타이머 시작/정지
    useEffect(() => {
        if (!active) {
            setElapsed(0);
            return;
        }
        setElapsed(0);
        const interval = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [active]);

    // 랜덤 팁 주기적 전환
    useEffect(() => {
        if (!active || tips.length === 0) return;
        setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);
        const interval = setInterval(() => {
            setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, [active, tips]);

    // 예상 진행률 (로그 곡선 - 처음에 빠르고 나중에 느려짐)
    const progress = useMemo(() => {
        if (estimatedSeconds <= 0) return 0;
        const ratio = elapsed / estimatedSeconds;
        // 로그 커브: 초반에 빠르게 진행되고 85%에서 느려짐
        const logProgress = 1 - Math.exp(-3 * ratio);
        return Math.min(logProgress * 95, 95); // 최대 95%까지
    }, [elapsed, estimatedSeconds]);

    // 현재 활성 단계 (시간 비례)
    const currentStepIndex = useMemo(() => {
        if (steps.length === 0) return -1;
        const ratio = elapsed / estimatedSeconds;
        return Math.min(
            Math.floor(ratio * steps.length),
            steps.length - 1
        );
    }, [elapsed, estimatedSeconds, steps.length]);

    // 상태 메시지 (시간에 따라 변화)
    const statusMessage = useMemo(() => {
        if (steps.length > 0 && currentStepIndex >= 0) {
            return steps[currentStepIndex].label;
        }
        if (elapsed < 3) return '요청을 전송하고 있습니다...';
        if (elapsed < 8) return '데이터를 분석하고 있습니다...';
        if (elapsed < 15) return '결과를 생성하고 있습니다...';
        if (elapsed < 25) return '거의 완료되었습니다...';
        return '아직 처리 중입니다. 조금만 더 기다려주세요...';
    }, [elapsed, steps, currentStepIndex]);

    // 남은 시간 표시
    const remainingText = useMemo(() => {
        const remaining = Math.max(0, estimatedSeconds - elapsed);
        if (elapsed > estimatedSeconds) return '곧 완료됩니다...';
        if (remaining <= 5) return '거의 다 됐어요!';
        return `약 ${remaining}초 남음`;
    }, [elapsed, estimatedSeconds]);

    // 경과 시간 포맷
    const elapsedText = useMemo(() => {
        const min = Math.floor(elapsed / 60);
        const sec = elapsed % 60;
        if (min === 0) return `${sec}초 경과`;
        return `${min}분 ${sec}초 경과`;
    }, [elapsed]);

    if (!active) return null;

    const content = (
        <div className={variant === 'inline' ? classes.inline : classes.card}>
            <div className={classes.iconContainer}>
                <div className={classes.iconRing} />
                <span className={classes.iconInner}>{icon}</span>
            </div>

            <h3 className={classes.title}>{title}</h3>
            <p className={classes.statusMessage}>{statusMessage}</p>

            <div className={classes.progressBarContainer}>
                <div
                    className={classes.progressBar}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className={classes.timerRow}>
                <span className={classes.elapsed}>{elapsedText}</span>
                <span className={classes.estimated}>{remainingText}</span>
            </div>

            {steps.length > 0 && (
                <div className={classes.stepsContainer}>
                    {steps.map((step, idx) => {
                        let stepClass = classes.stepPending;
                        let labelClass = classes.stepLabel;
                        let iconText = `${idx + 1}`;

                        if (idx < currentStepIndex) {
                            stepClass = classes.stepDone;
                            labelClass = `${classes.stepLabel} ${classes.stepLabelDone}`;
                            iconText = '✓';
                        } else if (idx === currentStepIndex) {
                            stepClass = classes.stepActive;
                            labelClass = `${classes.stepLabel} ${classes.stepLabelActive}`;
                        }

                        return (
                            <div key={idx} className={classes.stepItem}>
                                <span className={`${classes.stepIcon} ${stepClass}`}>
                                    {iconText}
                                </span>
                                <span className={labelClass}>{step.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {currentTip && (
                <p className={classes.tip}>💡 {currentTip}</p>
            )}
        </div>
    );

    if (variant === 'inline') return content;

    return (
        <div className={classes.overlay}>
            {content}
        </div>
    );
};

export default AIProgressTimer;
