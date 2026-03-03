import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

/**
 * Displays account premium status badge.
 * Active: gold/amber badge with star.
 * Inactive: hidden.
 */
export function PremiumBadge({ active, size = 'sm' }) {
  if (!active) return null;

  const sizes = {
    sm: { fontSize: '0.6875rem', padding: '2px 8px', iconSize: 12 },
    md: { fontSize: '0.75rem', padding: '3px 10px', iconSize: 14 },
    lg: { fontSize: '0.8125rem', padding: '4px 12px', iconSize: 16 },
  };

  const s = sizes[size] || sizes.sm;

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '9999px',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#fff',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        boxShadow: '0 0 8px rgba(245,158,11,0.3)',
        fontSize: s.fontSize,
        padding: s.padding,
      }}
    >
      <Star size={s.iconSize} fill="currentColor" />
      Premium
    </motion.span>
  );
}
