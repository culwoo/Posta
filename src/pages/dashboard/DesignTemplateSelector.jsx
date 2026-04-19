import React, { useCallback, useMemo, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Lock, Palette } from 'lucide-react';
import { DESIGN_PRESETS, DEFAULT_NOTE_PALETTE } from '../../config/designPresets';

const TEMPLATE_ACCENT = '#8b5cf6';

const arrowButtonStyle = {
    flex: '0 0 30px',
    width: '30px',
    height: '30px',
    padding: 0,
    borderRadius: '50%',
    background: 'var(--ui-surface-soft)',
    border: '1px solid var(--ui-border-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
};

const checkoutButtonStyle = {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
};

const buildCustomPreset = (customThemeSnapshot, defaultTheme) => ({
    id: 'custom',
    label: customThemeSnapshot?.isAiExtracted ? '포스터 맞춤 (AI)' : '기본 스킨',
    subtitle: customThemeSnapshot?.isAiExtracted ? 'AI 추출' : '기본',
    description: '포스터 기반 또는 기본 컬러 팔레트',
    theme: customThemeSnapshot || defaultTheme,
    notePalette: customThemeSnapshot?.notePalette || DEFAULT_NOTE_PALETTE,
});

const PresetCard = ({ preset, isSelected, onSelect }) => (
    <button
        key={preset.id}
        data-tpl-card
        type="button"
        onClick={() => onSelect(preset)}
        style={{
            flex: '0 0 130px',
            scrollSnapAlign: 'start',
            margin: '2px',
            padding: '0',
            borderRadius: '12px',
            border: isSelected ? `1px solid ${TEMPLATE_ACCENT}` : '1px solid var(--ui-border-soft)',
            boxShadow: isSelected ? `0 0 0 1.5px ${TEMPLATE_ACCENT}` : 'none',
            outline: 'none',
            background: 'var(--ui-surface-hover)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        <div style={{
            background: preset.theme.bgPrimary,
            padding: '0.6rem 0.5rem 0.4rem',
            borderBottom: '1px solid var(--ui-border-soft)',
            position: 'relative',
            minHeight: '52px',
        }}>
            {isSelected && (
                <div style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: TEMPLATE_ACCENT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Check size={10} style={{ color: '#fff' }} />
                </div>
            )}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '0.35rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: preset.theme.primary, border: '1px solid rgba(128,128,128,0.2)' }} />
                <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: preset.theme.accent, border: '1px solid rgba(128,128,128,0.2)' }} />
                <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: preset.theme.textPrimary, border: '1px solid rgba(128,128,128,0.2)' }} />
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
                {preset.notePalette.map((color, index) => (
                    <div key={`${preset.id}-${index}`} style={{ width: '12px', height: '6px', borderRadius: '1px', background: color, border: '1px solid rgba(128,128,128,0.15)' }} />
                ))}
            </div>
        </div>
        <div style={{ padding: '0.45rem 0.5rem 0.5rem', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.1rem', lineHeight: 1.2 }}>
                {preset.label}
            </div>
            {preset.subtitle && (
                <div style={{ fontSize: '0.6rem', color: TEMPLATE_ACCENT, fontWeight: 600, marginBottom: '0.15rem' }}>
                    {preset.subtitle}
                </div>
            )}
            <div style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', lineHeight: 1.25 }}>
                {preset.description}
            </div>
        </div>
    </button>
);

const DesignTemplateSelector = ({
    billingTier,
    templateId,
    customThemeSnapshot,
    defaultTheme,
    isCheckoutLoading,
    onPlusCheckout,
    onPreparePlusCheckout,
    onSelectPreset,
}) => {
    const carouselRef = useRef(null);

    const allPresets = useMemo(
        () => [buildCustomPreset(customThemeSnapshot, defaultTheme), ...DESIGN_PRESETS],
        [customThemeSnapshot, defaultTheme]
    );

    const selectedPresetLabel = useMemo(
        () => allPresets.find((preset) => preset.id === templateId)?.label || '',
        [allPresets, templateId]
    );

    const scrollCarousel = useCallback((direction) => {
        if (!carouselRef.current) return;
        const cardWidth = carouselRef.current.querySelector('[data-tpl-card]')?.offsetWidth || 180;
        carouselRef.current.scrollBy({ left: direction * (cardWidth + 10), behavior: 'smooth' });
    }, []);

    return (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--ui-surface-soft)', borderRadius: '8px', border: '1px solid var(--ui-border-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Palette size={16} style={{ color: TEMPLATE_ACCENT }} /> 디자인 템플릿
                </h4>
                {billingTier === 'plus' && templateId !== 'custom' && (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check size={12} /> {selectedPresetLabel}
                    </span>
                )}
            </div>

            {billingTier !== 'plus' ? (
                <div style={{
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(168,85,247,0.03) 100%)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    borderRadius: '10px',
                    textAlign: 'center',
                }}>
                    <Lock size={20} style={{ color: TEMPLATE_ACCENT, marginBottom: '0.5rem' }} />
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        프리미엄 디자인 템플릿으로 이벤트를<br />한층 더 멋지게 꾸며보세요.
                    </p>
                    <button
                        type="button"
                        onMouseEnter={onPreparePlusCheckout}
                        onFocus={onPreparePlusCheckout}
                        onTouchStart={onPreparePlusCheckout}
                        onClick={onPlusCheckout}
                        disabled={isCheckoutLoading}
                        style={{ ...checkoutButtonStyle, cursor: isCheckoutLoading ? 'wait' : 'pointer' }}
                    >
                        {isCheckoutLoading ? '준비 중...' : 'Plus 결제하고 사용하기'}
                    </button>
                </div>
            ) : (
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button type="button" onClick={() => scrollCarousel(-1)} style={arrowButtonStyle} aria-label="이전">
                            <ChevronLeft size={14} strokeWidth={2.5} />
                        </button>

                        <div
                            ref={carouselRef}
                            className="tpl-carousel"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                gap: '0.6rem',
                                overflowX: 'auto',
                                alignItems: 'stretch',
                                scrollSnapType: 'x mandatory',
                                scrollBehavior: 'smooth',
                                padding: '4px',
                                msOverflowStyle: 'none',
                                scrollbarWidth: 'none',
                            }}
                        >
                            <style>{`.tpl-carousel::-webkit-scrollbar { display: none; }`}</style>
                            {allPresets.map((preset) => (
                                <PresetCard
                                    key={preset.id}
                                    preset={preset}
                                    isSelected={templateId === preset.id}
                                    onSelect={onSelectPreset}
                                />
                            ))}
                        </div>

                        <button type="button" onClick={() => scrollCarousel(1)} style={arrowButtonStyle} aria-label="다음">
                            <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '0.5rem' }}>
                        {allPresets.map((preset) => (
                            <div
                                key={preset.id}
                                style={{
                                    width: templateId === preset.id ? '16px' : '5px',
                                    height: '5px',
                                    borderRadius: '3px',
                                    background: templateId === preset.id ? TEMPLATE_ACCENT : 'var(--ui-border-soft)',
                                    transition: 'all 0.2s ease',
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesignTemplateSelector;
