import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './LegalPage.css';

export default function PrivacyPolicy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back"><ArrowLeft size={16} /> 홈으로</Link>
                <h1 className="legal-title">개인정보처리방침</h1>
                <p className="legal-updated">최종 수정일: 2026년 3월 18일</p>

                <section className="legal-section">
                    <h2>1. 개인정보의 수집 및 이용 목적</h2>
                    <p>Posta(이하 "서비스")는 다음 목적을 위해 개인정보를 수집 및 이용합니다.</p>
                    <ul>
                        <li>서비스 제공 및 운영: 공연 이벤트 생성, 예매 관리, QR 체크인</li>
                        <li>회원 관리: 본인 확인, 계정 관리, 로그인 인증</li>
                        <li>서비스 개선: 이용 통계 분석, 사용자 경험 향상</li>
                        <li>광고 제공: Google AdSense를 통한 맞춤형 광고 게재</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>2. 수집하는 개인정보 항목</h2>
                    <p>서비스는 다음과 같은 개인정보를 수집합니다.</p>
                    <ul>
                        <li><strong>Google 로그인 시:</strong> 이름, 이메일 주소, 프로필 사진</li>
                        <li><strong>관람객 입장 시:</strong> 닉네임 (사용자 임의 입력)</li>
                        <li><strong>예매 시:</strong> 이름, 연락처 (이벤트 주최자에게 제공)</li>
                        <li><strong>자동 수집 정보:</strong> 기기 식별자, 방문 기록, 쿠키, 접속 IP</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. 개인정보의 보유 및 이용 기간</h2>
                    <p>수집된 개인정보는 서비스 이용 기간 동안 보유하며, 회원 탈퇴 또는 수집 목적 달성 시 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                    <ul>
                        <li>전자상거래 관련 기록: 5년 (전자상거래법)</li>
                        <li>접속 기록: 3개월 (통신비밀보호법)</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. 개인정보의 제3자 제공</h2>
                    <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다.</p>
                    <ul>
                        <li>이용자가 사전에 동의한 경우</li>
                        <li>예매 정보의 경우 해당 이벤트 주최자에게 제공</li>
                        <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차에 따라 요청이 있는 경우</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. 제3자 서비스 및 쿠키</h2>
                    <p>서비스는 다음 제3자 서비스를 이용하며, 각 서비스는 자체 개인정보처리방침에 따라 정보를 수집합니다.</p>
                    <ul>
                        <li><strong>Firebase (Google):</strong> 인증, 데이터베이스, 호스팅 — <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase 개인정보처리방침</a></li>
                        <li><strong>Google Analytics:</strong> 사이트 이용 통계 분석 — <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a></li>
                        <li><strong>Google AdSense:</strong> 맞춤형 광고 게재 — <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google 광고 정책</a></li>
                        <li><strong>Lemon Squeezy:</strong> 결제 처리 — <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer">Lemon Squeezy 개인정보처리방침</a></li>
                    </ul>
                    <p>이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 단, 쿠키 거부 시 서비스 이용에 제한이 있을 수 있습니다.</p>
                </section>

                <section className="legal-section">
                    <h2>6. 이용자의 권리</h2>
                    <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
                    <ul>
                        <li>개인정보 열람, 수정, 삭제 요청</li>
                        <li>개인정보 처리 정지 요청</li>
                        <li>회원 탈퇴 및 계정 삭제 요청</li>
                    </ul>
                    <p>위 권리 행사는 아래 연락처를 통해 요청하실 수 있으며, 지체 없이 조치하겠습니다.</p>
                </section>

                <section className="legal-section">
                    <h2>7. 개인정보의 안전성 확보 조치</h2>
                    <ul>
                        <li>데이터 전송 시 SSL/TLS 암호화 적용</li>
                        <li>Firebase 보안 규칙을 통한 데이터 접근 제어</li>
                        <li>관리자 계정 접근 권한 최소화</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>8. 개인정보 보호책임자</h2>
                    <ul>
                        <li><strong>서비스명:</strong> Posta</li>
                        <li><strong>이메일:</strong> posta.systems.official@gmail.com</li>
                    </ul>
                    <p>개인정보 관련 문의사항은 위 이메일로 연락해 주시기 바랍니다.</p>
                </section>

                <section className="legal-section">
                    <h2>9. 방침 변경</h2>
                    <p>본 개인정보처리방침은 법령 변경이나 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>
                </section>
            </div>
        </div>
    );
}
