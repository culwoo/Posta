import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GlassToast = ({ message, isVisible, onClose, type = 'success' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: type === 'success' 
              ? 'linear-gradient(135deg, rgba(80,250,150,0.15), rgba(0,180,100,0.05))'
              : 'linear-gradient(135deg, rgba(255,80,80,0.15), rgba(180,0,0,0.05))',
            border: type === 'success'
              ? '1px solid rgba(80,250,150,0.3)'
              : '1px solid rgba(255,80,80,0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '12px 24px',
            color: type === 'success' ? '#a0ffc8' : '#ff9999',
            fontWeight: '600',
            fontSize: '15px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlassToast;
