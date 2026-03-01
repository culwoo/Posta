import React from 'react';

/**
 * GlassBackground — Full-screen fixed background with animated gradient blobs.
 * Renders below all content (z-index: -1) and provides the colorful depth
 * that makes glassmorphism visible.
 *
 * Dark mode:  #0a0a0f base + primary (#d04c31), secondary (#00d4aa), accent (#4a9eff) blobs
 * Light mode: #f5f5f7 base + muted pastel versions of the same blobs
 */
export default function GlassBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Base dark layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--bg-primary, #0a0a0f)',
          transition: 'background-color 0.4s ease',
        }}
      />

      {/* Blob 1 — Primary (red-orange), top-left */}
      <div
        className="glass-blob blob-primary"
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          maxWidth: '600px',
          maxHeight: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(208,76,49,0.55) 0%, rgba(208,76,49,0.20) 45%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: 'transform',
          animation: 'blobDrift1 25s ease-in-out infinite alternate',
          opacity: 0.7,
        }}
      />

      {/* Blob 2 — Secondary (teal), bottom-right */}
      <div
        className="glass-blob blob-secondary"
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          maxWidth: '550px',
          maxHeight: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.45) 0%, rgba(0,212,170,0.15) 45%, transparent 70%)',
          filter: 'blur(90px)',
          willChange: 'transform',
          animation: 'blobDrift2 30s ease-in-out infinite alternate',
          animationDelay: '-10s',
          opacity: 0.6,
        }}
      />

      {/* Blob 3 — Accent (blue), center-right */}
      <div
        className="glass-blob blob-accent"
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '40vw',
          height: '40vw',
          maxWidth: '400px',
          maxHeight: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,158,255,0.40) 0%, rgba(74,158,255,0.12) 45%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: 'transform',
          animation: 'blobDrift3 20s ease-in-out infinite alternate',
          animationDelay: '-5s',
          opacity: 0.5,
        }}
      />

      {/* Blob animations as inline styles */}
      <style>{`
        @keyframes blobDrift1 {
          0%   { transform: translate(0,   0)   scale(1.0); }
          33%  { transform: translate(5%,  8%)  scale(1.05); }
          66%  { transform: translate(-3%, 5%)  scale(0.95); }
          100% { transform: translate(8%,  -5%) scale(1.08); }
        }
        @keyframes blobDrift2 {
          0%   { transform: translate(0,   0)   scale(1.0); }
          33%  { transform: translate(-6%, -4%) scale(1.06); }
          66%  { transform: translate(4%,  -8%) scale(0.94); }
          100% { transform: translate(-8%, 5%)  scale(1.10); }
        }
        @keyframes blobDrift3 {
          0%   { transform: translate(0,   0)   scale(1.0); }
          50%  { transform: translate(-5%, 6%)  scale(1.08); }
          100% { transform: translate(3%,  -4%) scale(0.96); }
        }

        /* Light mode blob adjustments */
        html.light .glass-blob,
        :root.light .glass-blob {
          opacity: 0.35 !important;
        }
        html.light .blob-primary,
        :root.light .blob-primary {
          background: radial-gradient(circle, rgba(208,76,49,0.30) 0%, rgba(208,76,49,0.10) 45%, transparent 70%) !important;
        }
        html.light .blob-secondary,
        :root.light .blob-secondary {
          background: radial-gradient(circle, rgba(0,180,140,0.25) 0%, rgba(0,180,140,0.08) 45%, transparent 70%) !important;
        }
        html.light .blob-accent,
        :root.light .blob-accent {
          background: radial-gradient(circle, rgba(74,130,220,0.25) 0%, rgba(74,130,220,0.08) 45%, transparent 70%) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .glass-blob {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
