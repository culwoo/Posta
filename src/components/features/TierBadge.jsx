import React from 'react';
import { motion } from 'framer-motion';
import { getTierLabel, getTierColor } from '../../utils/permissions';

/**
 * Displays the current event tier as a small badge.
 * Free = gray, Basic = blue, Pro = purple gradient.
 */
export function TierBadge({ tier, size = 'sm' }) {
  if (!tier || tier === 'free') {
    return null; // Don't show badge for free tier
  }

  const label = getTierLabel(tier);
  const color = getTierColor(tier);
  const isPro = tier === 'pro';

  const sizes = {
    sm: { fontSize: '0.6875rem', padding: '2px 8px' },
    md: { fontSize: '0.75rem', padding: '3px 10px' },
    lg: { fontSize: '0.8125rem', padding: '4px 12px' },
  };

  const s = sizes[size] || sizes.sm;

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#fff',
        background: isPro
          ? `linear-gradient(135deg, ${color}, #c084fc)`
          : color,
        boxShadow: `0 0 8px ${color}44`,
        ...s,
      }}
    >
      {label}
    </motion.span>
  );
}
