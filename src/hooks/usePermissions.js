import { useCallback } from 'react';
import { useEvent } from '../contexts/EventContext';
import { canAccessFeature, getTierLabel, getTierColor } from '../utils/permissions';

/**
 * Hook that wraps permissions.js with context data.
 *
 * Usage:
 *   const { canAccess, currentTier } = usePermissions();
 *   const { allowed, requiredTier, price } = canAccess('adFree');
 */
export function usePermissions() {
  const { billing } = useEvent();

  const canAccess = useCallback(
    (feature) => canAccessFeature(billing, {}, feature), // second argument (userPremium) is deprecated
    [billing]
  );

  const currentTier = billing?.tier || 'free';

  return {
    canAccess,
    currentTier,
    currentTierLabel: getTierLabel(currentTier),
    currentTierColor: getTierColor(currentTier),
    billing,
  };
}
