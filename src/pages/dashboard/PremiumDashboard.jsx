import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Check, Zap, Palette, Users, Shield } from 'lucide-react';
import classes from './DashboardFeature.module.css';

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
        <div className={classes.page}>
            <div className={classes.headerRow}>
                <div className={classes.titleBlock}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Crown size={22} style={{ color: '#7c3aed' }} /> 프리미엄 플랜
                    </h2>
                    <p>더 강력한 기능으로 이벤트를 성장시키세요.</p>
                </div>
            </div>

            {/* Current Tier Badge */}
            <div className={classes.panel} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: currentTier !== 'free' ? 'linear-gradient(135deg, #ede9fe 0%, #faf5ff 100%)' : undefined
            }}>
                <Shield size={20} style={{ color: currentTier !== 'free' ? '#7c3aed' : '#6b7280' }} />
                <div>
                    <div style={{ fontWeight: 700, color: '#111827' }}>
                        현재 플랜: <span style={{
                            color: currentTier === 'premium' ? '#7c3aed' : currentTier === 'pro' ? '#f59e0b' : '#6b7280',
                            textTransform: 'uppercase'
                        }}>{currentTier}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {currentTier === 'free' ? '업그레이드하여 모든 기능을 잠금 해제하세요.' : '프리미엄 혜택을 즐기고 계십니다.'}
                    </div>
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem'
            }}>
                {plans.map((plan) => {
                    const isCurrentPlan = plan.id === currentTier;
                    return (
                        <div
                            key={plan.id}
                            className={classes.panel}
                            style={{
                                border: plan.highlight ? `2px solid ${plan.color}` : undefined,
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {plan.highlight && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: plan.color,
                                    color: '#fff',
                                    padding: '2px 14px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap'
                                }}>
                                    가장 인기 있는 플랜
                                </div>
                            )}

                            <div style={{ marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, color: plan.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {plan.id === 'premium' && <Zap size={16} />}
                                    {plan.id === 'pro' && <Crown size={16} />}
                                    {plan.id === 'free' && <Users size={16} />}
                                    {plan.name}
                                </h3>
                                <p className={classes.panelHint} style={{ marginTop: '0.25rem' }}>{plan.description}</p>
                            </div>

                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                                {plan.price}
                                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280' }}>{plan.period}</span>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', margin: '0.75rem 0' }}>
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
                                        <Check size={15} style={{ color: plan.color, flexShrink: 0 }} />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <button
                                className={isCurrentPlan ? classes.btnSecondary : classes.btnPrimary}
                                style={{
                                    width: '100%',
                                    marginTop: 'auto',
                                    background: !isCurrentPlan ? plan.color : undefined,
                                    justifyContent: 'center'
                                }}
                                disabled={isCurrentPlan}
                            >
                                {isCurrentPlan ? '현재 플랜' : '업그레이드'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Premium Features Showcase */}
            <div className={classes.panel} style={{ marginTop: '0.5rem' }}>
                <h3 className={classes.panelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Palette size={18} /> 프리미엄 전용 기능 미리보기
                </h3>
                <p className={classes.panelHint}>업그레이드 시 아래 기능들이 즉시 활성화됩니다.</p>
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
                        <div key={idx} style={{
                            background: '#f9fafb',
                            borderRadius: '10px',
                            padding: '0.85rem',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{item.icon}</div>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>{item.title}</div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.2rem' }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={classes.inlineNote} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다. 현재는 플랜 미리보기만 제공됩니다.
            </div>
        </div>
    );
};

export default PremiumDashboard;
