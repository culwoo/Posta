# Posta 결제 연동 (Lemon Squeezy) — 상세 PRD

## Overview
Posta 서비스의 **Plus 패스**(공연별 1회성 결제, ₩9,900)를 Lemon Squeezy를 통해 실제 결제가 가능하도록 End-to-End 연동을 완성한다.
현재 백엔드(Cloud Functions)에 Webhook 핸들러와 Checkout URL 생성 로직이 구현되어 있으나, 프론트엔드 Checkout Overlay 통합, 결제 성공/실패 UX 처리, 프로덕션 보안 점검, 테스트 등이 미완성 상태이다.

이 PRD는 **결제 연동에 필요한 모든 작업을 구체적 단계(step)로 세분화**하여, 각 Task를 에이전트(또는 개발자)가 독립적으로 실행·검증할 수 있도록 설계되었다.

---

## Target Audience
- **공연/행사 주최자 (Organizer)**: 자신이 만든 이벤트에 Plus 패스를 구매하여 관객 경험(광고 제거, 응원 게시판 활성화)을 향상하려는 사용자.

---

## 현재 구현 상태 분석 (As-Is)

### ✅ 완료된 사항
| 영역 | 파일 | 상태 |
|------|------|------|
| Cloud Function: Checkout URL 생성 | `functions/index.js` → `createLemonSqueezyCheckout` | ✅ 구현 완료 |
| Cloud Function: Webhook 핸들러 | `functions/index.js` → `lemonSqueezyWebhook` | ✅ 구현 완료 |
| Checkout Signature 검증 | `functions/index.js` → `createCheckoutSignature`, `safeHexEqual` | ✅ 구현 완료 |
| Webhook Signature 검증 (HMAC-SHA256) | `functions/index.js` → `lemonSqueezyWebhook` | ✅ 구현 완료 |
| Firestore Billing Data 업데이트 | `functions/index.js` → `order_created` 핸들러 | ✅ 구현 완료 |
| Firestore Security Rules (billing 필드 보호) | `firestore.rules` 62번 라인 | ✅ 구현 완료 |
| 권한 체계 (Free/Plus) | `src/utils/permissions.js` | ✅ 구현 완료 |
| PremiumDashboard UI | `src/pages/dashboard/PremiumDashboard.jsx` | ⚠️ 결제 버튼 존재하나 리다이렉트 방식 |
| PaywallOverlay | `src/components/features/PaywallOverlay.jsx` | ✅ 구현 완료 |
| .env.example | 프로젝트 루트 | ✅ LS 관련 변수 포함 |

### ❌ 미완성 사항
| 영역 | 상세 |
|------|------|
| Lemon Squeezy Checkout Overlay (lemon.js) | `index.html`에 lemon.js 스크립트 미추가. 현재 `window.location.assign`으로 외부 페이지 리다이렉트 방식 |
| 결제 성공 후 UI 갱신 | Webhook이 Firestore를 업데이트하면 클라이언트가 해당 변경을 실시간 감지하여 UI를 갱신하는 흐름 미검증 |
| 결제 성공/실패 Toast/Notification | 결제 완료 또는 실패 시 사용자에게 보여줄 피드백 UI 없음 |
| 결제 내역 조회 (billing history) | 관리자/주최자가 결제 이력을 확인할 수 있는 UI/데이터 구조 없음 |
| Lemon Squeezy 대시보드 설정 가이드 | Store 생성, Product/Variant 생성, Webhook URL 등록, Test Mode 활용법 문서화 없음 |
| 프로덕션 배포 전 보안 Checklist | CORS, Firebase Functions Secret 설정, 환경별 Webhook URL 분리 등 미정리 |
| E2E 테스트 시나리오 | 결제 흐름 전체를 검증하는 테스트 케이스 미작성 |
| Footer 안내 메시지 업데이트 | PremiumDashboard 하단의 "결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다" 문구 제거/변경 필요 |

---

## Tech Stack
- **Frontend**: React 19 + Vite 7 + Framer Motion
- **Backend / Webhook**: Firebase Cloud Functions v2 (Node.js 20)
- **Database**: Firebase Firestore
- **Payment Gateway**: Lemon Squeezy (Checkout Overlay via `lemon.js` + Webhooks)
- **Hosting**: Vercel (프론트엔드) / Firebase (Functions, Firestore, Storage)
- **Styling**: Vanilla CSS + CSS Modules + Glassmorphism 디자인 시스템

