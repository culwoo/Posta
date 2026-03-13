# Posta 요금제 개편 및 결제 연동 설계

## 목표
- 기존 복잡한 요금제(Free, Basic, Pro, Account Premium)를 폐지하고 **Free / Plus 단일 요금제(공연당 결제)**로 전면 개편한다.
- 관리자용 핵심 편의 기능(QR 체크인, 통계 등)은 완전 무료로 제공하여 호스트 리텐션을 높인다.
- 관객 경험 개선(광고 제거, 응원 게시판 오픈)을 Plus 결제의 주요 가치 창출 포인트(허들)로 삼는다.
- 추후 Lemon Squeezy 결제 시스템 연동을 위한 토대를 마련한다.

---

## 1. 요금제 구조 개편

### 요금제 구분
* **Free (무료)**
  * 공연별 생성 시 기본 적용.
  * 기존 모든 핵심 관리자 기능(체크인, 현장 관리, 예매/좌석 선택, 기본 통계 등) 무료 이용 가능.
  * **제한 사항:**
    * ❌ 관객 페이지(홈, 예매 완료 페이지 등)에 광고 노출 (추후 Google Ads 등 반영).
    * ❌ '응원하기(커뮤니티/방명록)' 기능 막힘 (사용자 소통 창구 닫힘).

* **Plus (유료, 1회성 결제)**
  * 특정 공연 단위로 결제하여 적용 (구독형 모델 아님).
  * ₩9,900 (가격은 코드 상표기 기준, 추후 Lemon Squeezy에 동일하게 설정).
  * **프리미엄 혜택:**
    * ✅ 해당 공연의 모든 관객 페이지 광고 સંપૂર્ણ 제거.
    * ✅ 응원 게시판/방명록 기능 활성화.

---

## 2. 권한/퍼미션(Permissions) 시스템 변경 사항

`src/utils/permissions.js`의 역할 축소 및 변경.
- **TIERS 변경:** `free`, `basic`, `pro`, `account_premium` 구조 -> `free`, `plus` 두 개로 간소화.
- **TIER_FEATURES 간소화:**
  - `home`, `info`, `reserve`, `admin`, `checkin`, `onsite`, `audience`, `advancedAnalytics` -> 전부 `free` 등급으로 하향.
  - `board` (응원 게시판), `adFree` (광고 제거) 기능만 -> `plus` 등급에 배정.
- **DEFAULT_BILLING:** 업데이트 반영.

---

## 3. UI/UX 연관 개편안

### 1) PremiumDashboard.jsx 개편
- 기존 카드가 여러 장인 대시보드 대신, "Plus 패스" 단일 상품의 가치를 강조하는 대시보드로 변경.
- 결제가 유도될 수 있도록, "결제하기" (Coming Soon 상태 유지, 추후 결제 시스템 연동 시 Lemon Squeezy 모달 호출) 버튼을 눈에 띄게 배치.

### 2) FeatureGate / PaywallOverlay 연동 수정
- 게시판(Board) 탭 접근 시 나타나는 페이월(과금 유도 팝업 창)을, 새로운 요금제 설명("응원 게시판과 광고 없는 쾌적한 화면을 위해 Plus 패스로 업그레이드하세요!")으로 문구와 로직 수정.

### 3) DevTierToggle 등 개발자용 권한 디버깅 컴포넌트 정리
- 토글 옵션을 `free`, `plus` 2가지로 축소.

---

## 4. 이후 구축 계획 (Implementation Plan)

- **Step 1:** `src/utils/permissions.js` 내용을 새 정책에 맞게 수정.
- **Step 2:** 페이월 UI(`PaywallOverlay.jsx` 등) 및 요금제 안내 대시보드(`PremiumDashboard.jsx`) 내용 변경.
- **Step 3:** 변경된 권한 체계에 맞춰 기타 컴포넌트(`EventLayout`, `AuthContext` 내 프리미엄 관련 로직 제거 등) 정리.
- **Step 4:** Lemon Squeezy 시스템 연동 기획 및 코드 구현 진행.
