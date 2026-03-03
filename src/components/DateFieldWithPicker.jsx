import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    return { year: y, month: m, day: d };
};

const toDateString = (year, month, day) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const toDisplayLabel = (value, placeholder) => {
    const parsed = parseDate(value);
    if (!parsed) return placeholder;
    return `${parsed.year}년 ${String(parsed.month).padStart(2, '0')}월 ${String(parsed.day).padStart(2, '0')}일`;
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const DateFieldWithPicker = ({
    value,
    onChange,
    disabled = false,
    placeholder = '날짜를 선택하세요',
    buttonLabel = '날짜 선택'
}) => {
    const [fallbackOpen, setFallbackOpen] = useState(false);

    const now = new Date();
    const [fallbackYear, setFallbackYear] = useState(now.getFullYear());
    const [fallbackMonth, setFallbackMonth] = useState(now.getMonth() + 1);
    const [fallbackDay, setFallbackDay] = useState(now.getDate());

    useEffect(() => {
        const parsed = parseDate(value);
        if (!parsed) return;
        setFallbackYear(parsed.year);
        setFallbackMonth(parsed.month);
        setFallbackDay(parsed.day);
    }, [value]);

    const maxDay = useMemo(() => daysInMonth(fallbackYear, fallbackMonth), [fallbackYear, fallbackMonth]);

    useEffect(() => {
        if (fallbackDay > maxDay) setFallbackDay(maxDay);
    }, [maxDay, fallbackDay]);

    const displayLabel = useMemo(() => toDisplayLabel(value, placeholder), [value, placeholder]);

    const years = useMemo(() => {
        const current = now.getFullYear();
        return Array.from({ length: 7 }, (_, i) => current - 1 + i);
    }, []);

    const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

    const openPicker = () => {
        if (disabled) return;
        setFallbackOpen(true);
    };

    const applyFallbackDate = () => {
        onChange(toDateString(fallbackYear, fallbackMonth, Math.min(fallbackDay, maxDay)));
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
                        gap: '0.35rem',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={buttonLabel}
                >
                    <Calendar size={16} />
                </button>
            </div>

            {fallbackOpen && (
                <div
                    onClick={() => setFallbackOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2000,
                        background: 'var(--ui-scrim)',
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
                            border: '1px solid var(--glass-3-border)',
                            background: 'var(--glass-3-bg)',
                            backdropFilter: 'var(--glass-3-blur)',
                            WebkitBackdropFilter: 'var(--glass-3-blur)',
                            boxShadow: 'var(--glass-3-shadow)',
                            padding: '1.2rem'
                        }}
                    >
                        <h4 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1.1rem', textAlign: 'center' }}>날짜 선택</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                            {[
                                { value: fallbackYear, onChange: (e) => setFallbackYear(Number(e.target.value)), options: years.map((y) => ({ v: y, l: `${y}년` })) },
                                { value: fallbackMonth, onChange: (e) => setFallbackMonth(Number(e.target.value)), options: MONTHS.map((m) => ({ v: m, l: `${String(m).padStart(2, '0')}월` })) },
                                { value: fallbackDay, onChange: (e) => setFallbackDay(Number(e.target.value)), options: days.map((d) => ({ v: d, l: `${String(d).padStart(2, '0')}일` })) }
                            ].map((sel, idx) => (
                                <select
                                    key={idx}
                                    value={sel.value}
                                    onChange={sel.onChange}
                                    style={{
                                        padding: '0.6rem 2rem 0.6rem 0.75rem',
                                        borderRadius: 10,
                                        border: '1px solid var(--select-border)',
                                        background: 'var(--select-bg)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-main)',
                                        cursor: 'pointer',
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
                                    border: '1px solid var(--ui-border-soft)',
                                    background: 'var(--glass-1-bg)',
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
                                onClick={applyFallbackDate}
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

export default DateFieldWithPicker;