---

## Architecture (결제 흐름 상세)

```
┌─────────────────────────────────────────────────┐
│  1. 주최자가 PremiumDashboard에서 "결제하기" 클릭  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  2. Cloud Function `createLemonSqueezyCheckout`  │
│     - eventId, userId 수신                       │
│     - HMAC-SHA256 서명 생성                       │
│     - Checkout URL 반환 (?embed=1 파라미터 추가)   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  3. Frontend: LemonSqueezy.Url.Open(checkoutUrl) │
│     → Checkout Overlay 모달 띄우기               │
│     → 사용자는 사이트를 떠나지 않고 결제 진행      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  4. Lemon Squeezy 결제 처리 완료                  │
│     → 사용자에게 결제 완료 확인 화면               │
│     → Webhook POST → lemonSqueezyWebhook         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  5. Cloud Function `lemonSqueezyWebhook`         │
│     - X-Signature 검증 (HMAC-SHA256)             │
│     - custom_data의 checkout 서명 검증            │
│     - event_name === "order_created" 확인         │
│     - Firestore events/{eventId}.billing 업데이트 │
│       → tier: "plus", purchasedAt, purchasedBy   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  6. Frontend: Firestore onSnapshot 트리거        │
│     → EventContext가 billing 변경 실시간 감지     │
│     → UI 자동 갱신 (Plus 상태 반영)               │
│     → Toast 알림: "🎉 Plus 패스가 활성화됨!"       │
└─────────────────────────────────────────────────┘
```

---

## Data Model

### Firestore: `events/{eventId}` 문서 내 billing 필드

```javascript
{
  billing: {
    tier: "plus",            // "free" | "plus"
    price: 9900,             // KRW
    purchasedAt: "ISO 8601", // 결제 완료 시각
    purchasedBy: "userId",   // 구매자 UID
    provider: "lemonsqueezy",// 결제 제공자
    variantId: "123456",     // LS Variant ID
    orderId: "ls_order_xxx", // (신규) LS 주문 ID — 추후 환불/문의 대응
    expiresAt: null          // 1회성이므로 null
  }
}
```

### Firestore: `payments/{paymentId}` 컬렉션 (신규)

결제 감사 로그(Audit Trail)를 별도 컬렉션에 저장하여, 관리자가 모든 결제 이력을 조회·검증할 수 있도록 한다.

```javascript
{
  eventId: "abc123",
  userId: "user_uid",
  provider: "lemonsqueezy",
  orderId: "ls_order_xxx",      // Lemon Squeezy Order ID
  variantId: "variant_id",
  amount: 9900,
  currency: "KRW",
  status: "completed",          // "completed" | "refunded" | "failed"
  lemonSqueezyPayload: { ... }, // 원본 Webhook payload (디버깅용)
  createdAt: "ISO 8601",
  updatedAt: "ISO 8601"
}
```

---

## UI/UX Requirements

### 1. Checkout Overlay 방식 전환
- `window.location.assign(checkoutUrl)` → `LemonSqueezy.Url.Open(checkoutUrl)` 변경
- Checkout URL에 `?embed=1` 파라미터 추가하여 Overlay 모드 활성화
- 사용자가 사이트를 떠나지 않고 모달 형태로 결제 진행

### 2. 결제 버튼 상태 관리
| 상태 | 버튼 텍스트 | 설명 |
|------|-----------|------|
| 기본 | "Plus 패스 결제하기" | 활성 상태, 보라색 그래디언트 |
| 로딩 | "결제 준비 중..." | disabled, spinner 표시 |
| 이미 Plus | "✅ 이용 중" | disabled, 초록색 배경 |
| 에러 | "결제하기" + 에러 메시지 | 재시도 가능 |

### 3. 결제 성공 피드백
- Firestore `onSnapshot` 감지 → billing.tier가 "plus"로 변경되면:
  - Toast 알림: "🎉 Plus 패스가 활성화되었습니다!"
  - PremiumDashboard의 Plus 카드 상태 "이용 중"으로 변경
  - Overlay가 닫히면 페이지가 자동 갱신됨 (이미 onSnapshot으로 실시간 반영)

