/**
 * Feature Gating — Permissions Utility
 *
 * Tier hierarchy: free < plus
 * 
 * Account Premium: Removed. Now only Event-level Plus pass exists.
 */

export const TIERS = {
  FREE: 'free',
  PLUS: 'plus',
};

const TIER_RANK = { free: 0, plus: 1 };

/**
 * Which minimum tier each feature requires.
 */
export const TIER_FEATURES = {
  // Event-level features
  home:     TIERS.FREE,
  info:     TIERS.FREE,
  reserve:  TIERS.FREE,
  admin:    TIERS.FREE,
  checkin:  TIERS.FREE,
  onsite:   TIERS.FREE,
  audience: TIERS.FREE,
  advancedAnalytics: TIERS.FREE,

  // Features requiring PLUS pass
  board:    TIERS.PLUS,
  adFree:   TIERS.PLUS,
};

/** Price for each tier (KRW) */
export const TIER_PRICES = {
  free: 0,
  plus: 9900,
};

// Removed ACCOUNT_PREMIUM_PRICE

/**
 * Check if a user can access a feature.
 *
 * @param {{ tier: string }} eventBilling - event's billing info
 * @param {{ active: boolean, features: object }} userPremium - (deprecated) user's premium info, kept for backward compatibility signature but mostly ignored
 * @param {string} feature - feature key from TIER_FEATURES
 * @returns {{ allowed: boolean, requiredTier: string, currentTier: string, price: number }}
 */
export function canAccessFeature(eventBilling, userPremium, feature) {
  const required = TIER_FEATURES[feature];

  if (!required) {
    return { allowed: true, requiredTier: 'free', currentTier: eventBilling?.tier || 'free', price: 0 };
  }

  // Event-level features
  const currentTier = eventBilling?.tier || 'free';
  const currentRank = TIER_RANK[currentTier] ?? 0;
  const requiredRank = TIER_RANK[required] ?? 0;

  return {
    allowed: currentRank >= requiredRank,
    requiredTier: required,
    currentTier,
    price: TIER_PRICES[required] || 0,
  };
}

/** Display label for a tier */
export function getTierLabel(tier) {
  switch (tier) {
    case 'plus':   return 'Plus';
    default:       return 'Free';
  }
}

/** Color token for a tier (CSS variable name or hex fallback) */
export function getTierColor(tier) {
  switch (tier) {
    case 'plus':   return '#8b5cf6'; // violet-500
    default:       return '#6b7280'; // gray-500
  }
}

/** Default billing object for a new event */
export const DEFAULT_BILLING = {
  tier: 'free',
  price: 0,
  purchasedAt: null,
  purchasedBy: null,
  expiresAt: null,
};

/** Default premium object for a new user (deprecated, but keeping structure so we don't break user doc generation) */
export const DEFAULT_PREMIUM = {
  active: false,
  purchasedAt: null,
  features: {
    adFree: false,
    advancedAnalytics: false,
  },
};
