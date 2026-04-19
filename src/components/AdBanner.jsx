import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * AdBanner — 무료 사용자에게 표시되는 Plus Pass 프로모션 배너.
 * 
 * Premium 유저에게는 일체 표시하지 않음.
 * 
 * Props:
 *   placement - 배치 위치 식별자 ('dashboard' | 'event-list' 등)
 *   style     - 추가 인라인 스타일
 */
const AdBanner = ({ placement = 'dashboard', style = {} }) => {
    const { canAccess } = usePermissions();
    const [dismissed, setDismissed] = React.useState(false);

    // Plus tier인 경우 프로모션 배너도 숨김
    if (canAccess('board').allowed) return null;

    if (dismissed) return null;

    return (
        <div data-placement={placement} style={{ ...style }}>
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
                            Plus Pass로 관객과 더 가까이
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                            응원 게시판으로 관객과 소통하세요
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <Link
                        to="/dashboard/pricing"
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
        </div>
    );
};

export default AdBanner;
