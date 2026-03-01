/**
 * WCAG contrast & color utility functions.
 * Shared across ManageEvent (poster theme preview) and Home (timeline theming).
 */

export const hexToSrgb = (hex) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return [0, 0, 0];
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};

export const relativeLuminance = (hex) => {
    const [rs, gs, bs] = hexToSrgb(hex);
    const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLinear(rs) + 0.7152 * toLinear(gs) + 0.0722 * toLinear(bs);
};

export const contrastRatio = (hex1, hex2) => {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

export const ensureContrast = (textHex, bgHex, minRatio = 4.5) => {
    if (contrastRatio(textHex, bgHex) >= minRatio) return textHex;
    const bgLum = relativeLuminance(bgHex);
    return bgLum > 0.5 ? '#1a1a2e' : '#f1e9e9';
};

export const hexToRgba = (hex, alpha = 1) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

export const darkenHex = (hex, amount = 0.25) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return '#1a1a2e';
    const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/* ── HSL utilities for hue shifting ── */

export const hexToHsl = (hex) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return [0, 0, 0];
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let hue;
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / d + 2) / 6;
    else hue = ((r - g) / d + 4) / 6;
    return [hue * 360, s, l];
};

export const hslToHex = (h, s, l) => {
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h / 360 + 1 / 3);
        g = hue2rgb(p, q, h / 360);
        b = hue2rgb(p, q, h / 360 - 1 / 3);
    }
    const toHex = (c) => Math.round(Math.min(255, Math.max(0, c * 255))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/** Shift the hue of a hex colour by `degrees` and optionally clamp saturation/lightness. */
export const hueShift = (hex, degrees) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(((h + degrees) % 360 + 360) % 360, s, l);
};

/** Boost saturation while keeping lightness within a range suitable for icon backgrounds. */
export const adjustForIconBg = (hex, { minSat = 0.5, maxLight = 0.55, minLight = 0.3 } = {}) => {
    const [h, s, l] = hexToHsl(hex);
    const ns = Math.max(s, minSat);
    const nl = Math.min(Math.max(l, minLight), maxLight);
    return hslToHex(h, ns, nl);
};
