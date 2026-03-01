import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';

const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const parseTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return null;
    const [hourRaw, minuteRaw] = value.split(':').map((part) => Number(part));
    if (Number.isNaN(hourRaw) || Number.isNaN(minuteRaw)) return null;
    return {
        hour24: Math.max(0, Math.min(23, hourRaw)),
        minute: Math.max(0, Math.min(59, minuteRaw))
    };
};

const toTimeString = (hour24, minute) => `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const toDisplayLabel = (value, placeholder) => {
    const parsed = parseTime(value);
    if (!parsed) return placeholder;
    const meridiem = parsed.hour24 >= 12 ? '오후' : '오전';
    const hour12 = parsed.hour24 % 12 === 0 ? 12 : parsed.hour24 % 12;
    return `${meridiem} ${String(hour12).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
};

const TimeFieldWithPicker = ({
    value,
    onChange,
    disabled = false,
    placeholder = '시간을 선택하세요',
    buttonLabel = '시간 선택'
}) => {
    const inputRef = useRef(null);
    const [fallbackOpen, setFallbackOpen] = useState(false);
    const [fallbackMeridiem, setFallbackMeridiem] = useState('AM');
    const [fallbackHour, setFallbackHour] = useState(12);
    const [fallbackMinute, setFallbackMinute] = useState(0);

    useEffect(() => {
        const parsed = parseTime(value);
        if (!parsed) return;
        setFallbackMeridiem(parsed.hour24 >= 12 ? 'PM' : 'AM');
        setFallbackHour(parsed.hour24 % 12 === 0 ? 12 : parsed.hour24 % 12);
        setFallbackMinute(parsed.minute);
    }, [value]);

    const displayLabel = useMemo(() => toDisplayLabel(value, placeholder), [value, placeholder]);

    const openPicker = () => {
        if (disabled) return;
        const inputEl = inputRef.current;
        if (!inputEl) return;

        try {
            if (typeof inputEl.showPicker === 'function') {
                inputEl.showPicker();
                return;
            }
        } catch (error) {
            // Fallback modal below.
        }

        setFallbackOpen(true);
    };

    const applyFallbackTime = () => {
        const normalizedHour = fallbackHour % 12;
        const hour24 = fallbackMeridiem === 'PM' ? normalizedHour + 12 : normalizedHour;
        const converted = hour24 === 24 ? 12 : hour24;
        onChange(toTimeString(converted, fallbackMinute));
        setFallbackOpen(false);
    };

    return (
        <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div
                    style={{
                        flex: 1,
                        minHeight: 42,
                        border: '1px solid var(--ui-border-soft)',
                        background: 'var(--ui-surface-soft)',
                        borderRadius: 10,
                        padding: '0.55rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: value ? 'var(--text-primary)' : 'var(--ui-text-weak)',
                        fontWeight: 600
                    }}
                    aria-live="polite"
                >
                    {displayLabel}
                </div>

                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled}
                    style={{
                        minHeight: 42,
                        minWidth: 42,
                        borderRadius: 10,
                        border: '1px solid var(--ui-border-soft)',
                        background: 'var(--ui-surface-soft)',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem 0.75rem',
                        gap: '0.35rem'
                    }}
                    aria-label={buttonLabel}
                >
                    <Clock3 size={16} />
                </button>

                <input
                    ref={inputRef}
                    type="time"
                    value={value || ''}
                    onChange={(event) => onChange(event.target.value)}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none'
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                />
            </div>

            {fallbackOpen && (
                <div
                    onClick={() => setFallbackOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2000,
                        background: 'rgba(5, 7, 16, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: 'min(380px, 100%)',
                            borderRadius: 18,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(18, 24, 42, 0.92)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
                            padding: '1.2rem'
                        }}
                    >
                        <h4 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1.1rem', textAlign: 'center' }}>시간 선택</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                            {[
                                { value: fallbackMeridiem, onChange: (e) => setFallbackMeridiem(e.target.value), options: [{ v: 'AM', l: '오전' }, { v: 'PM', l: '오후' }] },
                                { value: fallbackHour, onChange: (e) => setFallbackHour(Number(e.target.value)), options: HOURS_12.map((h) => ({ v: h, l: `${String(h).padStart(2, '0')}시` })) },
                                { value: fallbackMinute, onChange: (e) => setFallbackMinute(Number(e.target.value)), options: MINUTES.map((m) => ({ v: m, l: `${String(m).padStart(2, '0')}분` })) }
                            ].map((sel, idx) => (
                                <select
                                    key={idx}
                                    value={sel.value}
                                    onChange={sel.onChange}
                                    style={{
                                        padding: '0.6rem 0.5rem',
                                        borderRadius: 10,
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-main)',
                                        cursor: 'pointer',
                                        appearance: 'auto',
                                        WebkitAppearance: 'menulist',
                                    }}
                                >
                                    {sel.options.map((opt) => (
                                        <option key={opt.v} value={opt.v}>{opt.l}</option>
                                    ))}
                                </select>
                            ))}
                        </div>

                        <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setFallbackOpen(false)}
                                style={{
                                    padding: '0.55rem 1rem',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontFamily: 'var(--font-main)',
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={applyFallbackTime}
                                style={{
                                    padding: '0.55rem 1rem',
                                    borderRadius: 10,
                                    border: '1px solid rgba(208, 76, 49, 0.3)',
                                    background: 'linear-gradient(135deg, rgba(208, 76, 49, 0.85), rgba(208, 76, 49, 0.95))',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    fontFamily: 'var(--font-main)',
                                    boxShadow: '0 4px 12px rgba(208, 76, 49, 0.2)',
                                }}
                            >
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TimeFieldWithPicker;
