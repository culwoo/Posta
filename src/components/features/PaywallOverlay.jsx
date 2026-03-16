import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';
import { getTierLabel, getTierColor, TIER_PRICES } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
import { openCheckout } from '../../utils/checkout';

/**
 * Blur overlay shown when a user doesn't have access to a feature.
 * Renders on top of the blurred page content.
 */
export function PaywallOverlay({ featureName, requiredTier, currentTier, price }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { eventData } = useEvent();
  const [isCheckoutLoading, setIsCheckoutLoading] = React.useState(false);

  const displayPrice = price || TIER_PRICES[requiredTier] || 0;
  const requiredLabel = getTierLabel(requiredTier);
  const requiredColor = getTierColor(requiredTier);
  const currentLabel = getTierLabel(currentTier);

  // 현재 로그인한 사용자가 이벤트 생성자인지 (주최자인지) 확인
  const isOrganizer = Boolean(user?.uid && eventData?.createdBy === user.uid);

  const handleCheckoutClick = React.useCallback(async () => {
    if (!eventData?.id || isCheckoutLoading) return;
    setIsCheckoutLoading(true);
    try {
      await openCheckout(eventData.id);
      setTimeout(() => setIsCheckoutLoading(false), 3000);
    } catch (error) {
      console.error('Checkout initialization failed:', error);
      alert('결제 창을 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setIsCheckoutLoading(false);
    }
  }, [eventData?.id, isCheckoutLoading]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ width: '100%', maxWidth: '360px' }}
      >
        <GlassCard level={3} style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Lock icon */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${requiredColor}33, ${requiredColor}11)`,
            border: `1px solid ${requiredColor}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Lock size={24} style={{ color: requiredColor }} />
          </div>

          {/* Feature name */}
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}>
            응원 게시판
          </h3>

          {/* Feature description */}
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--ui-text-muted, rgba(255,255,255,0.6))',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}>
            관객들이 공연에 대한 응원, 감상, 추억을
            <br />자유롭게 남기는 소통 공간이에요.
          </p>

          {/* CTA */}
          {isOrganizer ? (
            <>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--ui-text-muted, rgba(255,255,255,0.45))',
                marginBottom: '0.75rem',
              }}>
                <span style={{ color: requiredColor, fontWeight: 600 }}>{requiredLabel} Pass</span> ₩{displayPrice.toLocaleString()} / 공연
              </div>
              <GlassButton
                variant="primary"
                size="lg"
                onClick={handleCheckoutClick}
                disabled={isCheckoutLoading}
                style={{ width: '100%', marginBottom: '0.75rem' }}
              >
                {isCheckoutLoading ? '결제 창 준비 중...' : '응원 게시판 열기'}
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="md"
                onClick={() => navigate('/dashboard/pricing')}
                style={{ width: '100%', marginBottom: '0.75rem' }}
              >
                요금제 자세히 보기
              </GlassButton>
            </>
          ) : (
             <p style={{
               fontSize: '0.875rem',
               color: 'var(--ui-text-muted, rgba(255,255,255,0.5))',
               marginBottom: '1.25rem',
               lineHeight: 1.6,
             }}>
               이 공연의 주최자가 응원 게시판을 열면
               <br />이곳에서 자유롭게 응원을 남길 수 있어요.
             </p>
          )}

          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ui-text-muted, rgba(255,255,255,0.5))',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            돌아가기
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