### 4. Footer 안내 문구 변경
- 기존: "결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다."
- 변경: "모든 결제는 Lemon Squeezy를 통해 안전하게 처리됩니다. 유료 결제 후 환불은 불가합니다."

---

## Security Considerations

1. **Webhook Signature 검증**: HMAC-SHA256으로 Lemon Squeezy가 보낸 요청인지 서버 측에서 검증 ✅ (구현 완료)
2. **Checkout Signature 검증**: Custom data에 포함된 서명으로 위조된 결제 요청 방어 ✅ (구현 완료)
3. **Firestore Rules**: 클라이언트에서 `billing` 필드 직접 수정 불가 ✅ (구현 완료)
4. **Firebase Secrets**: `LEMON_SQUEEZY_WEBHOOK_SECRET`, `LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET` 등은 Firebase Secret Manager에 저장
5. **(신규)** `payments` 컬렉션 Security Rules: 서버(Cloud Functions)만 쓰기 가능, Admin만 읽기 가능
6. **(신규)** Rate Limiting: `createLemonSqueezyCheckout` 함수에 호출 빈도 제한 고려
7. **(신규)** Webhook 멱등성: 동일 `orderId`로 중복 Webhook 수신 시 중복 처리 방지

---

## Third-Party Integrations
- **Lemon Squeezy API & Webhooks**
  - Checkout URL 생성 (Server-side)
  - Checkout Overlay (Client-side `lemon.js`)
  - Webhook 수신 (`order_created` 이벤트)
- **Firebase Cloud Functions v2**: 서버리스 백엔드
- **Firebase Firestore**: 실시간 데이터베이스 (onSnapshot)

---

## Constraints & Assumptions

- `.env` 파일에 API Key 등 민감 정보 저장, 절대 Git에 커밋하지 않음
- Lemon Squeezy Test Mode를 활용하여 개발/테스트 진행 후, Production Mode로 전환
- 개발 환경 Webhook 테스트 시 `ngrok` 또는 배포된 Firebase Functions URL 사용
- `lemon.js`는 CDN에서 로드하며, 자체 호스팅하지 않음 (LS 공식 권고사항)
- 결제 후 환불은 Lemon Squeezy 대시보드에서 수동 처리 (V1에서는 API 환불 미구현)
- 가격은 ₩9,900으로 고정 (Lemon Squeezy Product/Variant에 동일하게 설정)

---

## Success Criteria

1. 주최자가 PremiumDashboard에서 "결제하기" 버튼을 누르면 Lemon Squeezy Checkout Overlay가 열린다.
2. Test Mode에서 테스트 카드로 결제를 완료하면, Webhook이 Cloud Function에 도달한다.
3. Webhook 처리 후 Firestore의 해당 이벤트 billing.tier가 "plus"로 변경된다.
4. 클라이언트에서 billing 변경이 실시간 감지되어 UI가 자동 갱신된다.
5. `payments` 컬렉션에 결제 감사 로그가 기록된다.
6. 중복 Webhook에 대한 멱등성이 보장된다.
7. 모든 에러 시나리오(결제 실패, 네트워크 오류 등)에 사용자 친화적 피드백이 제공된다.

---

## Task List

