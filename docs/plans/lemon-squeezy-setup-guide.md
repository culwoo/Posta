# Lemon Squeezy & Firebase 설정 가이드

본 문서는 Posta 프로젝트에 Lemon Squeezy 결제 시스템을 연동하고, Firebase 환경 변수 및 Cloud Functions Secrets를 설정하는 방법을 안내합니다.

## 1. Lemon Squeezy Store 및 Product 설정
1. **Store 생성**: Lemon Squeezy 계정을 생성하고 새 Store (예: "Posta")를 만듭니다. (초기에는 Test Mode 장려)
2. **통화 및 Payout 설정**: Base 통화를 `KRW`로 설정합니다.
3. **Product 생성**:
   - Name: `Posta Plus Pass`
   - Description: 광고 제거 및 응원 게시판 활성화 등 프리미엄 기능
   - Pricing: `Single payment` (일회성 결제) / `₩9,900`
4. **Variant ID 획득**: Product 생성 후 해당 Product 페이지 또는 API 옵션에서 `Variant ID`를 복사하여 기록합니다.

## 2. Webhook 설정
1. Lemon Squeezy 대시보드 > **Settings > Webhooks** 메뉴로 이동합니다.
2. 새 Webhook 추가 (`+` 버튼):
   - **Callback URL**: Firebase에서 배포된 Functions URL
     - 예: `https://lemonSqueezyWebhook-xxxxx-as.a.run.app` 또는 `https://asia-northeast3-<PROJECT_ID>.cloudfunctions.net/lemonSqueezyWebhook`
   - **Signing Secret**: 임의의 강력한 문자열 생성 (예: 프로덕션용으로 `랜덤한_64자리_문자열`)
   - **Events**: `order_created` 만 체크합니다 (불필요한 트래픽 방지).
3. 저장 후 Webhook 상태가 Active인지 확인합니다.

## 3. Firebase Secrets & 환경변수 설정
Cloud Functions에 배포된 Webhook 핸들러 및 생성 API 구현을 위해 다음을 설정해야 합니다.

### A. 일반 환경 변수 (`.env.posta-system`)
`functions/.env.posta-system` 파일을 열어 다음 값을 지정합니다:
```env
LEMON_SQUEEZY_STORE_URL=https://<your-store>.lemonsqueezy.com
LEMON_SQUEEZY_VARIANT_ID=<복사한 Variant ID>
# 로컬 개발 시에는 LEMON_SQUEEZY_DUMMY_MODE=true 로 우회 가능
```

### B. Secret Manager 연동 (안전한 키 저장)
API Key와 Webhook Signature Secret은 `.env` 파일에 기록하지 않고, Firebase Secret Manager를 통해 보안 저장소에 등록해야 합니다.

```bash
# Webhook 검증용 Secret 등록 (Lemon Squeezy에서 설정한 Signing Secret값 입력)
firebase functions:secrets:set LEMON_SQUEEZY_WEBHOOK_SECRET

# Checkout URL 서명용 Secret 등록 (API 통신용 또는 해시용 커스텀 시크릿)
firebase functions:secrets:set LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET

# API 호출용 API Key (향후 Subscription, Order 조회 시 필요할 경우)
firebase functions:secrets:set LEMON_SQUEEZY_API_KEY
```

**설정 검증:**
등록한 Secret이 잘 배포되었는지 확인하려면 다음 명령어를 사용합니다:
```bash
firebase functions:secrets:access LEMON_SQUEEZY_WEBHOOK_SECRET
```

## 4. Test Mode 실행 가이드
- **Test Mode 활성화 (Lemon Squeezy 대시보드)**: 화면 우측 상단의 `Test Mode` 토글을 켭니다.
- **테스트 결제 진행**: Checkout Overlay가 떴을 때 실제 카드가 아닌 **Test Card** 정보를 입력합니다.
   - 카드번호: `4242 4242 4242 4242`
   - 만료일: 미래의 아무 날짜 (예: `12 / 28`)
   - CVC: `123`
- Webhook 기록은 Firebase Analytics 또는 GCP Log Explorer (`functions` 필터)에서 확인할 수 있습니다.

## 5. 프로덕션(Live Mode) 전환 시 체크리스트
- [ ] Lemon Squeezy Store 승인 대기 완료 및 Live Mode 활성화
- [ ] Product URL/Variant ID가 Live 환경의 것으로 교체되었는지 확인 (`functions/.env.posta-system`)
- [ ] 변경된 `LEMON_SQUEEZY_WEBHOOK_SECRET`을 Secret Manager에 재등록 (또는 값 업데이트) 및 `firebase deploy --only functions` 실행
- [ ] 프론트엔드 환경 변수 (`VITE_...`)가 Live Store URL을 향하고 있는지 검증
- [ ] Live 환경의 테스트 결제 (소액 결제 후 즉시 환불 처리 등) 1회 진행하여 최종 점검
