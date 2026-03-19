import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './LegalPage.css';

export default function TermsOfService() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back"><ArrowLeft size={16} /> 홈으로</Link>
                <h1 className="legal-title">이용약관</h1>
                <p className="legal-updated">최종 수정일: 2026년 3월 18일</p>

                <section className="legal-section">
                    <h2>제1조 (목적)</h2>
                    <p>본 약관은 Posta(이하 "서비스")가 제공하는 공연 예매 및 관리 플랫폼 서비스의 이용 조건 및 절차, 서비스와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                </section>

                <section className="legal-section">
                    <h2>제2조 (정의)</h2>
                    <ul>
                        <li><strong>"서비스"</strong>란 Posta가 제공하는 공연 이벤트 생성, 예매 관리, QR 체크인, 응원 게시판 등 모든 관련 서비스를 의미합니다.</li>
                        <li><strong>"주최자"</strong>란 서비스를 통해 이벤트를 생성하고 관리하는 이용자를 의미합니다.</li>
                        <li><strong>"관람객"</strong>이란 이벤트에 참여하거나 예매하는 이용자를 의미합니다.</li>
                        <li><strong>"회원"</strong>이란 Google 계정으로 로그인하여 서비스를 이용하는 자를 의미합니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제3조 (약관의 효력 및 변경)</h2>
                    <ul>
                        <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                        <li>서비스는 합리적인 사유가 있을 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 후 적용됩니다.</li>
                        <li>이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제4조 (서비스의 제공)</h2>
                    <p>서비스는 다음과 같은 기능을 제공합니다.</p>
                    <ul>
                        <li>공연 이벤트 페이지 생성 및 관리</li>
                        <li>온라인 예매 및 입금 확인 시스템</li>
                        <li>QR 코드 기반 디지털 티켓 발급 및 체크인</li>
                        <li>실시간 응원 게시판</li>
                        <li>관람객 관리 및 통계 대시보드</li>
                        <li>기타 서비스가 정하는 업무</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제5조 (이용자의 의무)</h2>
                    <ul>
                        <li>이용자는 관련 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 사항을 준수하여야 합니다.</li>
                        <li>이용자는 서비스를 이용하여 불법적인 활동을 하거나 타인의 권리를 침해해서는 안 됩니다.</li>
                        <li>이용자는 다음 행위를 하여서는 안 됩니다.
                            <ul>
                                <li>허위 정보를 기재하거나 타인의 정보를 도용하는 행위</li>
                                <li>서비스의 정상적인 운영을 방해하는 행위</li>
                                <li>서비스를 통해 음란, 폭력적, 차별적 콘텐츠를 게시하는 행위</li>
                                <li>서비스의 기술적 보호조치를 우회하거나 무력화하는 행위</li>
                                <li>자동화된 수단을 이용하여 서비스에 부하를 가하는 행위</li>
                            </ul>
                        </li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제6조 (주최자의 책임)</h2>
                    <ul>
                        <li>주최자는 이벤트에 관한 정보를 정확하게 기재할 의무가 있습니다.</li>
                        <li>주최자는 관람객의 예매 및 환불 처리에 대한 책임을 부담합니다.</li>
                        <li>주최자가 게시한 이벤트 내용에 대한 법적 책임은 주최자 본인에게 있습니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제7조 (지적재산권)</h2>
                    <ul>
                        <li>서비스가 제공하는 콘텐츠(디자인, 로고, 소프트웨어 등)에 대한 지적재산권은 서비스에 귀속됩니다.</li>
                        <li>이용자가 서비스에 게시한 콘텐츠의 저작권은 해당 이용자에게 귀속됩니다.</li>
                        <li>이용자는 서비스 내에서 게시한 콘텐츠에 대해 서비스가 서비스 운영 및 홍보 목적으로 이용하는 것을 허락합니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제8조 (서비스의 중단 및 변경)</h2>
                    <ul>
                        <li>서비스는 시스템 점검, 기술적 문제, 불가항력 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.</li>
                        <li>서비스는 운영상 또는 기술상의 필요에 따라 서비스의 전부 또는 일부를 변경하거나 종료할 수 있습니다.</li>
                        <li>무료로 제공되는 서비스의 변경 또는 중단에 대해 별도의 보상을 하지 않습니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제9조 (유료 서비스)</h2>
                    <ul>
                        <li>서비스의 일부 기능은 유료로 제공될 수 있으며, 유료 서비스의 가격 및 결제 방법은 서비스 내에 안내됩니다.</li>
                        <li>결제는 Lemon Squeezy를 통해 처리되며, 환불 정책은 서비스 내 안내에 따릅니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제10조 (책임의 제한)</h2>
                    <ul>
                        <li>서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                        <li>서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
                        <li>서비스는 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁에 대해 관여하거나 책임을 지지 않습니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제11조 (광고 게재)</h2>
                    <p>서비스는 Google AdSense를 통한 광고를 게재할 수 있으며, 이용자는 서비스 이용 시 노출되는 광고에 동의합니다. 유료 플랜 이용자에게는 광고가 표시되지 않을 수 있습니다.</p>
                </section>

                <section className="legal-section">
                    <h2>제12조 (분쟁 해결)</h2>
                    <ul>
                        <li>서비스와 이용자 간 발생한 분쟁은 상호 협의에 의해 해결함을 원칙으로 합니다.</li>
                        <li>협의가 이루어지지 않을 경우, 대한민국 법률을 준거법으로 하며 관할 법원은 민사소송법에 따릅니다.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제13조 (연락처)</h2>
                    <p>서비스 이용 관련 문의사항은 아래로 연락해 주시기 바랍니다.</p>
                    <ul>
                        <li><strong>서비스명:</strong> Posta</li>
                        <li><strong>이메일:</strong> posta.systems.official@gmail.com</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
