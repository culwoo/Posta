import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, X, Zap, Users, MessageCircleHeart, Calendar } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import GlassToast from '../../components/ui/GlassToast';
import { db, doc, onSnapshot } from '../../api/firebase';
import { TIER_PRICES, getTierColor } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { getManagedEvents } from '../../utils/dashboardData';
import { openCheckout } from '../../utils/checkout';

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
    description: 'Posta의 모든 핵심 기능을 무료로 시작하세요.',
    icon: Users,
    color: getTierColor('free'),
    highlight: false,
  },
  {
    id: 'plus',
    name: 'Plus Pass',
    price: TIER_PRICES.plus,
    period: '/ 공연 (일회성)',
    description: '관객과 소통하는 응원 게시판을 열고, 광고 없는 쾌적한 화면을 제공하세요.',
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
  const { user } = useAuth();
  const [events, setEvents] = React.useState([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [checkoutLoadingId, setCheckoutLoadingId] = React.useState(null);
  const [showToast, setShowToast] = React.useState(false);

  // Fetch user's events
  React.useEffect(() => {
    if (!user?.uid) { setEventsLoading(false); return; }
    const load = async () => {
      try {
        const allEvents = await getManagedEvents(user.uid);
        // Only show events where user is organizer
        setEvents(allEvents.filter(e => e.userRole === 'organizer'));
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  // Real-time billing listener for all organizer events
  React.useEffect(() => {
    if (!events.length) return;
    const unsubs = events.map(ev =>
      onSnapshot(doc(db, 'events', ev.id), (snap) => {
        if (!snap.exists()) return;
        const newTier = snap.data().billing?.tier || 'free';
        setEvents(prev => prev.map(e => {
          if (e.id !== ev.id) return e;
          const oldTier = e.billing?.tier || 'free';
          if (oldTier !== 'plus' && newTier === 'plus') {
            setShowToast(true);
            setCheckoutLoadingId(null);
            setTimeout(() => setShowToast(false), 3000);
          }
          return { ...e, billing: { ...e.billing, tier: newTier } };
        }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 결제 모달이 자동으로 닫힐 때 로딩 상태 해제
  React.useEffect(() => {
    const handleCheckoutSuccess = () => setCheckoutLoadingId(null);
    const handleCheckoutCancel = () => setCheckoutLoadingId(null);

    window.addEventListener('posta:checkout-success', handleCheckoutSuccess);
    window.addEventListener('posta:checkout-cancel', handleCheckoutCancel);
    return () => {
        window.removeEventListener('posta:checkout-success', handleCheckoutSuccess);
        window.removeEventListener('posta:checkout-cancel', handleCheckoutCancel);
    };
  }, []);

  const handleCheckout = React.useCallback(async (eventId) => {
    if (checkoutLoadingId) return;
    setCheckoutLoadingId(eventId);
    try {
      await openCheckout(eventId);
      setTimeout(() => setCheckoutLoadingId(null), 3000);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('결제 창을 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setCheckoutLoadingId(null);
    }
  }, [checkoutLoadingId]);

  const freeEvents = events.filter(e => (e.billing?.tier || 'free') !== 'plus');
  const plusEvents = events.filter(e => (e.billing?.tier || 'free') === 'plus');

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
          공연별로 Plus Pass를 적용하여 관객 경험을 한 단계 높이세요.
        </p>
      </div>

      {/* ═══════════════ 응원 게시판 소개 ═══════════════ */}
      <GlassCard level={2} style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(168,85,247,0.03) 100%)',
        border: '1px solid rgba(139,92,246,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageCircleHeart size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{
              margin: '0 0 0.4rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-main)',
              letterSpacing: '-0.02em',
            }}>
              응원 게시판이란?
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-main)',
              lineHeight: 1.65,
            }}>
              관객들이 공연에 대한 응원, 감상, 추억을 자유롭게 남기는 소통 공간이에요.
              공연 전 설렘, 공연 중 감동, 공연 후 여운까지 — 관객의 목소리가 모여
              공연을 더 특별하게 만듭니다.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════ Section: Plan Comparison ═══════════════ */}
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

                <p style={{
                  margin: '0 0 0.75rem',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-main)',
                  minHeight: '2.5rem',
                }}>
                  {plan.description}
                </p>

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

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ═══════════════ Section: My Events ═══════════════ */}
      <div>
        <h3 style={{
          margin: '0 0 0.75rem',
          fontSize: '1.05rem',
          fontWeight: 600,
          fontFamily: 'var(--font-main)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          내 이벤트 현황
        </h3>

        {eventsLoading ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontFamily: 'var(--font-main)' }}>
            이벤트를 불러오는 중...
          </p>
        ) : events.length === 0 ? (
          <GlassCard level={2} style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{
              margin: '0 0 0.75rem',
              color: 'var(--text-tertiary)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-main)',
            }}>
              아직 만든 이벤트가 없어요.
            </p>
            <Link
              to="/dashboard/create"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                padding: '0.5rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              + 새 이벤트 만들기
            </Link>
          </GlassCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Plus events first, then free events */}
            {[...plusEvents, ...freeEvents].map((ev) => {
              const isPlus = (ev.billing?.tier || 'free') === 'plus';
              const isLoading = checkoutLoadingId === ev.id;
              return (
                <GlassCard
                  key={ev.id}
                  level={2}
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    ...(isPlus ? {
                      border: '1px solid rgba(16,185,129,0.2)',
                      background: 'rgba(16,185,129,0.04)',
                    } : {}),
                  }}
                >
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-main)',
                      marginBottom: '0.2rem',
                    }}>
                      {ev.title || '(제목 없음)'}
                    </div>
                    {ev.date && (
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}>
                        <Calendar size={12} /> {ev.date}
                      </div>
                    )}
                  </div>

                  {isPlus ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: '#10b981',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-main)',
                    }}>
                      <Check size={14} /> Plus 이용 중
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(ev.id)}
                      disabled={!!checkoutLoadingId}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: checkoutLoadingId ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
                      }}
                    >
                      {isLoading ? '준비 중...' : 'Plus 결제하기'}
                    </button>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
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
        결제는 Lemon Squeezy를 통해 안전하게 처리됩니다.<br />
        모든 유료 상품은 환불이 불가합니다.
      </div>

      <GlassToast
        isVisible={showToast}
        message="Plus 패스가 활성화되었습니다!"
        onClose={() => setShowToast(false)}
        type="success"
      />
    </div>
  );
};

export default PremiumDashboard;
