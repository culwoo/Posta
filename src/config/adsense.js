/**
 * Google AdSense Configuration
 * ─────────────────────────────────────────────
 * 모든 광고 슬롯 ID와 Publisher ID를 한 곳에서 관리합니다.
 * 
 * ● 실제 Google AdSense 승인 후:
 *   1. ADSENSE_PUBLISHER_ID를 본인의 ca-pub-XXXXXXX 값으로 변경
 *   2. 각 슬롯 ID를 AdSense 대시보드에서 생성한 광고 단위 ID로 교체
 *   3. ADSENSE_ENABLED를 true로 변경
 * 
 * ● 도메인: posta.systems
 * ● Vercel에서 커스텀 도메인 연결 후 AdSense 사이트 등록 필요
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 글로벌 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ADSENSE_PUBLISHER_ID = 'ca-pub-2904891603549154';
export const ADSENSE_ENABLED = false; // AdSense 승인 전까지 false

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 광고 슬롯 정의
// 각 위치별 최적화된 광고 단위를 관리합니다
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const AD_SLOTS = {
    // 대시보드 영역
    DASHBOARD_TOP_BANNER: {
        slotId: '1234567890',      // TODO: 실제 슬롯 ID
        format: 'horizontal',      // 'horizontal' | 'rectangle' | 'vertical' | 'auto'
        label: '대시보드 상단 배너',
    },
    DASHBOARD_EVENT_LIST: {
        slotId: '1234567891',
        format: 'auto',
        label: '이벤트 목록 인피드',
    },

    // 이벤트 사이트 영역 (관객 페이지)
    EVENT_FOOTER: {
        slotId: '1234567892',
        format: 'horizontal',
        label: '이벤트 페이지 하단',
    },
    EVENT_CONCERT_INFO: {
        slotId: '1234567893',
        format: 'rectangle',
        label: '공연 정보 페이지',
    },
    EVENT_BOARD: {
        slotId: '1234567894',
        format: 'horizontal',
        label: '응원 게시판',
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 도메인 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const POSTA_DOMAIN = 'posta.systems';
export const POSTA_URL = `https://${POSTA_DOMAIN}`;
