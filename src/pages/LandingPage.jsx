import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    Zap, Users, BarChart3, ArrowRight, Ticket,
    Menu, X, Upload, Share2, QrCode,
    Sparkles, Clock, Globe, Crown, Check, Gift,
    FileText, Banknote, ClipboardList, Repeat,
    Star, CalendarDays, CheckCircle2, TrendingUp, Quote
} from 'lucide-react';
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

const staggerContainer = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
};

/* ── Scroll-triggered section wrapper ── */
function RevealSection({ children, className = '', style, id }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <motion.section
            ref={ref}
            className={className}
            style={style}
            id={id}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeUp}
        >
            {children}
        </motion.section>
    );
}

/* ── Smooth scroll helper ── */
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        const navHeight = 72;
        const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

/* ═══════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    /* ── Scroll tracking ── */
    useEffect(() => {
        const sections = ['hero', 'pain', 'features', 'how', 'showcase', 'testimonials', 'early-access'];
        const onScroll = () => {
            setScrolled(window.scrollY > 40);

            const scrollPos = window.scrollY + 200;
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i]);
                if (el && el.offsetTop <= scrollPos) {
                    setActiveSection(sections[i]);
                    break;
                }
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* ── Lock body on mobile menu ── */
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    const handleNavClick = useCallback((id) => {
        scrollToSection(id);
        setMobileMenuOpen(false);
    }, []);

    const goToDashboard = () => navigate('/dashboard');

    return (
        <div className="landing">
            {/* ─── Navbar ─── */}
            <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
                <span
                    className="nav-logo"
                    onClick={() => scrollToSection('hero')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('hero'); } }}
                    role="button"
                    tabIndex={0}
                    aria-label="맨 위로 스크롤"
                >
                    Posta
                </span>

                <div className="nav-links desktop-only">
                    <button
                        className={`nav-link${activeSection === 'features' ? ' active' : ''}`}
                        onClick={() => handleNavClick('features')}
                    >
                        기능
                    </button>
                    <button
                        className={`nav-link${activeSection === 'how' ? ' active' : ''}`}
                        onClick={() => handleNavClick('how')}
                    >
                        사용법
                    </button>
                    <button
                        className={`nav-link${activeSection === 'early-access' ? ' active' : ''}`}
                        onClick={() => handleNavClick('early-access')}
                    >
                        혜택
                    </button>
                    <button className="nav-cta" onClick={goToDashboard}>
                        시작하기
                    </button>
                </div>

                {/* Mobile menu toggle */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="메뉴"
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </nav>

            {/* ─── Mobile Menu Overlay ─── */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        className="mobile-menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <motion.div
                            className="mobile-menu glass-2"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mobile-menu-header">
                                <span className="nav-logo">Posta</span>
                            </div>
                            <div className="mobile-menu-links">
                                <button onClick={() => handleNavClick('features')}>기능</button>
                                <button onClick={() => handleNavClick('how')}>사용법</button>
                                <button onClick={() => handleNavClick('early-access')}>혜택</button>
                            </div>
                            <button className="mobile-menu-cta" onClick={() => { setMobileMenuOpen(false); goToDashboard(); }}>
                                무료로 시작하기
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Hero Section ─── */}
            <section className="hero landing-section" id="hero">
                <div className="hero-glow" />
                <div className="hero-grid-bg" />

                {/* Floating orbit elements */}
                <div className="hero-orbit">
                    <div className="orbit-ring ring-1" />
                    <div className="orbit-ring ring-2" />
                    <div className="orbit-dot dot-1"><Ticket size={16} /></div>
                    <div className="orbit-dot dot-2"><QrCode size={14} /></div>
                    <div className="orbit-dot dot-3"><BarChart3 size={14} /></div>
                </div>

                <motion.div
                    className="hero-badge"
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <span className="hero-badge-dot" />
                    공연 운영 자동화 플랫폼
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                    구글 폼과 종이 명단,
                    <br />
                    <span className="hero-title-gradient">이제 놓으세요.</span>
                </motion.h1>

                <motion.p
                    className="hero-subtitle"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                    포스터 한 장이면 여러 공연의 예약, 입금 확인, 체크인까지 전부 자동.
                    <br />
                    공연팀은 무대에만 집중하세요.
                </motion.p>

                <motion.div
                    className="hero-actions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.75 }}
                >
                    <button className="hero-btn-primary" onClick={goToDashboard}>
                        <Sparkles size={18} />
                        무료로 시작하기
                        <ArrowRight size={18} />
                    </button>
                    <button className="hero-btn-secondary" onClick={() => scrollToSection('features')}>
                        자세히 알아보기
                    </button>
                </motion.div>

                <div
                    className="hero-scroll-hint"
                    onClick={() => scrollToSection('features')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('features'); } }}
                    role="button"
                    aria-label="기능 섹션으로 스크롤"
                    tabIndex={0}
                >
                    <span>Scroll</span>
                    <div className="scroll-line" />
                </div>
            </section>

            {/* ─── Pain Points ─── */}
            <RevealSection className="landing-section" id="pain">
                <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center' }}>
                    <span className="section-label" style={{ justifyContent: 'center' }}>
                        <span className="section-label-line" />
                        현실
                    </span>
                    <h2 className="section-title" style={{ textAlign: 'center' }}>
                        혹시 지금도
                        <br />
                        <span className="text-gradient-primary">이렇게 운영하고 계신가요?</span>
                    </h2>
                </motion.div>

                <motion.div className="pain-grid" variants={staggerContainer}>
                    {[
                        {
                            icon: <Banknote size={22} />,
                            title: '밤새 입금 대조',
                            desc: '이름 세 글자뿐인 입금 내역과 구글 폼 시트를 일일이 대조. 동명이인이면 식은땀.',
                            quote: '운영자',
                            color: '#ff6b4a',
                        },
                        {
                            icon: <ClipboardList size={22} />,
                            title: '종이 명단 체크인',
                            desc: '데스크에 2~3명이 붙어서 이름 찾기. 줄은 길어지고, 관객은 화나고, 공연은 지연.',
                            quote: '스태프',
                            color: '#f6c458',
                        },
                        {
                            icon: <FileText size={22} />,
                            title: '4개 앱을 오가는 운영',
                            desc: '인스타에 공연 정보, 구글 폼에 예약, 은행 앱에 입금, 카톡으로 확인. 전부 따로.',
                            quote: '관객',
                            color: '#4a9eff',
                        },
                        {
                            icon: <Repeat size={22} />,
                            title: '매 공연마다 처음부터',
                            desc: '하나도 힘든데, 여러 공연을 동시에? 같은 수작업을 공연마다 반복하는 악순환.',
                            quote: '기획자',
                            color: '#00d4aa',
                        },
                    ].map((p, i) => (
                        <motion.div key={i} className="pain-card" variants={scaleIn} custom={i} style={{ '--pain-color': p.color }}>
                            <div className="pain-icon">{p.icon}</div>
                            <h3 className="pain-title">{p.title}</h3>
                            <p className="pain-desc">{p.desc}</p>
                            <span className="pain-who">{p.quote}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </RevealSection>

            {/* ─── Features ─── */}
            <RevealSection className="landing-section" id="features">
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label">
                        <span className="section-label-line" />
                        Posta의 해결
                    </span>
                    <h2 className="section-title">
                        이 모든 문제를
                        <br />
                        <span className="text-gradient-primary">하나의 플랫폼으로.</span>
                    </h2>
                    <p className="section-desc">
                        구글 폼, 은행 앱, 종이 명단 — 다 필요 없습니다. Posta 하나로 여러 공연의 기획부터 운영, 분석까지.
                    </p>
                </motion.div>

                <motion.div className="features-grid" variants={staggerContainer}>
                    {[
                        {
                            icon: <Ticket size={26} />,
                            color: '#e86040',
                            colorRgb: '232, 96, 64',
                            title: 'AI 포스터 분석',
                            desc: '포스터를 업로드하면 AI가 날짜, 장소, 테마 색상을 자동으로 추출합니다. 수작업 입력은 이제 그만.',
                            tag: 'AI Powered',
                        },
                        {
                            icon: <Users size={26} />,
                            color: '#00d4aa',
                            colorRgb: '0, 212, 170',
                            title: '예약 & 체크인',
                            desc: '관객 예약 링크 생성부터 QR 체크인까지 원클릭. 현장 혼잡 없는 매끄러운 입장 경험을 제공합니다.',
                            tag: 'One-click',
                        },
                        {
                            icon: <BarChart3 size={26} />,
                            color: '#4a9eff',
                            colorRgb: '74, 158, 255',
                            title: '실시간 대시보드',
                            desc: '예약 현황, 체크인 비율, 관객 통계를 한눈에. 데이터 기반으로 다음 공연을 기획하세요.',
                            tag: 'Real-time',
                        },
                    ].map((f, i) => (
                        <motion.div
                            key={i}
                            className="feature-card"
                            variants={scaleIn}
                            custom={i}
                            style={{ '--card-color': f.color, '--card-color-rgb': f.colorRgb }}
                        >
                            <div className="feature-card-glow" />
                            <div className="feature-card-inner">
                                <div className="feature-card-top">
                                    <div className="feature-icon">{f.icon}</div>
                                    <span className="feature-tag">{f.tag}</span>
                                </div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
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
                    <p className="section-desc">
                        복잡한 설정 없이 누구나 쉽게. 포스터 한 장이면 이벤트가 완성됩니다.
                    </p>
                </motion.div>

                <div className="steps-container">
                    <div className="steps-line" />
                    {[
                        {
                            num: '01',
                            icon: <Upload size={28} />,
                            title: '포스터 업로드',
                            desc: '공연 포스터를 업로드하세요. AI가 모든 정보를 자동으로 추출합니다.',
                            color: '#e86040',
                        },
                        {
                            num: '02',
                            icon: <Share2 size={28} />,
                            title: '링크 공유',
                            desc: '생성된 이벤트 페이지 링크를 관객에게 공유하세요. 예약이 바로 시작됩니다.',
                            color: '#00d4aa',
                        },
                        {
                            num: '03',
                            icon: <QrCode size={28} />,
                            title: '체크인 & 분석',
                            desc: 'QR 코드로 간편 체크인. 공연 후 데이터 리포트를 확인하세요.',
                            color: '#4a9eff',
                        },
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            className="step-item"
                            variants={scaleIn}
                            custom={i}
                            style={{ '--step-color': s.color }}
                        >
                            <div className="step-icon-wrapper">
                                <div className="step-icon-ring" />
                                <div className="step-icon">{s.icon}</div>
                            </div>
                            <div className="step-number">{s.num}</div>
                            <h3 className="step-title">{s.title}</h3>
                            <p className="step-desc">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </RevealSection>

            {/* ─── Showcase / Device Mockup ─── */}
            <RevealSection className="landing-section showcase" id="showcase">
                <motion.div variants={fadeUp} custom={0}>
                    <span className="section-label" style={{ justifyContent: 'center' }}>
                        <span className="section-label-line" />
                        미리보기
                    </span>
                    <h2 className="section-title" style={{ textAlign: 'center' }}>
                        강력하면서도
                        <br />
                        <span className="text-gradient-primary">아름다운 대시보드.</span>
                    </h2>
                    <p className="section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>
                        한눈에 모든 정보를 파악하고, 직관적인 인터페이스로 이벤트를 관리하세요.
                    </p>
                </motion.div>

                <motion.div className="showcase-mockup" variants={scaleIn} custom={1}>
                    <div className="showcase-glow" />
                    <div className="mockup-frame">
                        <div className="mockup-browser-bar">
                            <div className="mockup-dots">
                                <div className="mockup-dot red" />
                                <div className="mockup-dot yellow" />
                                <div className="mockup-dot green" />
                            </div>
                            <div className="mockup-url-bar">
                                <Globe size={12} style={{ opacity: 0.5 }} />
                                posta.systems/dashboard
                            </div>
                        </div>
                        <div className="mockup-content">
                            <div className="mockup-sidebar">
                                <div className="mockup-sidebar-logo">P</div>
                                <div className="mockup-sidebar-item active" />
                                <div className="mockup-sidebar-item" />
                                <div className="mockup-sidebar-item" />
                            </div>
                            <div className="mockup-main">
                                <div className="mockup-header-row">
                                    <div className="mockup-header-title">내 이벤트</div>
                                    <div className="mockup-header-btn">+ 새 이벤트</div>
                                </div>
                                <div className="mockup-cards-row">
                                    {/* Primary card — LIVE with mini chart */}
                                    <div className="mockup-card primary">
                                        <div className="mockup-card-glow-pulse" />
                                        <div className="mockup-card-badge">LIVE</div>
                                        <div className="mockup-card-title">인디밴드 라이브 콘서트</div>
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
                                        <div className="mockup-mini-chart">
                                            {[40, 65, 45, 80, 60, 90, 73].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="mockup-chart-bar"
                                                    style={{ '--bar-height': `${h}%`, '--bar-delay': `${i * 0.1}s` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="mockup-progress">
                                            <div className="mockup-progress-bar" style={{ width: '73%' }} />
                                        </div>
                                    </div>

                                    {/* Secondary card — upcoming with status badge */}
                                    <div className="mockup-card">
                                        <div className="mockup-card-status-badge upcoming">
                                            <CalendarDays size={10} />
                                            D-19
                                        </div>
                                        <div className="mockup-card-title">재즈 나이트</div>
                                        <div className="mockup-card-sub">2026.03.22 · 이태원 블루노트</div>
                                        <div className="mockup-stats">
                                            <div className="mockup-stat">
                                                <div className="mockup-stat-value">64</div>
                                                <div className="mockup-stat-label">예약</div>
                                            </div>
                                            <div className="mockup-stat">
                                                <div className="mockup-stat-value">—</div>
                                                <div className="mockup-stat-label">체크인</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Third card — completed event */}
                                    <div className="mockup-card completed">
                                        <div className="mockup-card-status-badge done">
                                            <CheckCircle2 size={10} />
                                            완료
                                        </div>
                                        <div className="mockup-card-title">어쿠스틱 밤</div>
                                        <div className="mockup-card-sub">2026.02.28 · 합정 카페홀</div>
                                        <div className="mockup-stats">
                                            <div className="mockup-stat">
                                                <div className="mockup-stat-value">56</div>
                                                <div className="mockup-stat-label">예약</div>
                                            </div>
                                            <div className="mockup-stat">
                                                <div className="mockup-stat-value">51</div>
                                                <div className="mockup-stat-label">체크인</div>
                                            </div>
                                            <div className="mockup-stat">
                                                <div className="mockup-stat-value">91%</div>
                                                <div className="mockup-stat-label">전환율</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating decoration — enhanced */}
                    <div className="showcase-float float-1">
                        <TrendingUp size={14} />
                        <span>실시간 업데이트</span>
                        <span className="showcase-float-num">+12%</span>
                    </div>
                    <div className="showcase-float float-2">
                        <Zap size={14} />
                        <span>AI 자동 분석</span>
                    </div>
                    <div className="showcase-float float-3">
                        <Users size={14} />
                        <span>248명 접속 중</span>
                    </div>
                </motion.div>
            </RevealSection>

            {/* ─── Testimonials / Social Proof ─── */}
            <RevealSection className="landing-section" id="testimonials">
                <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center' }}>
                    <span className="section-label" style={{ justifyContent: 'center' }}>
                        <span className="section-label-line" />
                        사용자 후기
                    </span>
                    <h2 className="section-title" style={{ textAlign: 'center' }}>
                        먼저 경험한 팀들의
                        <br />
                        <span className="text-gradient-primary">솔직한 후기.</span>
                    </h2>
                    <p className="section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>
                        베타 테스터들이 직접 전해주는 이야기입니다.
                    </p>
                </motion.div>

                <motion.div className="testimonial-grid" variants={staggerContainer}>
                    {[
                        {
                            name: '김도윤',
                            role: '인디밴드 보컬',
                            initial: '도',
                            color: '#e86040',
                            quote: '입금 대조에 3시간 걸리던 게 자동으로 끝나요. 공연 전날 밤새는 일이 사라졌습니다.',
                            stars: 5,
                        },
                        {
                            name: '박서연',
                            role: '소규모 공연장 매니저',
                            initial: '서',
                            color: '#4a9eff',
                            quote: '종이 명단 없이 QR 체크인만으로 입장이 끝나요. 관객 대기 시간이 절반으로 줄었습니다.',
                            stars: 5,
                        },
                        {
                            name: '이준혁',
                            role: '대학 동아리 회장',
                            initial: '준',
                            color: '#00d4aa',
                            quote: '구글 폼 4개 관리하다 Posta 하나로 정리했어요. 동아리원들도 훨씬 편해했습니다.',
                            stars: 5,
                        },
                    ].map((t, i) => (
                        <motion.div key={i} className="testimonial-card" variants={scaleIn} custom={i}>
                            <div className="testimonial-profile">
                                <div className="testimonial-avatar" style={{ background: t.color }}>
                                    {t.initial}
                                </div>
                                <div>
                                    <div className="testimonial-name">{t.name}</div>
                                    <div className="testimonial-role">{t.role}</div>
                                </div>
                            </div>
                            <div className="testimonial-quote">
                                <Quote size={16} className="testimonial-quote-icon" />
                                {t.quote}
                            </div>
                            <div className="testimonial-stars">
                                {Array.from({ length: t.stars }, (_, j) => (
                                    <Star key={j} size={14} fill="#f6c458" color="#f6c458" />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </RevealSection>

            {/* ─── Early Access Offer ─── */}
            <RevealSection className="landing-section early-access-section" id="early-access">
                <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center' }}>
                    <span className="section-label" style={{ justifyContent: 'center' }}>
                        <span className="section-label-line" />
                        얼리 액세스
                    </span>
                    <h2 className="section-title" style={{ textAlign: 'center' }}>
                        선착순 100팀,
                        <br />
                        <span className="text-gradient-primary">프리미엄 무료.</span>
                    </h2>
                    <p className="section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>
                        지금 가입하면 유료 프리미엄 기능을 무료로 사용할 수 있습니다.
                        <br />
                        초기 사용자에게만 제공되는 한정 혜택입니다.
                    </p>
                </motion.div>

                <motion.div className="early-access-card" variants={scaleIn} custom={1}>
                    <div className="early-access-card-glow" />
                    <div className="early-access-card-inner">
                        <div className="early-access-badge">
                            <Gift size={14} />
                            Early Adopter 특별 혜택
                        </div>

                        <div className="early-access-perks">
                            {[
                                { icon: <Crown size={18} />, text: '프리미엄 요금제 전체 기능 무료 이용' },
                                { icon: <Zap size={18} />, text: 'AI 포스터 분석 무제한 사용' },
                                { icon: <BarChart3 size={18} />, text: '고급 분석 대시보드 & 리포트' },
                                { icon: <Users size={18} />, text: '예약 인원 제한 없음' },
                            ].map((perk, i) => (
                                <div key={i} className="early-access-perk">
                                    <div className="perk-icon">{perk.icon}</div>
                                    <span className="perk-text">{perk.text}</span>
                                    <Check size={16} className="perk-check" />
                                </div>
                            ))}
                        </div>

                        <div className="early-access-cta-area">
                            <button className="hero-btn-primary" onClick={goToDashboard}>
                                <Sparkles size={18} />
                                지금 무료로 시작하기
                                <ArrowRight size={18} />
                            </button>
                            <p className="early-access-note">
                                카드 등록 없이 가입 · 선착순 마감 시 종료
                            </p>
                        </div>
                    </div>
                </motion.div>
            </RevealSection>

            {/* ─── Final CTA ─── */}
            <RevealSection className="final-cta" id="cta">
                <div className="final-cta-glow" />
                <div className="final-cta-grid" />
                <motion.div variants={fadeUp} custom={0} style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="final-cta-title">
                        지금 바로
                        <br />
                        <span className="text-gradient-primary">Posta를 시작하세요.</span>
                    </h2>
                    <p className="final-cta-desc">
                        구글 폼과 종이 명단은 놓고,
                        <br />
                        무대에만 집중하는 경험을 시작하세요.
                    </p>
                    <div className="final-cta-actions">
                        <button className="hero-btn-primary" onClick={goToDashboard}>
                            <Sparkles size={18} />
                            무료로 시작하기
                            <ArrowRight size={18} />
                        </button>
                    </div>
                    <p className="final-cta-note">
                        카드 등록 없이 무료로 시작 · 30초면 첫 이벤트 생성
                    </p>
                </motion.div>
            </RevealSection>

            {/* ─── AdSense Approval Article (전략 A: 애드센스 승인 심사용 텍스트 섹션) ─── */}
            <RevealSection className="landing-section" id="guide" style={{ padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                <motion.div variants={fadeUp} custom={0} style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                        성공적인 인디 공연 기획과 예매 관리 가이드라인
                    </h2>
                    
                    <p style={{ marginBottom: '1.5rem' }}>
                        현대의 인디 음악씬과 소규모 공연 문화는 기술의 발전과 함께 새로운 국면을 맞이하고 있습니다. 과거에는 공연을 기획하고 관객을 모으는 모든 과정이 수작업으로 이루어졌습니다. 하지만 이제는 디지털 플랫폼과 자동화 솔루션의 등장으로 기획자, 아티스트, 그리고 팬 모두가 본연의 목적에 더욱 집중할 수 있는 환경이 조성되었습니다. 이 가이드에서는 성공적인 소규모 공연 기획을 위해 필수적인 예매 자동화, 관객 체크인 효율화, 그리고 데이터 기반의 의사 결정 방법에 대해 깊이 있게 다룹니다.
                    </p>

                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '2.5rem', marginBottom: '1rem' }}>
                        1. 수동 예매와 입금 확인 시스템의 한계
                    </h3>
                    <p style={{ marginBottom: '1.2rem' }}>
                        전통적으로 소규모 밴드 긱(Gig)이나 대학 동아리 공연에서는 구글 폼(Google Forms)이나 네이버 폼과 같은 설문 도구를 이용해 예매를 받아왔습니다. 사용법이 간단하고 무료라는 장점이 있지만, 치명적인 단점이 존재합니다. 관객이 기재한 입금자명과 은행 계좌로 들어오는 실제 입금 내역을 일일이 대조해야 한다는 점입니다.
                    </p>
                    <p style={{ marginBottom: '1.5rem' }}>
                        동명이인이 발생하거나 관객이 입금자명을 잘못 설정하는 경우, 기획자는 이를 추적하기 위해 수많은 시간을 허비하게 됩니다. 실수로 명단 파일의 행 내용이 바뀌거나 누락되는 순간 현장(Onsite)에서 발생할 혼란은 겉잡을 수 없이 커집니다. 수작업 대조는 기획자의 스트레스를 극대화하고, 아티스트가 멋진 무대를 준비하는 시간을 앗아가는 가장 큰 원인입니다. 자동 입금 매칭 시스템이 필요한 절대적인 이유가 여기에 있습니다.
                    </p>

                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '2.5rem', marginBottom: '1rem' }}>
                        2. 언택트 시대의 현장 운영: 디지털 티켓과 QR 체크인
                    </h3>
                    <p style={{ marginBottom: '1.2rem' }}>
                        공연 당일, 현장 스태프들 앞에는 관객 수백 명의 이름이 빼곡히 적힌 종이 명단이 놓여 있습니다. 스태프들은 손가락으로 이름을 짚어가며 관객의 신원을 확인하고 펜으로 밑줄을 긋습니다. 이 과정에서 한 사람당 평균 30초에서 1분이 소모되며, 이로 인해 관객들의 대기 줄은 한없이 길어집니다. 긴 대기 시간은 공연의 시작 전부터 관객의 기대감을 실망이나 분노로 바꾸는 주된 요소가 됩니다.
                    </p>
                    <p style={{ marginBottom: '1.5rem' }}>
                        디지털 전환은 이러한 아날로그식 병목 현상을 해결하는 강력한 무기입니다. 스마트폰으로 전송된 고유한 QR 코드를 통해, 카메라 스캔 단 1초 만에 체크인이 완료되는 시스템은 현장 혼잡을 극적으로 줄여줍니다. 또한 모바일 디지털 티켓은 관객에게 있어 내가 참여하는 공연의 소유권과 기념품(Souvenir)으로서의 가치까지 선사합니다. 기획자는 단 한 대의 태블릿이나 스마트폰만으로 여러 명의 스태프 몫을 대체할 수 있게 되는 셈입니다.
                    </p>

                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '2.5rem', marginBottom: '1rem' }}>
                        3. 공연 후의 새로운 시작: 데이터 통계와 관객 리타겟팅
                    </h3>
                    <p style={{ marginBottom: '1.2rem' }}>
                        많은 독립 아티스트들이 공연이 끝난 직후 "무사히 끝났다"는 안도감과 함께 프로젝트를 종료합니다. 그러나 데이터 시대의 공연 기획은 공연 마무리가 새로운 마케팅의 시작점이 되어야 합니다. 예약률 대비 실제 체크인 비율(Show-up Rate)은 얼마였는지, 관객이 예약한 주요 경로와 시간대는 언제였는지를 분석하는 것은 다음 공연의 성패를 가르는 잣대가 됩니다.
                    </p>
                    <p style={{ marginBottom: '1.5rem' }}>
                        또한 티켓을 구매했던 관객들의 이메일이나 연락처 등 팬덤 데이터를 자산화하여, 다음 시즌 에피소드나 신규 앨범 발매 시 가장 먼저 알릴 수 있는 CRM(고객 관계 관리) 전략을 도입할 수 있습니다. 1회성 공연으로 끝나는 것이 아니라, 데이터를 매개로 지속 가능한 팬덤 생태계를 구축하는 것이야말로 롱런(Long-run)하는 인디 뮤지션의 비밀입니다.
                    </p>

                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '2.5rem', marginBottom: '1rem' }}>
                        맺음말: 아티스트는 무대에, 시스템은 시스템에
                    </h3>
                    <p style={{ marginBottom: '1.5rem' }}>
                        결론적으로 소규모 공연 기획이 나아가야 할 방향성은 명확합니다. 자동화된 솔루션에 운영의 부담을 덜어내고, 기획자가 확보한 시간과 에너지를 콘텐츠 본연의 질을 높이는 데 쏟는 것입니다. Posta와 같은 최신 예매 관리 플랫폼을 적극적으로 도입하여 낡은 구글 폼과 종이 명단의 굴레에서 벗어날 때입니다. 기획자의 손이 가벼워질수록, 관객은 더욱 큰 감동을 얻어갈 것입니다.
                    </p>
                </motion.div>
            </RevealSection>

            {/* ─── Footer ─── */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-left">
                        <span className="footer-brand">Posta</span>
                        <span className="footer-tagline">공연을 더 특별하게.</span>
                    </div>
                    <div className="footer-links">
                        <button onClick={() => scrollToSection('features')}>기능</button>
                        <button onClick={() => scrollToSection('how')}>사용법</button>
                        <button onClick={() => scrollToSection('early-access')}>혜택</button>
                        <button onClick={goToDashboard}>시작하기</button>
                    </div>
                    <div className="footer-right">
                        <div className="footer-legal">
                            <Link to="/privacy">개인정보처리방침</Link>
                            <span className="footer-divider">·</span>
                            <Link to="/terms">이용약관</Link>
                            <span className="footer-divider">·</span>
                            <a href="mailto:posta.systems.official@gmail.com">문의</a>
                        </div>
                        <span className="footer-copy">
                            © 2026 Posta. All rights reserved.
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
