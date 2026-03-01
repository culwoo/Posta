import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Zap, Users, BarChart3, ArrowRight, Ticket, Music, Shield } from 'lucide-react';
import './LandingPage.css';

/* ── Animation variants ── */
const fadeUp = {
    hidden: { opacity: 0, y: 36 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    }),
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: (i = 0) => ({
        opacity: 1,
        scale: 1,
        transition: { delay: i * 0.15, duration: 0.65, ease: [0.16, 1, 0.3, 1] },
    }),
};

/* ── Scroll-triggered section wrapper ── */
function RevealSection({ children, className = '', style }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <motion.section
            ref={ref}
            className={className}
            style={style}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeUp}
        >
            {children}
        </motion.section>
    );
}

/* ═══════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const goToDashboard = () => navigate('/dashboard');

    return (
        <div className="landing">
            {/* ─── Navbar ─── */}
            <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
                <span className="nav-logo">Posta</span>
                <div className="nav-links">
                    <a href="#features" className="nav-link">기능</a>
                    <a href="#how" className="nav-link">사용법</a>
                    <button className="nav-cta" onClick={goToDashboard}>
                        시작하기
                    </button>
                </div>
            </nav>

            {/* ─── Hero Section ─── */}
            <section className="hero landing-section" id="hero">
                <div className="hero-glow" />

                <motion.div
                    className="hero-badge"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <span className="hero-badge-dot" />
                    이벤트 관리의 새로운 기준
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                    공연을 더 특별하게,
                    <br />
                    <span className="hero-title-gradient">Posta</span>
                </motion.h1>

                <motion.p
                    className="hero-subtitle"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                    포스터 한 장이면 충분합니다.
                    <br />
                    AI가 이벤트를 분석하고, 예약부터 체크인까지 모든 걸 자동으로.
                </motion.p>

                <motion.div
                    className="hero-actions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.75 }}
                >
                    <button className="hero-btn-primary" onClick={goToDashboard}>
                        무료로 시작하기
                        <ArrowRight style={{ marginLeft: 8, width: 18, height: 18, verticalAlign: 'middle' }} />
                    </button>
                    <a href="#features" className="hero-btn-secondary">
                        자세히 알아보기
                    </a>
                </motion.div>

                {/* Stats */}
                <motion.div
                    className="stats-row"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.95 }}
                >
                    <div className="stat-item">
                        <div className="stat-value">500+</div>
                        <div className="stat-label">이벤트 생성</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">2,000+</div>
                        <div className="stat-label">예약 처리</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">99%</div>
                        <div className="stat-label">만족도</div>
                    </div>
                </motion.div>

                <div className="hero-scroll-hint">
                    <span>Scroll</span>
                    <div className="scroll-line" />
                </div>
            </section>

            {/* ─── Features ─── */}
            <RevealSection className="landing-section" id="features">
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label">
                        <span className="section-label-line" />
                        핵심 기능
                    </span>
                    <h2 className="section-title">
                        이벤트의 모든 순간을
                        <br />
                        <span className="text-gradient-primary">하나의 플랫폼에서.</span>
                    </h2>
                    <p className="section-desc">
                        복잡한 도구 없이, Posta 하나로 이벤트 기획부터 운영, 분석까지 관리하세요.
                    </p>
                </motion.div>

                <div className="features-grid">
                    {[
                        {
                            icon: <Ticket size={24} />,
                            iconClass: 'icon-primary',
                            title: 'AI 포스터 분석',
                            desc: '포스터를 업로드하면 AI가 날짜, 장소, 테마 색상을 자동으로 추출합니다. 수작업 입력은 이제 그만.',
                        },
                        {
                            icon: <Users size={24} />,
                            iconClass: 'icon-secondary',
                            title: '예약 & 체크인',
                            desc: '관객 예약 링크 생성부터 QR 체크인까지 원클릭. 현장 혼잡 없는 매끄러운 입장 경험을 제공합니다.',
                        },
                        {
                            icon: <BarChart3 size={24} />,
                            iconClass: 'icon-accent',
                            title: '실시간 대시보드',
                            desc: '예약 현황, 체크인 비율, 관객 통계를 한눈에. 데이터 기반으로 다음 공연을 기획하세요.',
                        },
                    ].map((f, i) => (
                        <motion.div
                            key={i}
                            className="feature-card glass-1"
                            variants={scaleIn}
                            custom={i}
                        >
                            <div className={`feature-icon ${f.iconClass}`}>{f.icon}</div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </RevealSection>

            {/* ─── How It Works ─── */}
            <RevealSection className="landing-section" id="how">
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label">
                        <span className="section-label-line" />
                        사용법
                    </span>
                    <h2 className="section-title">
                        3단계만으로
                        <br />
                        <span className="text-gradient-primary">완벽한 이벤트.</span>
                    </h2>
                </motion.div>

                <div className="steps-container">
                    {[
                        {
                            num: '01',
                            title: '포스터 업로드',
                            desc: '공연 포스터를 업로드하세요. AI가 모든 정보를 자동으로 추출합니다.',
                        },
                        {
                            num: '02',
                            title: '링크 공유',
                            desc: '생성된 이벤트 페이지 링크를 관객에게 공유하세요. 예약이 바로 시작됩니다.',
                        },
                        {
                            num: '03',
                            title: '체크인 & 분석',
                            desc: 'QR 코드로 간편 체크인. 공연 후 데이터 리포트를 확인하세요.',
                        },
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            className="step-item glass-1"
                            variants={scaleIn}
                            custom={i}
                        >
                            <div className="step-number">{s.num}</div>
                            <h3 className="step-title">{s.title}</h3>
                            <p className="step-desc">{s.desc}</p>
                            {i < 2 && <div className="step-connector" />}
                        </motion.div>
                    ))}
                </div>
            </RevealSection>

            {/* ─── Showcase / Device Mockup ─── */}
            <RevealSection className="landing-section showcase">
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label">
                        <span className="section-label-line" />
                        미리보기
                    </span>
                    <h2 className="section-title">
                        강력하면서도
                        <br />
                        <span className="text-gradient-primary">아름다운 대시보드.</span>
                    </h2>
                    <p className="section-desc" style={{ margin: '0 auto' }}>
                        한눈에 모든 정보를 파악하고, 직관적인 인터페이스로 이벤트를 관리하세요.
                    </p>
                </motion.div>

                <motion.div className="showcase-mockup" variants={scaleIn} custom={1}>
                    <div className="mockup-frame">
                        <div className="mockup-browser-bar">
                            <div className="mockup-dot red" />
                            <div className="mockup-dot yellow" />
                            <div className="mockup-dot green" />
                            <div className="mockup-url-bar">posta.systems/dashboard</div>
                        </div>
                        <div className="mockup-content">
                            {/* Simulated dashboard cards */}
                            <div className="mockup-card">
                                <div className="mockup-card-title">🎸 인디밴드 라이브 콘서트</div>
                                <div className="mockup-card-sub">2026.03.15 · 홍대 라이브클럽</div>
                                <div className="mockup-stats">
                                    <div className="mockup-stat">
                                        <div className="mockup-stat-value">128</div>
                                        <div className="mockup-stat-label">예약</div>
                                    </div>
                                    <div className="mockup-stat">
                                        <div className="mockup-stat-value">94</div>
                                        <div className="mockup-stat-label">체크인</div>
                                    </div>
                                    <div className="mockup-stat">
                                        <div className="mockup-stat-value">73%</div>
                                        <div className="mockup-stat-label">전환율</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mockup-card" style={{ opacity: 0.6, transform: 'scale(0.95)' }}>
                                <div className="mockup-card-title">🎵 재즈 나이트</div>
                                <div className="mockup-card-sub">2026.03.22 · 이태원 블루노트</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </RevealSection>

            {/* ─── Trusted By / Social Proof ─── */}
            <RevealSection className="landing-section" style={{ textAlign: 'center' }}>
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label" style={{ justifyContent: 'center' }}>
                        <span className="section-label-line" />
                        신뢰
                    </span>
                    <h2 className="section-title">
                        아티스트와 기획자가
                        <br />
                        <span className="text-gradient-primary">선택한 플랫폼.</span>
                    </h2>
                </motion.div>

                <div className="features-grid" style={{ marginTop: 48 }}>
                    {[
                        {
                            icon: <Music size={24} />,
                            iconClass: 'icon-primary',
                            title: '공연 기획자',
                            desc: '"복잡한 예약 시스템 때문에 스트레스받았는데, Posta 덕분에 공연에만 집중할 수 있게 됐어요."',
                        },
                        {
                            icon: <Zap size={24} />,
                            iconClass: 'icon-secondary',
                            title: '인디 아티스트',
                            desc: '"포스터만 올리면 알아서 이벤트 페이지가 만들어져요. 기술에 약한 저도 쉽게 쓸 수 있습니다."',
                        },
                        {
                            icon: <Shield size={24} />,
                            iconClass: 'icon-accent',
                            title: '공연장 매니저',
                            desc: '"QR 체크인이 정말 빠르고, 실시간으로 입장 현황을 볼 수 있어서 현장 운영이 수월해졌어요."',
                        },
                    ].map((t, i) => (
                        <motion.div
                            key={i}
                            className="feature-card glass-1"
                            variants={scaleIn}
                            custom={i}
                        >
                            <div className={`feature-icon ${t.iconClass}`}>{t.icon}</div>
                            <h3 className="feature-title">{t.title}</h3>
                            <p className="feature-desc" style={{ fontStyle: 'italic' }}>{t.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </RevealSection>

            {/* ─── Final CTA ─── */}
            <RevealSection className="final-cta">
                <div className="final-cta-glow" />
                <motion.div variants={fadeUp} custom={0}>
                    <h2 className="final-cta-title">
                        지금 바로
                        <br />
                        <span className="text-gradient-primary">Posta를 시작하세요.</span>
                    </h2>
                    <p className="final-cta-desc">
                        무료로 첫 이벤트를 만들고,
                        <br />
                        공연 관리의 새로운 경험을 느껴보세요.
                    </p>
                    <button className="hero-btn-primary" onClick={goToDashboard}>
                        무료로 시작하기
                        <ArrowRight style={{ marginLeft: 8, width: 18, height: 18, verticalAlign: 'middle' }} />
                    </button>
                </motion.div>
            </RevealSection>

            {/* ─── Footer ─── */}
            <footer className="landing-footer">
                <span className="footer-brand">Posta</span>
                <span className="footer-copy">
                    © 2026 Posta. All rights reserved.
                </span>
            </footer>
        </div>
    );
}
