import { useCallback } from 'react';
import { useEvent } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { canAccessFeature, getTierLabel, getTierColor } from '../utils/permissions';

/**
 * Hook that wraps permissions.js with context data.
 *
 * Usage:
 *   const { canAccess, currentTier, isPremium } = usePermissions();
 *   const { allowed, requiredTier, price } = canAccess('checkin');
 */
export function usePermissions() {
  const { billing } = useEvent();
  const { accountPremium } = useAuth();

  const canAccess = useCallback(
    (feature) => canAccessFeature(billing, accountPremium, feature),
    [billing, accountPremium]
  );

  const currentTier = billing?.tier || 'free';
  const isPremium = accountPremium?.active === true;

  return {
    canAccess,
    currentTier,
    currentTierLabel: getTierLabel(currentTier),
    currentTierColor: getTierColor(currentTier),
    isPremium,
    billing,
    accountPremium,
  };
}
