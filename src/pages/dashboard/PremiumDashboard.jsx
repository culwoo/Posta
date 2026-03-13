import React from 'react';
import { Crown, Check, X, Zap, Users } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { functions, httpsCallable } from '../../api/firebase';
import { TIER_PRICES, getTierColor } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
/* ─────────────────────────── Data ─────────────────────────── */

const EVENT_FEATURES = [
  { key: 'admin',    label: '핵심 관리자 패널',     free: true, plus: true },
  { key: 'reserve',  label: '예매 및 좌석 선택',     free: true, plus: true },
  { key: 'checkin',  label: 'QR 체크인 및 현장관리',  free: true, plus: true },
  { key: 'board',    label: '응원 및 방명록 게시판',   free: false, plus: true },
  { key: 'adFree',   label: '관객 화면 광고 제거',    free: false, plus: true },
];

const eventPlans = [
  {
    id: 'free',
    name: 'Free',
    price: TIER_PRICES.free,
    period: '/ 공연',
    description: 'Posta 생태계의 모든 강력한 기능을 무료로 시작하세요.',
    icon: Users,
    color: getTierColor('free'),
    highlight: false,
  },
  {
    id: 'plus',
    name: 'Plus Pass',
    price: TIER_PRICES.plus,
    period: '/ 공연',
    description: '광고 없는 쾌적한 화면과 열려있는 소통 창구를 관객에게 제공하세요.',
    icon: Zap,
    color: getTierColor('plus'),
    highlight: true,
  },
];

/* ─────────────────────── Helpers ──────────────────────── */

const FeatureMark = ({ enabled, color }) => (
  enabled
    ? <Check size={15} style={{ color, flexShrink: 0 }} />
    : <X size={15} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
);

/* ──────────────────── Component ───────────────────── */

const PremiumDashboard = () => {
  const { eventData, billing } = useEvent();
  const { user } = useAuth();
  const [isCheckoutLoading, setIsCheckoutLoading] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState('');

  const canStartCheckout = Boolean(eventData?.id && user?.uid);
  const isPlus = billing?.tier === 'plus';

  const handleCheckoutClick = React.useCallback(async () => {
    if (!canStartCheckout || isCheckoutLoading) return;

    setCheckoutError('');
    setIsCheckoutLoading(true);

    try {
      const createCheckout = httpsCallable(functions, 'createLemonSqueezyCheckout');
      const response = await createCheckout({ eventId: eventData.id });
      const checkoutUrl = String(response.data?.url || '').trim();

      if (!checkoutUrl.startsWith('https://')) {
        throw new Error('Checkout URL was not returned.');
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error('Checkout initialization failed:', error);
      setCheckoutError('결제 링크를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [canStartCheckout, eventData?.id, isCheckoutLoading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Header ── */}
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
          <Crown size={22} style={{ color: '#8b5cf6' }} /> 요금제
        </h2>
        <p style={{
          margin: '0.3rem 0 0',
          color: 'var(--text-tertiary)',
          fontSize: '0.9rem',
          fontFamily: 'var(--font-main)',
        }}>
          관객 경험을 극대화하는 Plus 패스로 멋진 공연을 완성하세요.
        </p>
      </div>

      {/* ═══════════════ Section 1: Event Pass ═══════════════ */}
      <div>
        <h3 style={{
          margin: '0 0 0.75rem',
          fontSize: '1.05rem',
          fontWeight: 600,
          fontFamily: 'var(--font-main)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          공연별 이벤트 패스
        </h3>
        <p style={{
          margin: '0 0 1rem',
          color: 'var(--text-tertiary)',
          fontSize: '0.82rem',
          fontFamily: 'var(--font-main)',
        }}>
          결제는 공연별 일회성으로 진행되며, 환불은 불가합니다.
        </p>

        {/* Tier Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {eventPlans.map((plan) => {
            const Icon = plan.icon;
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
                    border: `2px solid ${plan.color}55`,
                    boxShadow: `0 0 24px ${plan.color}18`,
                  } : {}),
                }}
              >
                {/* Popular badge */}
                {plan.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                    color: '#fff',
                    padding: '3px 14px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-main)',
                  }}>
                     추천
                  </div>
                )}

                {/* Plan name + icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <Icon size={16} style={{ color: plan.color }} />
                  <span style={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: plan.color,
                    fontFamily: 'var(--font-main)',
                    letterSpacing: '-0.02em',
                  }}>
                    {plan.name}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  margin: '0 0 0.75rem',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-main)',
                  minHeight: '2.5rem',
                }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-main)',
                  letterSpacing: '-0.03em',
                  marginBottom: '1rem',
                }}>
                  {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                  {plan.price > 0 && (
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 400,
                      color: 'var(--text-tertiary)',
                      marginLeft: '0.2rem',
                    }}>
                      {plan.period}
                    </span>
                  )}
                </div>

                {/* Feature checklist */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {EVENT_FEATURES.map((f) => {
                    const enabled = f[plan.id];
                    return (
                      <div key={f.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: enabled ? 'var(--text-secondary)' : 'rgba(255,255,255,0.25)',
                        fontFamily: 'var(--font-main)',
                      }}>
                        <FeatureMark enabled={enabled} color={plan.color} />
                        <span style={!enabled ? { textDecoration: 'line-through' } : {}}>
                          {f.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                {plan.id === 'plus' ? (
                  isPlus ? (
                    <GlassButton
                      variant="primary"
                      size="md"
                      disabled
                      style={{
                        width: '100%',
                        marginTop: 'auto',
                        justifyContent: 'center',
                        opacity: 0.9,
                        background: '#10b981',
                        color: 'white',
                      }}
                    >
                      <Check size={16} /> 이용 중
                    </GlassButton>
                  ) : (
                    <>
                    <GlassButton
                      variant="primary"
                      size="md"
                      onClick={handleCheckoutClick}
                      disabled={!canStartCheckout || isCheckoutLoading}
                      style={{
                        width: '100%',
                        marginTop: 'auto',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                        boxShadow: `0 4px 14px ${plan.color}30`,
                        color: 'white',
                      }}
                    >
                      {isCheckoutLoading ? '준비 중...' : '결제하기'}
                    </GlassButton>
                    {checkoutError && (
                      <p style={{
                        margin: '0.5rem 0 0',
                        color: '#fca5a5',
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                        fontFamily: 'var(--font-main)',
                      }}>
                        {checkoutError}
                      </p>
                    )}
                    {!canStartCheckout && (
                      <p style={{
                        margin: '0.5rem 0 0',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                        fontFamily: 'var(--font-main)',
                      }}>
                        이벤트 관리자 로그인 후 결제를 진행할 수 있습니다.
                      </p>
                    )}
                    </>
                  )
                ) : (
                  <GlassButton
                    variant="ghost"
                    size="md"
                    disabled
                    style={{
                      width: '100%',
                      marginTop: 'auto',
                      justifyContent: 'center',
                      opacity: 0.7,
                    }}
                  >
                    기본 제공
                  </GlassButton>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── Footer note ── */}
      <div style={{
        marginTop: '1rem',
        color: 'var(--text-tertiary)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-main)',
        textAlign: 'center',
        lineHeight: 1.6,
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다.<br />
        모든 유료 상품은 환불이 불가합니다.
      </div>
    </div>
  );
};

export default PremiumDashboard;
