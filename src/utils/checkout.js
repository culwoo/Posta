import { db, doc, onSnapshot, functions, httpsCallable } from '../api/firebase';

/**
 * 모바일 기기 여부 판별.
 * Lemon Squeezy checkout이 모바일 iframe 안에서 404를 반환하므로,
 * 모바일에서는 새 탭으로 열어야 한다.
 */
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth <= 768);
}

/**
 * Lemon Squeezy checkout 실행.
 *
 * - 데스크톱: 커스텀 모달 오버레이(iframe)
 * - 모바일: 새 탭으로 열기 (Lemon Squeezy가 모바일 iframe을 지원하지 않음)
 *
 * 두 경우 모두 Firestore 이벤트를 실시간 감시하여,
 * 웹훅이 결제를 처리하고 티어가 'plus'로 변경되면 성공 처리합니다.
 *
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function openCheckout(eventId) {
  const createCheckout = httpsCallable(functions, 'createLemonSqueezyCheckout');
  const response = await createCheckout({ eventId });
  const checkoutUrl = String(response.data?.url || '').trim();

  if (!checkoutUrl.startsWith('https://')) {
    throw new Error('유효한 결제 링크를 받지 못했습니다.');
  }

  if (isMobile()) {
    openCheckoutNewTab(checkoutUrl, eventId);
  } else {
    showCheckoutModal(checkoutUrl, eventId);
  }
}

/**
 * 모바일: 새 탭으로 checkout 열기 + Firestore 실시간 감시.
 * 결제 완료 시 Firestore 리스너가 tier 변경을 감지하여 success 이벤트를 발생시킨다.
 */
function openCheckoutNewTab(url, eventId) {
  window.open(url, '_blank');

  let resolved = false;

  // Firestore 실시간 감시: 결제 완료 시 success 이벤트 발생
  const docRef = doc(db, 'events', eventId);
  const unsub = onSnapshot(docRef, (snap) => {
    if (resolved) return;
    if (snap.exists()) {
      const tier = snap.data().billing?.tier || 'free';
      if (tier === 'plus') {
        resolved = true;
        console.log('[Posta] Firestore billing tier updated to plus (mobile checkout).');
        unsub();
        window.dispatchEvent(new CustomEvent('posta:checkout-success', { detail: { eventId } }));
      }
    }
  });

  // 5분 후 리스너 자동 해제 (안전장치)
  setTimeout(() => {
    if (resolved) return;
    resolved = true;
    unsub();
    window.dispatchEvent(new CustomEvent('posta:checkout-cancel', { detail: { eventId } }));
  }, 5 * 60 * 1000);
}

function showCheckoutModal(url, eventId) {
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
    touchAction: 'none', // 모달 뒤 스크롤 방지
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

  // Iframe (부모 창 이동 차단, 결제에 필요한 권한만)
  const iframe = document.createElement('iframe');
  iframe.src = url;
  // allow-top-navigation이 없으므로 iframe 내부에서 부모 창 이동 불가
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
  });

  document.body.style.overflow = 'hidden';

  const preventBgTouch = (e) => {
    if (!modal.contains(e.target)) e.preventDefault();
  };
  overlay.addEventListener('touchmove', preventBgTouch, { passive: false });

  let firestoreUnsub = null;

  const cleanup = (isSuccess = false) => {
    overlay.removeEventListener('touchmove', preventBgTouch);
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);

    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }

    if (isSuccess) {
      window.dispatchEvent(new CustomEvent('posta:checkout-success', { detail: { eventId } }));
    } else {
      // 강제로 창을 닫은 경우라도 로딩 상태 해제를 위해 cancel 이벤트를 보낼 수 있음
      window.dispatchEvent(new CustomEvent('posta:checkout-cancel', { detail: { eventId } }));
    }
  };

  closeBtn.addEventListener('click', () => cleanup(false));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup(false);
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') cleanup(false);
  };
  document.addEventListener('keydown', handleKeyDown);

  // Firestore 상태 감시: 웹훅으로 인해 DB상에서 결제가 확인되면 즉시 모달 닫기
  const docRef = doc(db, 'events', eventId);
  firestoreUnsub = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const tier = snap.data().billing?.tier || 'free';
      if (tier === 'plus') {
        console.log('[Posta] Firestore billing tier updated to plus. Closing checkout modal.');
        cleanup(true);
      }
    }
  });

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
