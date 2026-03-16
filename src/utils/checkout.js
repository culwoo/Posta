import { functions, httpsCallable } from '../api/firebase';

/**
 * Lemon Squeezy checkout을 커스텀 모달 오버레이로 실행.
 * 반투명 배경 + 가운데 iframe 모달 형태.
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

  showCheckoutModal(checkoutUrl);
}

function showCheckoutModal(url) {
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

  // Iframe
  const iframe = document.createElement('iframe');
  iframe.src = url;
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

  const cleanup = () => {
    overlay.removeEventListener('touchmove', preventBgTouch);
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
  };

  closeBtn.addEventListener('click', cleanup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
