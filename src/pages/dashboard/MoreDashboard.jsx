import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, HelpCircle, Settings, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import classes from './DashboardFeature.module.css';

const MoreDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/dashboard');
    };

    return (
        <div className={classes.page}>
            <div className={classes.titleBlock}>
                <h2>더보기</h2>
                <p>설정, 프리미엄, 도움말 등 추가 메뉴를 확인하세요.</p>
            </div>

            <div className={classes.panel}>
                <div className={classes.list}>
                    <div className={classes.listItem}>
                        <div>
                            <div className={classes.listItemTitle}><Settings size={16} /> 설정</div>
                            <div className={classes.listItemDesc}>프로필/기본 결제값을 수정합니다.</div>
                        </div>
                        <Link to="/dashboard/settings" className={classes.btnSecondary}>이동</Link>
                    </div>

                    <div className={classes.listItem}>
                        <div>
                            <div className={classes.listItemTitle}><CreditCard size={16} /> 프리미엄</div>
                            <div className={classes.listItemDesc}>유료 플랜과 혜택을 확인합니다.</div>
                        </div>
                        <Link to="/dashboard/premium" className={classes.btnSecondary}>이동</Link>
                    </div>

                    <div className={classes.listItem}>
                        <div>
                            <div className={classes.listItemTitle}><HelpCircle size={16} /> 도움말 / FAQ</div>
                            <div className={classes.listItemDesc}>자주 묻는 질문과 사용 가이드를 확인합니다.</div>
                        </div>
                        <button className={classes.btnSecondary} disabled>준비중</button>
                    </div>

                    <div className={classes.listItem}>
                        <div>
                            <div className={classes.listItemTitle}><Sparkles size={16} /> 운영 팁</div>
                            <div className={classes.listItemDesc}>결제 확인 및 체크인 운영 팁을 빠르게 확인합니다.</div>
                        </div>
                        <a
                            className={classes.btnSecondary}
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                window.alert('운영 팁: 1) 예약 마감 전 입금 대기자 필터를 확인하세요. 2) 체크인 전 QR 테스트를 1회 진행하세요.');
                            }}
                        >
                            보기
                        </a>
                    </div>

                    <div className={classes.listItem}>
                        <div>
                            <div className={classes.listItemTitle}><LogOut size={16} /> 로그아웃</div>
                            <div className={classes.listItemDesc}>현재 계정에서 로그아웃합니다.</div>
                        </div>
                        <button className={classes.btnDanger} onClick={handleLogout}>로그아웃</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoreDashboard;
