import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Check, Zap, Users, Shield, Palette } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const plans = [
    {
        id: 'free',
        name: 'Free',
        price: '₩0',
        period: '/영구',
        description: '소규모 이벤트를 시작해보세요.',
        features: [
            '이벤트 3개까지 생성',
            '예매 인원 50명 제한',
            '기본 QR 체크인',
            '광고 포함',
            '기본 통계'
        ],
        color: '#6b7280',
        highlight: false
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₩9,900',
        period: '/월',
        description: '성장하는 크리에이터를 위한 플랜.',
        features: [
            '이벤트 무제한 생성',
            '예매 인원 무제한',
            '고급 QR 체크인 + 수동 Fallback',
            '광고 제거',
            '상세 통계 & 인사이트',
            '커스텀 테마 적용',
            '우선 고객 지원'
        ],
        color: '#7c3aed',
        highlight: true
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '₩29,900',
        period: '/월',
        description: '프로 기획자 & 팀 운영을 위한 플랜.',
        features: [
            'Premium 기능 전체 포함',
            '팀 멤버 관리 (스태프 초대)',
            'API 접근 권한',
            '화이트라벨 (Posta 로고 제거)',
            '전용 CRM & 마케팅 도구',
            '전담 매니저 지원'
        ],
        color: '#f59e0b',
        highlight: false
    }
];

const PremiumDashboard = () => {
    const { user } = useAuth();
    const currentTier = user?.tier || 'free';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Header */}
            <div>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-main)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <Crown size={22} style={{ color: '#7c3aed' }} /> 프리미엄 플랜
                </h2>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                    더 강력한 기능으로 이벤트를 성장시키세요.
                </p>
            </div>

            {/* Current Tier Badge */}
            <GlassCard
                level={1}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.2rem',
                    background: currentTier !== 'free'
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 100%)'
                        : undefined,
                    borderColor: currentTier !== 'free' ? 'rgba(124,58,237,0.25)' : undefined,
                }}
            >
                <Shield size={20} style={{ color: currentTier !== 'free' ? '#7c3aed' : 'var(--text-tertiary)', flexShrink: 0 }} />
                <div>
                    <div style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-main)',
                        fontSize: '0.95rem',
                    }}>
                        현재 플랜: <span style={{
                            color: currentTier === 'premium' ? '#7c3aed' : currentTier === 'pro' ? '#f59e0b' : 'var(--text-tertiary)',
                            textTransform: 'uppercase'
                        }}>{currentTier}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-main)', marginTop: '0.1rem' }}>
                        {currentTier === 'free' ? '업그레이드하여 모든 기능을 잠금 해제하세요.' : '프리미엄 혜택을 즐기고 계십니다.'}
                    </div>
                </div>
            </GlassCard>

            {/* Plans Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
            }}>
                {plans.map((plan) => {
                    const isCurrentPlan = plan.id === currentTier;
                    return (
                        <GlassCard
                            key={plan.id}
                            level={plan.highlight ? 3 : 2}
                            style={{
                                padding: '1.5rem',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                ...(plan.highlight ? {
                                    border: `2px solid ${plan.color}`,
                                    boxShadow: `0 0 30px rgba(124,58,237,0.15), inset 0 1px 0 var(--ui-border-soft), 0 20px 60px var(--ui-scrim)`,
                                } : {}),
                            }}
                        >
                            {plan.highlight && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: `linear-gradient(135deg, ${plan.color}, #a78bfa)`,
                                    color: 'var(--text-on-primary)',
                                    padding: '3px 14px',
                                    borderRadius: '999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'var(--font-main)',
                                    letterSpacing: '-0.01em',
                                }}>
                                    가장 인기 있는 플랜
                                </div>
                            )}

                            <div style={{ marginBottom: '0.75rem' }}>
                                <h3 style={{
                                    margin: 0,
                                    color: plan.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontFamily: 'var(--font-main)',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    letterSpacing: '-0.02em',
                                }}>
                                    {plan.id === 'premium' && <Zap size={16} />}
                                    {plan.id === 'pro' && <Crown size={16} />}
                                    {plan.id === 'free' && <Users size={16} />}
                                    {plan.name}
                                </h3>
                                <p style={{
                                    margin: '0.25rem 0 0',
                                    color: 'var(--text-tertiary)',
                                    fontSize: '0.82rem',
                                    fontFamily: 'var(--font-main)',
                                }}>
                                    {plan.description}
                                </p>
                            </div>

                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                marginBottom: '0.25rem',
                                fontFamily: 'var(--font-main)',
                                letterSpacing: '-0.03em',
                            }}>
                                {plan.price}
                                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>{plan.period}</span>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', margin: '0.75rem 0' }}>
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'var(--font-main)',
                                    }}>
                                        <Check size={15} style={{ color: plan.color, flexShrink: 0 }} />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <GlassButton
                                variant={isCurrentPlan ? 'ghost' : 'primary'}
                                size="md"
                                disabled={isCurrentPlan}
                                style={{
                                    width: '100%',
                                    marginTop: 'auto',
                                    justifyContent: 'center',
                                    ...(!isCurrentPlan ? {
                                        background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
                                        boxShadow: `0 4px 16px ${plan.color}40`,
                                    } : {}),
                                }}
                            >
                                {isCurrentPlan ? '현재 플랜' : '업그레이드'}
                            </GlassButton>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Premium Features Showcase */}
            <GlassCard level={1} style={{ padding: '1.5rem' }}>
                <h3 style={{
                    margin: 0,
                    color: 'var(--text-primary)',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-main)',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                }}>
                    <Palette size={18} /> 프리미엄 전용 기능 미리보기
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-main)' }}>
                    업그레이드 시 아래 기능들이 즉시 활성화됩니다.
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '1rem'
                }}>
                    {[
                        { icon: '🎨', title: '커스텀 테마', desc: '이벤트 페이지를 브랜드 컬러로 꾸밀 수 있습니다.' },
                        { icon: '📊', title: '상세 통계', desc: '예매 전환율, 시간대별 트래픽 등 심층 인사이트를 확인합니다.' },
                        { icon: '🚫', title: '광고 제거', desc: '이벤트 페이지와 대시보드에서 광고가 완전히 사라집니다.' },
                        { icon: '🔒', title: '수동 체크인', desc: 'QR 스캔 실패 시 예매번호/이름으로 수동 입장 처리가 가능합니다.' }
                    ].map((item, idx) => (
                        <GlassCard key={idx} level={1} style={{ padding: '0.85rem' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{item.icon}</div>
                            <div style={{
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                fontSize: '0.92rem',
                                fontFamily: 'var(--font-main)',
                            }}>
                                {item.title}
                            </div>
                            <div style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-tertiary)',
                                marginTop: '0.2rem',
                                fontFamily: 'var(--font-main)',
                            }}>
                                {item.desc}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </GlassCard>

            <div style={{
                color: 'var(--text-tertiary)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-main)',
                textAlign: 'center',
                marginTop: '0.3rem',
            }}>
                결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다. 현재는 플랜 미리보기만 제공됩니다.
            </div>
        </div>
    );
};

export default PremiumDashboard;
