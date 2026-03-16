# 수동 결제 E2E 테스트 및 배포 체크리스트

의도치 않은 결제 오류를 방지하고, Posta 사용자에게 안정적인 결제 경험을 제공하기 위한 Checklist입니다.

## 🧪 E2E 수동 테스트 항목 (PAY-012)
다음 시나리오들은 결제가 발생할 수 있는 주요 동선에서 수행되어야 합니다:

### A. 미로그인/무권한 사용자 결제 방해 시도
- [ ] TC-01: (비회원/게스트) Premium Dashboard 또는 결제 버튼 접근 시, 버튼이 비활성화되거나 "로그인 필요" 안내 모달/페이지 리다이렉트가 표출되는가?
- [ ] TC-02: (A 계정의 이벤트를 B 계정이 접근 시) 해당 이벤트의 결제창이나 관리자 URL로 바로 진입하더라도 401 Not Authorized 또는 Paywall로 정확히 방어되는가?

### B. 결제 흐름 (Overlay 열기 + 결제 처리)
- [ ] TC-03: (주최자/이벤트 생성자) "지금 바로 결제하기" (PaywallOverlay 내장) 기능 클릭 시 Lemon Squeezy 모달이 "Test Mode"로 정확히 나타나는가?
- [ ] TC-04: Test Mode에서 결제 (카드번호 4242..) 시도 시 정상적으로 결제 성공 페이지 또는 완료 팝업으로 이어지는가?
- [ ] TC-05: 결제창을 사용자가 강제로 [X] 버튼이나 Overlay 바깥을 클릭하여 닫을 경우, 콘솔에 `Checkout.Close`가 잡히며 로딩 애니메이션이 해제(isCheckoutLoading=false)되는가?

### C. Webhook 및 UI 실시간 병렬 반영 (가장 중요 단계)
- [ ] TC-06: 결제 완료 직후 Firebase Functions 로그(`lemonSqueezyWebhook`)에 `order_created` 요청이 수신되고 "Successfully upgraded event ..." 라는 메시지가 남는가?
- [ ] TC-07: 브라우저에서는 새로고침을 하지 않아도 1~3초 내외에 Firestore의 onSnapshot 이벤트를 받아 "Plus 패스가 활성화되었습니다!" Toast(녹색 테두리 애니메이션)가 노출되는가?
- [ ] TC-08: 동시에, 기존 PaywallOverlay로 막혀있던 기능(예: 커뮤니티 게시판)의 락이 해제되어 바로 콘텐츠 열람이 가능한가?

### D. 데이터 정합성 (결제 감사 로그 & 멱등성 검증)
- [ ] TC-09: Firestore의 `events/{eventId}` 내부 `billing` 필드가 `tier: "plus"`, `orderId`, `purchasedAt` 정보로 갱신되었나?
- [ ] TC-10: 별도 `payments` 컬렉션에 새 레코드가 생성되어, 주문번호(`orderId`) 및 금액/상태 정보가 남았나?
- [ ] TC-11: (테스트) Postman 등으로 동일한 Payload(동일 orderId)를 Webhook 엔드포인트에 1~2초 간격으로 연속 2번 이상 전송할 시, 중복 처리되지 않고 "Already processed" (200 OK)만 리턴하는가?


---

## 🚀 Live 배포 전 점검 (PAY-013)
프로덕션(상용) 환경으로 전환하기 전에 개발자가 최종 점검해야 하는 항목입니다:

- [ ] **Lemon Squeezy Store 승인 상태 점검**: 계정 승인 완료 (Live Mode 활성 가능 여부)
- [ ] **Test Mode 환경변수 비활성화**: 코드상 (`getLemonCheckoutConfig` 함수) 강제로 하드코딩되거나 Test API Endpoint를 가리키던 부분이 있다면 Live용으로 교체.
- [ ] **Webhook Signing Secret 강화**: 현재 `posta123?` 등의 약한 임시 시크릿 문자열을 사용 중이라면 **반드시** 랜덤된 64자리 긴 문자열로 재발급한 후, LS 설정창과 Google Secret Manager (또는 DB) 양쪽 업데이트 및 Functions 재배포.
- [ ] **Billing Error 시나리오 대책**: 실결제 오류나 환불 (`order_refunded` Webhook) 시 등급을 "free"로 롤백할 수 있는 아키텍처나 운영 대응 정책(`refund_created` Webhook 리스너 확장 등)이 예정되어 있는지 계획 공유.
- [ ] **실결제 + 환불 E2E 1회 필수 진행**: "내 실제 신용카드"로 9,900원 결제를 하고 정상 Tier 반영 후 결제 취소하는 워크플로우를 테스트하여 Production의 통신 상태에 문제가 없는지 확신할 것.
