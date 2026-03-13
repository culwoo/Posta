# Posta Payment Integration (Lemon Squeezy) - Product Requirements Document

## Overview
Posta 서비스의 요금제가 단일 'Plus' 요금제로 전면 개편됨에 따라, 주최자가 특정 공연에 대해 'Plus' 패스를 결제하고 적용할 수 있도록 Lemon Squeezy 연동 결제 시스템을 구축합니다.

## Target Audience
- 공연/행사 주최자 (Organizer): 자신의 행사에 관객 경험을 극대화하기 위해 Plus 기능을 구매하려는 대상.

## Core Features
1. **결제 링크(Checkout) 생성:** 클라이언트에서 Lemon Squeezy Checkout overlay 띄우기.
2. **결제 상태 관리:** Webhook을 수신하여 Firebase Firestore에 해당 공연(Event)의 요금제 상태를 `plus`로 자동 업데이트.
3. **결제 내역 확인:** 결제된 내역을 DB에 안전하게 기록.

## Tech Stack
- **Frontend**: React (Vite)
- **Backend / Webhook**: Firebase Cloud Functions (Node.js)
- **Database**: Firebase Firestore
- **Payment Gateway**: Lemon Squeezy (SDK / API)

## Architecture
1. **Frontend (Dashboard):** 유저가 'Plus 업그레이드' 버튼 클릭 -> Lemon Squeezy Checkout URL (또는 Overlay) 오픈. 이 때 Custom Data로 `eventId`와 `userId`를 넘깁니다.
2. **Lemon Squeezy:** 결제 처리 후 웸훅(Webhook) 발송.
3. **Backend (Firebase Function):** `/lemonSqueezyWebhook` 엔드포인트에서 웹훅 수신.
4. **Data Update:** 웹훅 검증(Signature Validation) 성공 시 Firestore의 `events/{eventId}` 문서의 `billing` 정보를 업데이트.

## UI/UX Requirements
- PremiumDashboard.jsx의 'Coming Soon' 버튼을 '결제하기'로 변경.
- Lemon Squeezy 팝업 결제창(모달) 방식으로 이탈 없이 화면 위에서 결제 유도.

## Security Considerations
- **Webhook 시그니처 검증:** 악의적인 요청을 방지하기 위해 Webhook Secret으로 서명(HMAC-SHA256)을 검증.
- **Firebase 접근 제어:** 클라이언트 측에서 임의로 `billing` 정보를 수정할 수 없도록 Firestore Security Rules 수정. (현재는 Client-side에서 update 하는 로직일 수 있으나, 규칙 강화 필요)

## Third-Party Integrations
- **Lemon Squeezy API & Webhooks**

## Constraints & Assumptions
- `.env` 파일에 API Key 등 민감 정보가 저장되며 절대 Git에 커밋되지 않아야 합니다.
- 개발 환경에서는 `ngrok` 등을 사용하여 로컬 Cloud Function으로 Webhook을 테스트하거나, 테스트 모드로 서버에 올려 검증해야 합니다.

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "Firebase Cloud Functions 초기화 및 Lemon Squeezy 의존성 설치",
    "steps": [
      "functions 폴더 내에 axios, crypto 등 편의를 위한 패키지 설치 또는 Lemon Squeezy SDK 설정",
      "functions 환경변수 또는 로컬 .env에 Lemon Squeezy 키 설정 준비"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Lemon Squeezy Webhook 핸들러 생성 (Firebase Function)",
    "steps": [
      "webhook 요청을 받아 인증(signature 검증)하는 레이어 작성",
      "결제 완료(order_created) 시 eventId와 userId를 파싱하여 Firestore events/{id} 문서의 billing.tier를 'plus'로 변경하는 로직 추가"
    ],
    "passes": true
  },
  {
    "category": "integration",
    "description": "Frontend에서 LemonSqueezy Checkout 오픈 연동",
    "steps": [
      "index.html에 Lemon Squeezy.js 스크립트 추가 (UI 오버레이용)",
      "PremiumDashboard 컴포넌트에서 결제 버튼 클릭 시 Lemon Squeezy Checkout 함수를 호출하고 custom_data 필드에 eventId 삽입"
    ],
    "passes": false
  },
  {
    "category": "security",
    "description": "Firestore Security Rules 업데이트",
    "steps": [
      "사용자가 프론트엔드에서 billing 문서를 조작하지 못하도록 방어 권한 추가"
    ],
    "passes": false
  }
]
```
