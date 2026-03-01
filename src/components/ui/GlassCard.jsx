import React from 'react';
import { motion } from 'framer-motion';

/**
 * GlassCard — Apple-grade glassmorphism card component.
 *
 * Props:
 *   level    {1|2|3}   — glass intensity (1=base, 2=raised, 3=modal)
 *   as       {string}  — HTML element or 'motion.div' (default 'div')
 *   hover    {boolean} — enable hover animation (default false)
 *   className {string} — additional class names
 *   style    {object}  — inline styles
 *   children {node}
 *   ...rest  — forwarded to the root element
 */
const GlassCard = React.forwardRef(function GlassCard(
  { level = 1, hover = false, className = '', style = {}, children, ...rest },
  ref,
) {
  const supportsBackdrop =
    typeof CSS !== 'undefined'
    && (
      CSS.supports('backdrop-filter: blur(1px)')
      || CSS.supports('-webkit-backdrop-filter: blur(1px)')
    );

  const levelStyles = {
    1: {
      background: supportsBackdrop ? 'var(--glass-1-bg)' : 'var(--glass-1-bg-fallback)',
      border: '1px solid var(--glass-1-border)',
      borderTop: '1px solid var(--glass-1-border-top)',
      backdropFilter: supportsBackdrop ? 'var(--glass-1-blur)' : 'none',
      WebkitBackdropFilter: supportsBackdrop ? 'var(--glass-1-blur)' : 'none',
      boxShadow: 'var(--glass-1-shadow)',
    },
    2: {
      background: supportsBackdrop ? 'var(--glass-2-bg)' : 'var(--glass-2-bg-fallback)',
      border: '1px solid var(--glass-2-border)',
      borderTop: '1px solid var(--glass-2-border-top)',
      backdropFilter: supportsBackdrop ? 'var(--glass-2-blur)' : 'none',
      WebkitBackdropFilter: supportsBackdrop ? 'var(--glass-2-blur)' : 'none',
      boxShadow: 'var(--glass-2-shadow)',
    },
    3: {
      background: supportsBackdrop ? 'var(--glass-3-bg)' : 'var(--glass-3-bg-fallback)',
      border: '1px solid var(--glass-3-border)',
      borderTop: '1px solid var(--glass-3-border-top)',
      backdropFilter: supportsBackdrop ? 'var(--glass-3-blur)' : 'none',
      WebkitBackdropFilter: supportsBackdrop ? 'var(--glass-3-blur)' : 'none',
      boxShadow: 'var(--glass-3-shadow)',
    },
  };

  const baseStyle = {
    borderRadius: 'var(--radius-lg)',
    transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    ...levelStyles[level] ?? levelStyles[1],
    ...style,
  };

  if (hover) {
    return (
      <motion.div
        ref={ref}
        style={baseStyle}
        className={className}
        whileHover={{
          scale: 1.01,
          transition: { type: 'spring', stiffness: 300, damping: 30 },
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref} style={baseStyle} className={className} {...rest}>
      {children}
    </div>
  );
});

export default GlassCard;