```json
[
  {
    "id": "PAY-001",
    "category": "setup",
    "description": "index.html에 Lemon Squeezy lemon.js 스크립트 추가",
    "steps": [
      "index.html의 <head> 태그 내에 Lemon Squeezy CDN 스크립트를 추가한다: <script src=\"https://app.lemonsqueezy.com/js/lemon.js\" defer></script>",
      "React 앱 초기화 시점 (App.jsx 또는 main.jsx)에서 window.createLemonSqueezy?.() 호출 코드를 추가한다. (lemon.js가 로드된 후 React 컴포넌트에서 버튼 리스너를 재초기화하기 위함)",
      "개발서버(npm run dev)에서 lemon.js가 정상적으로 로드되는지 브라우저 DevTools Network 탭에서 확인한다"
    ],
    "acceptance_criteria": "브라우저 콘솔에서 window.LemonSqueezy 객체가 존재하고, LemonSqueezy.Url.Open 함수가 typeof 'function'으로 확인됨",
    "passes": true
  },
  {
    "id": "PAY-002",
    "category": "feature",
    "description": "PremiumDashboard의 결제 방식을 Checkout Overlay로 전환",
    "steps": [
      "PremiumDashboard.jsx의 handleCheckoutClick 함수에서 window.location.assign(checkoutUrl) 호출을 window.LemonSqueezy.Url.Open(checkoutUrl)로 변경한다",
      "createLemonSqueezyCheckout Cloud Function의 반환 URL에 ?embed=1 파라미터가 포함되도록 수정한다 (functions/index.js → checkoutUrl.searchParams.set('embed', '1'))",
      "window.LemonSqueezy가 정의되지 않은 경우의 Fallback 처리를 추가한다: lemon.js 미로드 시 window.location.assign으로 폴백",
      "Checkout Overlay가 닫힐 때의 이벤트 리스너를 등록한다: window.addEventListener('message', ...) 또는 LemonSqueezy의 eventHandler를 활용하여 결제 완료/취소를 감지"
    ],
    "acceptance_criteria": "결제 버튼 클릭 시 페이지 이동 없이 Lemon Squeezy Checkout Overlay가 모달 형태로 화면 위에 떠서 결제 진행이 가능함",
    "passes": true
  },
  {
    "id": "PAY-003",
    "category": "feature",
    "description": "결제 성공 후 실시간 UI 갱신 및 Toast 알림 구현",
    "steps": [
      "EventContext (또는 해당 Context)에서 events/{eventId} 문서의 billing 필드를 onSnapshot으로 실시간 감청하고 있는지 확인한다. 이미 구현되어 있다면 이 단계는 Skip",
      "billing.tier가 'free'에서 'plus'로 변경되는 시점을 감지하는 Effect 또는 콜백을 PremiumDashboard에 추가한다",
      "상태 변경 감지 시 Toast/Snackbar 알림을 표시한다: '🎉 Plus 패스가 활성화되었습니다!'",
      "Toast 컴포넌트가 없다면 간단한 GlassToast 컴포넌트를 생성한다 (Glassmorphism 디자인 시스템에 맞게): position fixed, bottom-center, 자동 사라짐(3초), 애니메이션(Framer Motion slide-up + fade)"
    ],
    "acceptance_criteria": "Webhook에 의해 Firestore billing이 업데이트되면, 클라이언트에서 PremiumDashboard가 자동으로 'Plus 이용 중' 상태로 전환되고, 하단에 Toast 알림이 3초간 표시됨",
    "passes": true
  },
  {
    "id": "PAY-004",
    "category": "feature",
    "description": "Webhook 핸들러에 결제 감사 로그(payments 컬렉션) 저장 로직 추가",
    "steps": [
      "functions/index.js의 lemonSqueezyWebhook에서 order_created 처리 시, Lemon Squeezy payload에서 orderId(body.data.id 또는 body.data.attributes.order_number)를 추출한다",
      "Firestore events/{eventId}.billing에 orderId 필드를 추가로 저장한다",
      "별도 Firestore 컬렉션 payments/{auto-id}에 감사 로그를 저장한다: { eventId, userId, provider, orderId, variantId, amount, currency, status, lemonSqueezyPayload(요약), createdAt }",
      "에러 발생 시에도 결제 자체는 완료된 것이므로, payments 로그 저장 실패는 res.status(200)을 반환하되 console.error로 기록한다 (Webhook 재전송 방지)"
    ],
    "acceptance_criteria": "결제 완료 후 Firestore payments 컬렉션에 새 문서가 생성되고, eventId/userId/orderId/amount/status 필드가 정확히 기록됨. Firebase Console에서 확인 가능",
    "passes": true
  },
  {
    "id": "PAY-005",
    "category": "security",
    "description": "Webhook 멱등성 처리 (중복 결제 방지)",
    "steps": [
      "lemonSqueezyWebhook에서 order_created 이벤트 처리 전, Lemon Squeezy orderId를 추출한다",
      "Firestore에서 events/{eventId}.billing.orderId가 이미 동일한 orderId로 존재하는지 확인한다",
      "이미 동일 orderId로 처리된 경우, console.log로 '이미 처리된 주문' 기록 후 res.status(200).send('Already processed')를 반환한다",
      "Firestore Transaction 또는 조건부 업데이트(Precondition)를 사용하여 Race Condition을 방지한다"
    ],
    "acceptance_criteria": "동일한 orderId의 Webhook을 2번 연속 전송해도 Firestore에 N+1번 업데이트가 발생하지 않고, payments 컬렉션에 중복 문서가 생기지 않으며, 두 번째 요청에 200 OK + 'Already processed' 응답이 반환됨",
    "passes": true
  },
  {
    "id": "PAY-006",
    "category": "security",
    "description": "payments 컬렉션에 대한 Firestore Security Rules 추가",
    "steps": [
      "firestore.rules에 match /payments/{paymentId} 규칙을 추가한다",
      "읽기 권한: isAdmin()만 허용 (일반 사용자는 결제 감사 로그를 직접 조회할 수 없음)",
      "쓰기 권한: 모든 클라이언트 쓰기 거부 (Cloud Functions의 Admin SDK만 쓰기 가능)",
      "Firebase Emulator에서 Security Rules를 테스트한다: 클라이언트 SDK로 payments 컬렉션에 읽기/쓰기 시도 시 permission-denied 확인"
    ],
    "acceptance_criteria": "일반 사용자(비관리자)가 Firestore Client SDK로 payments 컬렉션을 조회하면 'permission-denied' 에러가 발생함. Admin SDK(Cloud Functions)에서는 정상적으로 읽기/쓰기 가능",
    "passes": true
  },
  {
    "id": "PAY-007",
    "category": "feature",
    "description": "PremiumDashboard 하단 Footer 안내 문구 업데이트",
    "steps": [
      "PremiumDashboard.jsx 339번 라인의 안내 문구를 수정한다",
      "기존: '결제 시스템은 정식 서비스 출시 후 활성화될 예정입니다.'",
      "변경: '모든 결제는 Lemon Squeezy를 통해 안전하게 처리됩니다.'",
      "두 번째 줄 '모든 유료 상품은 환불이 불가합니다.'는 유지한다"
    ],
    "acceptance_criteria": "PremiumDashboard 하단에 변경된 안내 문구가 정확히 표시됨",
    "passes": true
  },
  {
    "id": "PAY-008",
    "category": "feature",
    "description": "PaywallOverlay에서 직접 결제 유도 버튼 추가",
    "steps": [
      "PaywallOverlay.jsx의 CTA 버튼(현재 navigate('/dashboard/premium'))에 '직접 결제하기' 옵션을 추가한다. 기존 '업그레이드' 버튼은 유지하되, 하단에 '지금 바로 결제' 보조 버튼을 하나 더 배치하거나, 기존 버튼 자체의 onClick을 Lemon Squeezy Checkout을 직접 열도록 변경한다",
      "PaywallOverlay 내에서 createLemonSqueezyCheckout Cloud Function을 호출하고, 성공 시 LemonSqueezy.Url.Open(url)을 실행하는 로직을 추가한다",
      "EventContext에서 eventData.id를 가져올 수 있도록 useEvent() 훅을 PaywallOverlay에 연결한다",
      "결제 완료 후에는 EventContext의 billing 실시간 감청에 의해 PaywallOverlay가 자동으로 해제(children이 보임)되는 흐름을 확인한다"
    ],
    "acceptance_criteria": "게시판(Board) 탭 진입 시 PaywallOverlay가 표시되고, Overlay 내의 '결제하기' 버튼을 클릭하면 Lemon Squeezy Checkout Overlay가 직접 열림. 결제 완료 후 PaywallOverlay가 사라지고 게시판 콘텐츠가 보임",
    "passes": true
  },
  {
    "id": "PAY-009",
    "category": "setup",
    "description": "Lemon Squeezy 대시보드 설정 가이드 문서 작성",
    "steps": [
      "docs/plans/ 폴더에 lemon-squeezy-setup-guide.md 파일을 생성한다",
      "다음 내용을 포함하는 설정 가이드를 작성한다:",
      "  1. Lemon Squeezy 계정 생성 및 Store 설정 (Test Mode 활성화 방법)",
      "  2. Product 생성: 이름 'Posta Plus Pass', 설명, 가격 ₩9,900 (KRW), One-time payment 설정",
      "  3. Variant ID 확인 방법 (Product 생성 후 Dashboard에서 Variant ID 복사)",
      "  4. Webhook 설정: Callback URL = Firebase Functions URL (예: https://asia-northeast3-{project-id}.cloudfunctions.net/lemonSqueezyWebhook), 이벤트 선택: order_created",
      "  5. Webhook Signing Secret 확인 및 Firebase Secret Manager에 저장하는 방법",
      "  6. Test Mode에서 테스트 카드(4242 4242 4242 4242)로 결제 테스트 방법",
      "  7. Production Mode 전환 시 체크리스트"
    ],
    "acceptance_criteria": "docs/plans/lemon-squeezy-setup-guide.md 파일이 생성되고, 위 7개 항목이 각각 소제목과 상세 설명을 포함하여 문서화됨",
    "passes": true
  },
  {
    "id": "PAY-010",
    "category": "setup",
    "description": "Firebase Cloud Functions Secrets 설정 가이드 및 검증",
    "steps": [
      "현재 functions/index.js에서 사용하는 Secret 목록을 정리한다: LEMON_SQUEEZY_WEBHOOK_SECRET, LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET",
      "현재 사용하는 defineString 환경변수를 정리한다: LEMON_SQUEEZY_STORE_URL, LEMON_SQUEEZY_VARIANT_ID",
      "Firebase CLI로 Secret을 설정하는 명령어를 문서화한다: firebase functions:secrets:set LEMON_SQUEEZY_WEBHOOK_SECRET",
      "defineString 환경변수는 firebase functions:config:set 또는 .env.posta-system 파일에 설정하는 방법을 문서화한다",
      "functions/.env.posta-system 파일에 LEMON_SQUEEZY_STORE_URL과 LEMON_SQUEEZY_VARIANT_ID 키가 있는지 확인하고, 없으면 추가한다 (값은 placeholder)",
      "Secret과 환경변수가 올바르게 설정되었는지 검증하는 방법을 문서에 포함한다: firebase functions:secrets:access LEMON_SQUEEZY_WEBHOOK_SECRET"
    ],
    "acceptance_criteria": "docs/plans/lemon-squeezy-setup-guide.md에 Firebase Secrets 설정 섹션이 추가되고, functions/.env.posta-system에 LS 관련 환경변수 키가 존재함",
    "passes": true
  },
  {
    "id": "PAY-011",
    "category": "integration",
    "description": "Checkout Overlay eventHandler를 활용한 결제 이벤트 감지",
    "steps": [
      "lemon.js가 제공하는 eventHandler를 활용하여 Checkout Overlay의 이벤트를 감지한다. window.LemonSqueezy.Setup({ eventHandler: (event) => {...} }) 형태로 설정",
      "감지할 이벤트: 'Checkout.Success'(결제 성공), 'Checkout.Close'(오버레이 닫힘), 'PaymentMethodUpdate.Updated'(결제수단 업데이트) 등",
      "Checkout.Success 이벤트 수신 시 isCheckoutLoading 상태를 해제하고, '결제가 처리 중입니다. 잠시만 기다려주세요...' 메시지를 표시한다 (Webhook 처리가 완료되어 Firestore가 업데이트될 때까지 짧은 딜레이가 있을 수 있으므로)",
      "Checkout.Close 이벤트 수신 시 결제가 완료되지 않았다면 isCheckoutLoading을 해제한다",
      "App.jsx 또는 적절한 최상위 컴포넌트에서 LemonSqueezy.Setup을 호출하여 전역 eventHandler를 등록한다"
    ],
    "acceptance_criteria": "Checkout Overlay에서 결제 완료 후 콘솔에 Checkout.Success 이벤트가 로깅되고, 결제 처리 중 메시지가 화면에 표시됨. Overlay 닫기 시 Checkout.Close 이벤트가 감지되어 로딩 상태가 해제됨",
    "passes": true
  },
  {
    "id": "PAY-012",
    "category": "testing",
    "description": "E2E 결제 흐름 테스트 시나리오 작성 및 수동 테스트 체크리스트",
    "steps": [
      "docs/plans/ 폴더에 payment-test-checklist.md 파일을 생성한다",
      "다음 테스트 시나리오를 체크리스트 형태로 작성한다:",
      "  TC-01: 비로그인 상태에서 결제 버튼이 비활성화되고 '로그인 필요' 안내가 표시되는지 확인",
      "  TC-02: 로그인 사용자가 결제 버튼 클릭 시 Checkout Overlay가 정상적으로 열리는지 확인",
      "  TC-03: Test Mode 카드(4242...)로 결제 시 성공 흐름 확인 (Overlay → Webhook → Firestore → UI 갱신)",
      "  TC-04: 결제 실패 카드(4000...)로 결제 시 에러 처리 확인",
      "  TC-05: 이미 Plus인 이벤트에서 '이용 중' 상태가 표시되고 결제 버튼이 비활성화되는지 확인",
      "  TC-06: PaywallOverlay에서 결제 버튼 클릭 시 Checkout Overlay가 열리는지 확인",
      "  TC-07: 결제 완료 후 PaywallOverlay가 해제되고 블러 처리된 콘텐츠가 정상 표시되는지 확인",
      "  TC-08: Cloud Function 에러 시 사용자에게 적절한 에러 메시지가 표시되는지 확인",
      "  TC-09: 동일 이벤트에 대해 중복 결제 시 적절히 처리되는지 확인 (이미 Plus인 경우)",
      "  TC-10: Firestore payments 컬렉션에 결제 로그가 정확히 기록되는지 확인"
    ],
    "acceptance_criteria": "docs/plans/payment-test-checklist.md 파일이 생성되고, E2E 시나리오 5개 이상이 체크리스트 형태로 작성됨",
    "passes": true
  },
  {
    "id": "PAY-013",
    "category": "setup",
    "description": "프로덕션 배포 전 최종 점검 체크리스트",
    "steps": [
      "다음 항목을 docs/plans/lemon-squeezy-setup-guide.md에 '프로덕션 배포 체크리스트' 섹션으로 추가한다:",
      "  □ Lemon Squeezy Test Mode → Live Mode 전환 완료",
      "  □ Live Mode의 Webhook Signing Secret을 Firebase Secret Manager에 업데이트",
      "  □ Webhook Callback URL이 프로덕션 Cloud Functions URL을 가리키는지 확인",
      "  □ LEMON_SQUEEZY_STORE_URL과 LEMON_SQUEEZY_VARIANT_ID가 프로덕션 값으로 설정됨",
      "  □ LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET이 프로덕션 환경에 설정됨",
      "  □ Firestore Security Rules가 프로덕션에 배포됨 (payments 컬렉션 규칙 포함)",
      "  □ .env 및 .env.posta-system 파일이 .gitignore에 포함되어 있음을 확인",
      "  □ Live Mode에서 실제 결제 테스트(소액) 완료",
      "  □ Console logging이 과도하지 않은지 확인 (민감 정보 logging 제거)",
      "  □ CORS 설정 확인: Webhook은 onRequest이므로 CORS 불필요, Checkout 생성은 onCall이므로 자동 처리"
    ],
    "acceptance_criteria": "프로덕션 배포 체크리스트가 문서에 작성되고, 각 항목에 대한 구체적인 검증 방법이 포함됨",
    "passes": true
  }
]
```

---

## Agent Instructions

1. `activity.md`를 먼저 읽어 현재 상태를 파악한다
2. 위 Task List에서 `"passes": false`인 다음 Task를 찾는다
3. 해당 Task의 모든 steps를 순서대로 실행한다
4. acceptance_criteria에 따라 결과를 검증한다
5. 검증 완료 시 해당 Task의 `"passes"`를 `true`로 변경한다
6. `activity.md`에 완료 로그를 기록한다
7. 다음 Task로 이동하여 반복한다

**Important:** `passes` 필드만 수정한다. Task를 삭제하거나 재작성하지 않는다.

---

## Completion Criteria
모든 Task가 `"passes": true`로 표시되면 결제 연동 PRD가 완료된 것으로 간주한다.
