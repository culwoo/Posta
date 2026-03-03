import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Check, X, Zap, Users, Star, Shield, Sparkles } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { TIER_PRICES, ACCOUNT_PREMIUM_PRICE, getTierLabel, getTierColor } from '../../utils/permissions';

/* ─────────────────────────── Data ─────────────────────────── */

const EVENT_FEATURES = [
  { key: 'home',     label: '홈 페이지',        free: true,  basic: true,  pro: true },
  { key: 'info',     label: '공연 정보',        free: true,  basic: true,  pro: true },
  { key: 'reserve',  label: '예매 / 좌석 선택',  free: true,  basic: true,  pro: true },
  { key: 'admin',    label: '관리자 패널',       free: true,  basic: true,  pro: true },
  { key: 'board',    label: '커뮤니티 보드',     free: false, basic: true,  pro: true },
  { key: 'checkin',  label: 'QR 체크인',        free: false, basic: false, pro: true },
  { key: 'onsite',   label: '현장 관리',        free: false, basic: false, pro: true },
  { key: 'audience', label: '관객 대시보드',     free: false, basic: false, pro: true },
];

const eventPlans = [
  {
    id: 'free',
    name: 'Free',
    price: TIER_PRICES.free,
    period: '/ 공연',
    description: '소규모 공연을 무료로 시작하세요.',
    icon: Users,
    color: getTierColor('free'),
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Basic Pass',
    price: TIER_PRICES.basic,
    period: '/ 공연',
    description: '커뮤니티 보드로 관객과 소통하세요.',
    icon: Zap,
    color: getTierColor('basic'),
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro Pass',
    price: TIER_PRICES.pro,
    period: '/ 공연',
    description: '모든 기능을 활용한 완벽한 공연 운영.',
    icon: Crown,
    color: getTierColor('pro'),
    highlight: false,
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
  const { user, accountPremium } = useAuth();
  const isPremiumActive = accountPremium?.active === true;

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
          공연별 이벤트 패스와 계정 프리미엄으로 Posta를 120% 활용하세요.
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
          공연 생성 시 일회성으로 구매합니다. 환불은 불가합니다.
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {EVENT_FEATURES.map((f) => {
                    const enabled = f[plan.id];
                    return (
                      <div key={f.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.83rem',
                        color: enabled ? 'var(--text-secondary)' : 'rgba(255,255,255,0.25)',
                        fontFamily: 'var(--font-main)',
                      }}>
                        <FeatureMark enabled={enabled} color={plan.color} />
                        {f.label}
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <GlassButton
                  variant={plan.id === 'free' ? 'ghost' : 'primary'}
                  size="md"
                  disabled
                  style={{
                    width: '100%',
                    marginTop: 'auto',
                    justifyContent: 'center',
                    opacity: 0.7,
                    ...(plan.id !== 'free' ? {
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                      boxShadow: `0 4px 14px ${plan.color}30`,
                    } : {}),
                  }}
                >
                  {plan.id === 'free' ? '기본 제공' : 'Coming Soon'}
                </GlassButton>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ═══════════════ Section 2: Account Premium ═══════════════ */}
      <GlassCard
        level={2}
        style={{
          padding: '1.5rem',
          border: isPremiumActive ? '1px solid rgba(245,158,11,0.35)' : undefined,
          background: isPremiumActive
            ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)'
            : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Star size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-main)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}>
                Account Premium
              </h3>
              {isPremiumActive && (
                <span style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-main)',
                }}>
                  활성
                </span>
              )}
            </div>
            <p style={{
              margin: '0.25rem 0 0.75rem',
              color: 'var(--text-tertiary)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-main)',
            }}>
              계정 단위로 한 번 구매하면 영구적으로 적용됩니다.
            </p>

            {/* Premium features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: '모든 광고 제거', desc: '대시보드 및 이벤트 페이지에서 광고가 사라집니다.' },
                { label: '고급 분석 대시보드', desc: '예매 전환율, 시간대별 트래픽, 관객 인사이트를 확인합니다.' },
              ].map((feat, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-main)',
                }}>
                  <Sparkles size={14} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{feat.label}</span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.35rem' }}>— {feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price + CTA */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            minWidth: '160px',
            textAlign: 'right',
          }}>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-main)',
              letterSpacing: '-0.03em',
            }}>
              ₩{ACCOUNT_PREMIUM_PRICE.toLocaleString()}
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                marginLeft: '0.2rem',
              }}>
                / 계정 (영구)
              </span>
            </div>
            <GlassButton
              variant="primary"
              size="md"
              disabled
              style={{
                marginTop: '0.75rem',
                opacity: isPremiumActive ? 0.5 : 0.7,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.25)',
                justifyContent: 'center',
                minWidth: '140px',
              }}
            >
              {isPremiumActive ? '구매 완료' : 'Coming Soon'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* ── Footer note ── */}
      <div style={{
        color: 'var(--text-tertiary)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-main)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다.<br />
        모든 유료 상품은 환불이 불가합니다.
      </div>
    </div>
  );
};

export default PremiumDashboard;
