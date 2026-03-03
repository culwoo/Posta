/**
 * Feature Gating — Permissions Utility
 *
 * Tier hierarchy: free < basic < pro
 * Account Premium: separate, account-level purchase
 */

export const TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
};

const TIER_RANK = { free: 0, basic: 1, pro: 2 };

/**
 * Which minimum tier each feature requires.
 * Account-level features use 'account_premium' instead of a tier.
 */
export const TIER_FEATURES = {
  // Event-level features
  home:     TIERS.FREE,
  info:     TIERS.FREE,
  reserve:  TIERS.FREE,
  admin:    TIERS.FREE,
  board:    TIERS.BASIC,
  checkin:  TIERS.PRO,
  onsite:   TIERS.PRO,
  audience: TIERS.PRO,

  // Account-level features
  adFree:            'account_premium',
  advancedAnalytics: 'account_premium',
};

/** Price for each tier (KRW) */
export const TIER_PRICES = {
  free: 0,
  basic: 4900,
  pro: 9900,
};

export const ACCOUNT_PREMIUM_PRICE = 9900;

/**
 * Check if a user can access a feature.
 *
 * @param {{ tier: string }} eventBilling - event's billing info
 * @param {{ active: boolean, features: { adFree: boolean, advancedAnalytics: boolean } }} userPremium - user's premium info
 * @param {string} feature - feature key from TIER_FEATURES
 * @returns {{ allowed: boolean, requiredTier: string, currentTier: string, price: number }}
 */
export function canAccessFeature(eventBilling, userPremium, feature) {
  const required = TIER_FEATURES[feature];

  if (!required) {
    return { allowed: true, requiredTier: 'free', currentTier: eventBilling?.tier || 'free', price: 0 };
  }

  // Account-level features
  if (required === 'account_premium') {
    const active = userPremium?.active === true;
    const featureActive = userPremium?.features?.[feature] === true;
    return {
      allowed: active && featureActive,
      requiredTier: 'account_premium',
      currentTier: active ? 'account_premium' : 'free',
      price: ACCOUNT_PREMIUM_PRICE,
    };
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
    case 'basic': return 'Basic';
    case 'pro':   return 'Pro';
    case 'account_premium': return 'Premium';
    default:      return 'Free';
  }
}

/** Color token for a tier (CSS variable name or hex fallback) */
export function getTierColor(tier) {
  switch (tier) {
    case 'basic': return '#3b82f6'; // blue-500
    case 'pro':   return '#8b5cf6'; // violet-500
    case 'account_premium': return '#f59e0b'; // amber-500
    default:      return '#6b7280'; // gray-500
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

/** Default premium object for a new user */
export const DEFAULT_PREMIUM = {
  active: false,
  purchasedAt: null,
  features: {
    adFree: false,
    advancedAnalytics: false,
  },
};
