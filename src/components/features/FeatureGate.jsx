import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PaywallOverlay } from './PaywallOverlay';

/**
 * Feature name display map (Korean labels for the paywall overlay).
 */
const FEATURE_NAMES = {
  board: '커뮤니티 보드',
  checkin: 'QR 체크인',
  onsite: '현장 관리',
  audience: '관객 대시보드',
  advancedAnalytics: '고급 분석',
  adFree: '광고 제거',
};

/**
 * Wrapper component that checks tier and renders children or PaywallOverlay.
 *
 * Usage:
 *   <FeatureGate feature="checkin">
 *     <CheckinPage />
 *   </FeatureGate>
 */
export function FeatureGate({ feature, children }) {
  const { canAccess } = usePermissions();
  const { allowed, requiredTier, currentTier, price } = canAccess(feature);

  if (allowed) {
    return children;
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '60vh' }}>
      {/* Blurred content preview */}
      <div
        style={{
          filter: 'blur(8px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.6,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Paywall overlay on top */}
      <PaywallOverlay
        featureName={FEATURE_NAMES[feature] || feature}
        requiredTier={requiredTier}
        currentTier={currentTier}
        price={price}
      />
    </div>
  );
}
