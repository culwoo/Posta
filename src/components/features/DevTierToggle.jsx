import React, { useState } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, doc, setDoc } from '../../api/firebase';
import { DEFAULT_BILLING, DEFAULT_PREMIUM } from '../../utils/permissions';

/**
 * Dev-only floating panel to switch event tier and account premium.
 * Only renders when import.meta.env.DEV is true.
 */
export function DevTierToggle() {
  const [collapsed, setCollapsed] = useState(true);
  const { eventData, billing } = useEvent();
  const { user, accountPremium, setAccountPremium } = useAuth();

  // Only show in development
  if (!import.meta.env.DEV) return null;

  const currentTier = billing?.tier || 'free';
  const isPremium = accountPremium?.active === true;

  const handleTierChange = async (newTier) => {
    if (!eventData?.id) return;
    try {
      const newBilling = {
        ...DEFAULT_BILLING,
        tier: newTier,
        price: newTier === 'pro' ? 9900 : newTier === 'basic' ? 4900 : 0,
        purchasedAt: newTier !== 'free' ? new Date().toISOString() : null,
        purchasedBy: newTier !== 'free' ? (user?.uid || null) : null,
      };
      await setDoc(doc(db, 'events', eventData.id), { billing: newBilling }, { merge: true });
    } catch (err) {
      console.error('DevTierToggle: Failed to update tier', err);
    }
  };

  const handlePremiumToggle = async () => {
    if (!user?.uid) return;
    try {
      const newPremium = isPremium
        ? DEFAULT_PREMIUM
        : {
            active: true,
            purchasedAt: new Date().toISOString(),
            features: { adFree: true, advancedAnalytics: true },
          };
      await setDoc(doc(db, 'users', user.uid), { premium: newPremium }, { merge: true });
      setAccountPremium(newPremium);
    } catch (err) {
      console.error('DevTierToggle: Failed to update premium', err);
    }
  };

  const panelStyle = {
    position: 'fixed',
    bottom: '1rem',
    right: '1rem',
    zIndex: 9999,
    fontFamily: "'Pretendard Variable', sans-serif",
  };

  const badgeStyle = {
    background: '#ef4444',
    color: '#fff',
    fontSize: '0.625rem',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  };

  if (collapsed) {
    return (
      <div style={panelStyle}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
          }}
        >
          <span style={badgeStyle}>DEV</span>
          {currentTier.toUpperCase()}
          {isPremium && ' +P'}
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px',
        padding: '1rem',
        minWidth: '200px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}>
          <span style={{ ...badgeStyle, fontSize: '0.6875rem' }}>DEV</span>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0',
            }}
          >
            ✕
          </button>
        </div>

        {/* Event tier */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.375rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Event Tier
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['free', 'basic', 'pro'].map((tier) => (
              <button
                key={tier}
                onClick={() => handleTierChange(tier)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '8px',
                  border: currentTier === tier
                    ? '1px solid rgba(255,255,255,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: currentTier === tier
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: currentTier === tier ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Account premium */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.375rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Account Premium
          </label>
          <button
            onClick={handlePremiumToggle}
            style={{
              width: '100%',
              padding: '6px 0',
              borderRadius: '8px',
              border: isPremium
                ? '1px solid rgba(245,158,11,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              background: isPremium
                ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))'
                : 'rgba(255,255,255,0.05)',
              color: isPremium ? '#fbbf24' : 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {isPremium ? '✦ Active' : 'Inactive'}
          </button>
        </div>
      </div>
    </div>
  );
}
