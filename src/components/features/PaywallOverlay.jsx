import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';
import { getTierLabel, getTierColor, TIER_PRICES } from '../../utils/permissions';

/**
 * Blur overlay shown when a user doesn't have access to a feature.
 * Renders on top of the blurred page content.
 */
export function PaywallOverlay({ featureName, requiredTier, currentTier, price }) {
  const navigate = useNavigate();

  const displayPrice = price || TIER_PRICES[requiredTier] || 0;
  const requiredLabel = getTierLabel(requiredTier);
  const requiredColor = getTierColor(requiredTier);
  const currentLabel = getTierLabel(currentTier);

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
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
            이 기능은 {requiredLabel} 패스가 필요합니다.
          </h3>

          {/* Current tier */}
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--ui-text-muted, rgba(255,255,255,0.5))',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}>
            현재 <span style={{
              color: getTierColor(currentTier),
              fontWeight: 600,
            }}>{currentLabel}</span> 플랜을 사용 중입니다.
            <br />
            응원 게시판과 광고 없는 쾌적한 화면을 위해
            <span style={{
              color: requiredColor,
              fontWeight: 600,
              marginLeft: '0.2rem',
            }}>{requiredLabel} 패스</span>로 업그레이드하세요.
          </p>

          {/* Price */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
          }}>
            ₩{displayPrice.toLocaleString()}
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'var(--ui-text-muted, rgba(255,255,255,0.5))',
              marginLeft: '0.25rem',
            }}>
              / 공연
            </span>
          </div>

          {/* CTA */}
          <GlassButton
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard/premium')}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            {requiredLabel} 업그레이드
          </GlassButton>

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
