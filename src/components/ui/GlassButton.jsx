import React from 'react';
import { motion } from 'framer-motion';

/**
 * GlassButton — Apple-grade glassmorphism button component.
 *
 * Props:
 *   variant  {'primary'|'secondary'|'ghost'} — visual style
 *   size     {'sm'|'md'|'lg'}               — size preset
 *   disabled {boolean}
 *   className {string}
 *   style    {object}
 *   children {node}
 *   ...rest  — forwarded to the button element
 */
const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--color-primary-light, #e86040) 100%)',
    border: '1px solid rgba(255,255,255,0.20)',
    borderTop: '1px solid rgba(255,255,255,0.35)',
    color: '#ffffff',
    boxShadow: '0 4px 16px rgba(208,76,49,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  secondary: {
    background: 'var(--glass-2-bg)',
    border: '1px solid var(--glass-2-border)',
    borderTop: '1px solid var(--glass-2-border-top)',
    backdropFilter: 'var(--glass-2-blur)',
    WebkitBackdropFilter: 'var(--glass-2-blur)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--glass-2-shadow)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-primary)',
    boxShadow: 'none',
  },
};

const sizeStyles = {
  sm: { padding: '0.4em 0.9em', fontSize: '0.875rem', borderRadius: 'var(--radius-md)' },
  md: { padding: '0.6em 1.2em', fontSize: '1rem', borderRadius: 'var(--radius-md)' },
  lg: { padding: '0.8em 1.6em', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)' },
};

const GlassButton = React.forwardRef(function GlassButton(
  {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    className = '',
    style = {},
    children,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5em',
    fontFamily: 'var(--font-main)',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    outline: 'none',
    userSelect: 'none',
    ...sizeStyles[size] ?? sizeStyles.md,
    ...variantStyles[variant] ?? variantStyles.secondary,
    ...style,
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      className={className}
      style={baseStyle}
      onClick={onClick}
      whileHover={
        disabled
          ? {}
          : {
              scale: 1.02,
              filter: 'brightness(1.08)',
              transition: { type: 'spring', stiffness: 300, damping: 30 },
            }
      }
      whileTap={disabled ? {} : { scale: 0.98 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

export default GlassButton;
