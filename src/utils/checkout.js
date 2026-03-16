import { functions, httpsCallable } from '../api/firebase';

/**
 * Lemon Squeezy checkout을 커스텀 모달 오버레이로 실행.
 * 반투명 배경 + 가운데 iframe 모달 형태.
 *
 * 결제 완료 후 Lemon Squeezy가 iframe 내에서 주문확인 페이지로 리다이렉트하는 것을
 * 감지하여 모달을 자동으로 닫고 성공 이벤트를 dispatch 합니다.
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

  showCheckoutModal(checkoutUrl, eventId);
}

function showCheckoutModal(url, eventId) {
  // 이미 열려 있으면 중복 방지
  if (document.getElementById('posta-checkout-overlay')) return;

  // Backdrop
  const overlay = document.createElement('div');
  overlay.id = 'posta-checkout-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    background: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    touchAction: 'none',
    overscrollBehavior: 'contain',
  });

  // Modal container
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    height: '90vh',
    maxHeight: '700px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
    background: '#fff',
    margin: '0 16px',
    touchAction: 'auto',
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: '1',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.06)',
    color: '#666',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  });

  // Iframe — sandbox로 top-navigation 방지, 결제에 필요한 권한만 허용
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
  });

  document.body.style.overflow = 'hidden';

  // 배경 터치 스크롤 방지 (모달 내부는 허용)
  const preventBgTouch = (e) => {
    if (!modal.contains(e.target)) e.preventDefault();
  };
  overlay.addEventListener('touchmove', preventBgTouch, { passive: false });

  const cleanup = (isSuccess = false) => {
    overlay.removeEventListener('touchmove', preventBgTouch);
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('message', handleMessage);

    if (isSuccess) {
      // React 컴포넌트에서 catch할 수 있는 커스텀 이벤트
      window.dispatchEvent(new CustomEvent('posta:checkout-success', { detail: { eventId } }));
    }
  };

  // Lemon Squeezy postMessage 이벤트 감지
  // Lemon Squeezy는 'Checkout.Success' 등의 이벤트를 postMessage로 보냄
  const handleMessage = (e) => {
    // Lemon Squeezy 도메인에서 온 메시지만 처리
    if (!e.origin || (!e.origin.includes('lemonsqueezy.com'))) return;

    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

      // Lemon Squeezy 이벤트 형식 감지
      // 가능 형식: { event: 'Checkout.Success' } 또는 그 외 완료 관련 이벤트
      const eventName = data?.event || data?.name || '';

      if (
        eventName === 'Checkout.Success' ||
        eventName === 'Checkout.Complete' ||
        eventName === 'PaymentMethodUpdate.Updated'
      ) {
        console.log('[Posta] Checkout 성공 감지:', eventName);
        cleanup(true);
        return;
      }

      // Lemon Squeezy에서 'Checkout.Close' 이벤트 전송 시
      if (eventName === 'Checkout.Close') {
        cleanup(false);
        return;
      }
    } catch {
      // JSON 파싱 실패 → 무시
    }
  };

  window.addEventListener('message', handleMessage);

  closeBtn.addEventListener('click', () => cleanup(false));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup(false);
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cleanup(false);
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
