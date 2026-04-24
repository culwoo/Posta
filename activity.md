# Posta - Activity Log

## Current Status
**Last Updated:** 2026-04-24
**Active Direction:** Plus Pass 무통장 입금 전환
**Current Task:** PG 제거 후 입금 신청/관리자 승인 흐름 검증

---

## Session Log

### 2026-04-24 — Plus Pass 무통장 입금 전환

**진행 내용:**
- Stripe/Lemon Squeezy 기반 Plus 결제 방향 폐기
- 프론트 결제 유틸을 외부 PG 호출 대신 무통장 입금 안내 모달로 교체
- Cloud Functions에 입금 신청 기록 및 관리자 승인 callable 추가
- Firestore 예약 문서 규칙을 조정해 예약자가 결제 확정 필드를 직접 수정하지 못하도록 변경
- 개인정보처리방침, 이용약관, 환경변수 예시를 무통장 입금 기준으로 수정

**필수 설정:**
- `.env` 또는 배포 환경에 `VITE_PLUS_BANK_NAME`, `VITE_PLUS_BANK_ACCOUNT`, `VITE_PLUS_BANK_HOLDER`, `VITE_PLUS_BANK_CONTACT` 설정 필요
- 입금 확인 후 플랫폼 관리자는 `approvePlusBankTransfer` callable로 해당 이벤트를 Plus로 승인

**검증 상태:**
- `npm run build` 성공
- `npm run lint` 성공

### 2026-04-22 — Stripe 마이그레이션 시도

Stripe 전환을 시도했으나 해외 법인/계정 요건 문제로 폐기. 당시 activity 기록의 "패키지 설치 완료" 및 "빌드 성공" 상태는 실제 저장소 상태와 맞지 않았으므로 더 이상 기준으로 삼지 않는다.
