import { functions, httpsCallable } from '../api/firebase';

/**
 * Lemon Squeezy 공식 오버레이(lemon.js)를 사용하여 결제 진행.
 *
 * lemon.js(index.html에서 로드)가 제공하는 LemonSqueezy.Url.Open()을 사용하면
 * 결제 완료 후 "계속" 버튼 클릭 시 부모 페이지 이동 없이 오버레이만 닫힙니다.
 *
 * @param {string} eventId
 * @returns {Promise<void>}
 * @throws {Error} Cloud Function 호출 실패 시
 */
export async function openCheckout(eventId) {
  const createCheckout = httpsCallable(functions, 'createLemonSqueezyCheckout');
  const response = await createCheckout({ eventId });
  const checkoutUrl = String(response.data?.url || '').trim();

  if (!checkoutUrl.startsWith('https://')) {
    throw new Error('유효한 결제 링크를 받지 못했습니다.');
  }

  // lemon.js 초기화 (React에서는 컴포넌트 렌더링 후 호출해야 할 수 있음)
  if (typeof window.createLemonSqueezy === 'function') {
    window.createLemonSqueezy();
  }

  // Checkout.Success 이벤트 핸들러 등록
  if (typeof window.LemonSqueezy !== 'undefined') {
    window.LemonSqueezy.Setup({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          console.log('[Posta] Checkout.Success 이벤트 감지:', event);
          window.dispatchEvent(
            new CustomEvent('posta:checkout-success', { detail: { eventId } })
          );
        }
      },
    });
  }

  // 공식 오버레이로 열기 (lemon.js가 로드되어 있는 경우)
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(checkoutUrl);
  } else {
    // lemon.js 미로드 시 fallback: 새 탭으로 열기
    console.warn('[Posta] lemon.js가 로드되지 않았습니다. 새 탭에서 결제를 진행합니다.');
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  }
}
