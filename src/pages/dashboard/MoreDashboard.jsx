import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, HelpCircle, Settings, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';

const MoreDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/dashboard');
    };

    const menuItems = [
        {
            icon: Settings,
            title: '설정',
            desc: '프로필/기본 결제값을 수정합니다.',
            action: <Link to="/dashboard/settings" style={{ textDecoration: 'none' }}><GlassButton variant="secondary" size="sm">이동</GlassButton></Link>,
        },
        {
            icon: CreditCard,
            title: '요금제',
            desc: 'Plus Pass 혜택과 이벤트별 결제 현황을 확인합니다.',
            action: <Link to="/dashboard/pricing" style={{ textDecoration: 'none' }}><GlassButton variant="secondary" size="sm">이동</GlassButton></Link>,
        },
        {
            icon: HelpCircle,
            title: '도움말 / FAQ',
            desc: '자주 묻는 질문과 사용 가이드를 확인합니다.',
            action: <GlassButton variant="secondary" size="sm" disabled>준비중</GlassButton>,
        },
        {
            icon: Sparkles,
            title: '운영 팁',
            desc: '결제 확인 및 체크인 운영 팁을 빠르게 확인합니다.',
            action: (
                <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        window.alert('운영 팁: 1) 예약 마감 전 입금 대기자 필터를 확인하세요. 2) 체크인 전 QR 테스트를 1회 진행하세요.');
                    }}
                >
                    보기
                </GlassButton>
            ),
        },
        {
            icon: LogOut,
            title: '로그아웃',
            desc: '현재 계정에서 로그아웃합니다.',
            action: (
                <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    style={{ color: 'rgba(255,107,107,0.9)' }}
                >
                    로그아웃
                </GlassButton>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-main)',
                    color: 'var(--text-primary)',
                }}>
                    더보기
                </h2>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontFamily: 'var(--font-main)' }}>
                    설정, 프리미엄, 도움말 등 추가 메뉴를 확인하세요.
                </p>
            </div>

            <GlassCard level={1} style={{ padding: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {menuItems.map(({ icon: Icon, title, desc, action }) => (
                        <div
                            key={title}
                            style={{
                                border: '1px solid var(--ui-border-soft)',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.85rem 1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.8rem',
                                background: 'var(--ui-surface-soft)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div>
                                <div style={{
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.95rem',
                                }}>
                                    <Icon size={16} /> {title}
                                </div>
                                <div style={{
                                    color: 'var(--text-tertiary)',
                                    fontSize: '0.82rem',
                                    fontFamily: 'var(--font-main)',
                                    marginTop: '0.15rem',
                                }}>
                                    {desc}
                                </div>
                            </div>
                            {action}
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};

export default MoreDashboard;
