import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Crown, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import GoogleAd from './GoogleAd';
import { AD_SLOTS } from '../config/adsense';

/**
 * AdBanner — 무료 사용자에게 표시되는 복합 광고 영역.
 * 
 * 구성:
 *   1. Posta Premium 업그레이드 CTA (자체 프로모션)
 *   2. Google AdSense 광고 슬롯 (실제 수익화)
 * 
 * Premium 유저에게는 일체 표시하지 않음.
 * 
 * Props:
 *   placement - 배치 위치 식별자 ('dashboard' | 'event-list' 등)
 *   style     - 추가 인라인 스타일
 *   showPromo - 자체 프로모션 배너 표시 여부 (default: true)
 *   showAd    - Google 광고 슬롯 표시 여부 (default: true)
 */
const AdBanner = ({ placement = 'dashboard', style = {}, showPromo = true, showAd = true }) => {
    const { user, accountPremium } = useAuth();
    const [dismissed, setDismissed] = React.useState(false);

    // Premium users: never show ads (legacy check + new account premium check)
    if (user?.isPremium) return null;
    if (accountPremium?.active && accountPremium?.features?.adFree) return null;

    // 광고 슬롯 매핑
    const slotMap = {
        'dashboard': AD_SLOTS.DASHBOARD_TOP_BANNER,
        'event-list': AD_SLOTS.DASHBOARD_EVENT_LIST,
        'event-footer': AD_SLOTS.EVENT_FOOTER,
        'concert-info': AD_SLOTS.EVENT_CONCERT_INFO,
        'board': AD_SLOTS.EVENT_BOARD,
    };

    const adSlot = slotMap[placement] || AD_SLOTS.DASHBOARD_TOP_BANNER;

    return (
        <div style={{ ...style }}>
            {/* 1. 자체 프로모션 배너 (닫기 가능) */}
            {showPromo && !dismissed && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(237,233,254,0.9) 0%, rgba(250,245,255,0.9) 50%, rgba(240,231,255,0.9) 100%)',
                    border: '1px solid rgba(221,214,254,0.6)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    position: 'relative',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    marginBottom: showAd ? '0.5rem' : 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Sparkles size={16} style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1f2937' }}>
                                Posta Premium으로 업그레이드
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                                광고 제거 · 무제한 이벤트 · 커스텀 테마
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <Link
                            to="/dashboard/premium"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: '#fff',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                        >
                            자세히 보기
                        </Link>
                        <button
                            onClick={() => setDismissed(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#9ca3af',
                                padding: '4px',
                                display: 'flex',
                                borderRadius: '4px',
                                transition: 'color 0.15s ease',
                            }}
                            title="닫기"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Google AdSense 실제 광고 슬롯 */}
            {showAd && (
                <GoogleAd
                    slotId={adSlot.slotId}
                    format={adSlot.format}
                    label={adSlot.label}
                />
            )}
        </div>
    );
};

export default AdBanner;
