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
  const mobile = isMobile();
  const pendingTab = mobile ? openPendingCheckoutTab() : null;
  const pendingModal = mobile ? null : showCheckoutPendingModal(eventId);

  const createCheckout = httpsCallable(functions, 'createLemonSqueezyCheckout');
  let checkoutUrl = '';

  try {
    const response = await createCheckout({ eventId });
    checkoutUrl = String(response.data?.url || '').trim();
  } catch (error) {
    pendingModal?.remove();
    if (pendingTab && !pendingTab.closed) pendingTab.close();
    throw error;
  }

  if (!checkoutUrl.startsWith('https://')) {
    pendingModal?.remove();
    if (pendingTab && !pendingTab.closed) pendingTab.close();
    throw new Error('유효한 결제 링크를 받지 못했습니다.');
  }

  if (mobile) {
    openCheckoutNewTab(checkoutUrl, eventId, pendingTab);
  } else {
    if (pendingModal?.isCancelled()) return;
    pendingModal?.remove();
    showCheckoutModal(checkoutUrl, eventId);
  }
}

/**
 * 모바일: 새 탭으로 checkout 열기 + Firestore 실시간 감시.
 * 결제 완료 시 Firestore 리스너가 tier 변경을 감지하여 success 이벤트를 발생시킨다.
 */
function openPendingCheckoutTab() {
  const checkoutWindow = window.open('', '_blank');
  if (!checkoutWindow) return null;

  checkoutWindow.document.write(`
    <!doctype html>
    <title>Posta 결제창 준비 중</title>
    <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#111827;color:#fff;display:grid;place-items:center;min-height:100vh;">
      <div style="text-align:center;padding:24px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">결제창을 준비하고 있어요</div>
        <div style="font-size:14px;color:rgba(255,255,255,.68);">잠시만 기다려주세요.</div>
      </div>
    </body>
  `);
  checkoutWindow.document.close();
  return checkoutWindow;
}

function openCheckoutNewTab(url, eventId, checkoutWindow = null) {
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.location.href = url;
  } else {
    window.open(url, '_blank');
  }

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

function showCheckoutPendingModal(eventId) {
  if (document.getElementById('posta-checkout-overlay')) {
    return {
      remove: () => {},
      isCancelled: () => false,
    };
  }

  let cancelled = false;
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
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    minHeight: '180px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
    background: '#fff',
    margin: '0 16px',
    display: 'grid',
    placeItems: 'center',
    color: '#111827',
    textAlign: 'center',
  });

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

  const content = document.createElement('div');
  content.innerHTML = `
    <div style="width:34px;height:34px;border:3px solid rgba(139,92,246,.18);border-top-color:#8b5cf6;border-radius:50%;margin:0 auto 16px;animation:postaCheckoutSpin .8s linear infinite;"></div>
    <div style="font-size:18px;font-weight:800;margin-bottom:8px;">결제창 준비 중</div>
    <div style="font-size:14px;color:#6b7280;line-height:1.5;">Lemon Squeezy 결제 세션을 만들고 있어요.<br/>잠시만 기다려주세요.</div>
  `;

  const style = document.createElement('style');
  style.textContent = '@keyframes postaCheckoutSpin { to { transform: rotate(360deg); } }';

  const cleanup = (dispatchCancel = true) => {
    if (!overlay.isConnected) return;
    overlay.remove();
    document.body.style.overflow = '';
    if (dispatchCancel) {
      cancelled = true;
      window.dispatchEvent(new CustomEvent('posta:checkout-cancel', { detail: { eventId } }));
    }
  };

  closeBtn.addEventListener('click', () => cleanup(true));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) cleanup(true);
  });

  document.body.style.overflow = 'hidden';
  modal.appendChild(style);
  modal.appendChild(closeBtn);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return {
    remove: () => cleanup(false),
    isCancelled: () => cancelled,
  };
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
