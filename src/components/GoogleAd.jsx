import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ADSENSE_PUBLISHER_ID, ADSENSE_ENABLED } from '../config/adsense';
import styles from './GoogleAd.module.css';

/**
 * GoogleAd — 실제 Google AdSense 광고 유닛을 렌더링하는 컴포넌트.
 * 
 * Props:
 *   slotId   - AdSense 광고 단위 슬롯 ID (string)
 *   format   - 'horizontal' | 'rectangle' | 'vertical' | 'auto' (default: 'auto')
 *   label    - 접근성/디버그용 라벨 (optional)
 *   style    - 추가 인라인 스타일 (optional)
 *   className - 추가 CSS 클래스 (optional)
 * 
 * 동작:
 *   - Premium 유저에게는 절대 표시하지 않음
 *   - ADSENSE_ENABLED가 false이면 개발용 플레이스홀더 표시
 *   - AdSense 승인 후 ADSENSE_ENABLED=true로 전환하면 실제 광고 노출
 */
const GoogleAd = ({ slotId, format = 'auto', label = '', style = {}, className = '' }) => {
    const { canAccess } = usePermissions();
    const adRef = useRef(null);
    const pushed = useRef(false);

    // Premium (Plus tier): 광고 비노출
    const adFree = canAccess('adFree').allowed;

    useEffect(() => {
        if (adFree || !ADSENSE_ENABLED) return;

        // adsbygoogle push — 한 번만 실행
        if (!pushed.current && adRef.current && window.adsbygoogle) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                pushed.current = true;
            } catch (e) {
                console.warn('[GoogleAd] adsbygoogle push error:', e);
            }
        }
    }, [adFree]);

    if (adFree) return null;

    // ━━━ 광고 비활성 모드: 개발용 플레이스홀더 ━━━
    if (!ADSENSE_ENABLED) {
        const heightMap = {
            horizontal: '90px',
            rectangle: '250px',
            vertical: '600px',
            auto: '100px',
        };

        return (
            <div
                className={`${styles.adPlaceholder} ${className}`}
                style={{ minHeight: heightMap[format] || '100px', ...style }}
                role="complementary"
                aria-label={label || 'Advertisement placeholder'}
            >
                <div className={styles.placeholderInner}>
                    <div className={styles.placeholderIcon}>📢</div>
                    <span className={styles.placeholderText}>AD</span>
                    <span className={styles.placeholderSub}>광고 영역 · posta.systems</span>
                </div>
            </div>
        );
    }

    // ━━━ AdSense 활성 모드: 실제 광고 ━━━
    const layoutMap = {
        horizontal: 'in-article',
        rectangle: 'in-article',
        vertical: 'in-article',
        auto: 'in-article',
    };

    const responsiveStyle = {
        display: 'block',
        ...style,
    };

    return (
        <div className={`${styles.adContainer} ${className}`} role="complementary" aria-label={label || 'Advertisement'}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={responsiveStyle}
                data-ad-client={ADSENSE_PUBLISHER_ID}
                data-ad-slot={slotId}
                data-ad-format={format === 'auto' ? 'auto' : 'fluid'}
                data-ad-layout={layoutMap[format]}
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default GoogleAd;
