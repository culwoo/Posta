import { db, doc, functions, httpsCallable, onSnapshot } from '../api/firebase';

const requestPlusBankTransfer = httpsCallable(functions, 'requestPlusBankTransfer');
const PLUS_PRICE_KRW = 9900;

const bankAccount = {
  bankName: import.meta.env.VITE_PLUS_BANK_NAME || '',
  accountNumber: import.meta.env.VITE_PLUS_BANK_ACCOUNT || '',
  accountHolder: import.meta.env.VITE_PLUS_BANK_HOLDER || '',
  contact: import.meta.env.VITE_PLUS_BANK_CONTACT || '',
};

const formatWon = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;

const getBankTransferErrorMessage = (error) => {
  const code = String(error?.code || '').replace(/^functions\//, '');
  if (code === 'unauthenticated') {
    return '로그인 후 입금 신청을 진행해주세요.';
  }
  if (code === 'permission-denied') {
    return '이 공연의 관리자만 입금 신청을 할 수 있습니다.';
  }
  if (code === 'not-found') {
    return '입금 신청 기능이 아직 서버에 반영되지 않았습니다. 관리자에게 문의해주세요.';
  }
  if (code === 'invalid-argument') {
    return '입금 신청 정보가 올바르지 않습니다. 입금자명을 확인해주세요.';
  }
  if (code === 'internal' || error?.message === 'internal') {
    return '입금 신청을 저장하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
  }
  return error?.message || '입금 신청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.';
};

export function prepareCheckout(eventId) {
  return Promise.resolve(eventId || null);
}

export async function openCheckout(eventId) {
  if (!eventId) {
    throw new Error('결제할 공연을 찾지 못했습니다.');
  }
  showBankTransferModal(eventId);
}

function showBankTransferModal(eventId) {
  if (document.getElementById('posta-checkout-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'posta-checkout-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    background: 'rgba(0, 0, 0, 0.68)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '18px',
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
    background: '#ffffff',
    color: '#111827',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '\u2715';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: '1',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(17,24,39,0.07)',
    color: '#4b5563',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    padding: '28px',
  });

  const missingAccount = !bankAccount.bankName || !bankAccount.accountNumber || !bankAccount.accountHolder;
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);display:grid;place-items:center;color:#fff;font-weight:900;">P</div>
      <div>
        <div style="font-size:18px;font-weight:800;">Plus Pass 무통장 입금</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">입금 확인 후 관리자가 Plus를 활성화합니다.</div>
      </div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb;margin:18px 0;">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <span style="color:#6b7280;font-size:13px;">입금 금액</span>
        <strong style="font-size:16px;">${formatWon(PLUS_PRICE_KRW)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <span style="color:#6b7280;font-size:13px;">은행</span>
        <strong>${bankAccount.bankName || '미설정'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <span style="color:#6b7280;font-size:13px;">계좌번호</span>
        <strong style="word-break:break-all;text-align:right;">${bankAccount.accountNumber || '미설정'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;">
        <span style="color:#6b7280;font-size:13px;">예금주</span>
        <strong>${bankAccount.accountHolder || '미설정'}</strong>
      </div>
    </div>
    ${missingAccount ? `
      <div style="border:1px solid #f59e0b33;background:#fffbeb;color:#92400e;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;margin-bottom:14px;">
        입금 계좌 환경변수가 아직 설정되지 않았습니다. VITE_PLUS_BANK_NAME, VITE_PLUS_BANK_ACCOUNT, VITE_PLUS_BANK_HOLDER를 설정해주세요.
      </div>
    ` : ''}
    <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">입금자명</label>
    <input id="posta-bank-depositor" type="text" placeholder="실제 입금자명을 입력하세요" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:11px 12px;font-size:14px;margin-bottom:12px;" />
    <p style="font-size:12px;color:#6b7280;line-height:1.55;margin:0 0 18px;">
      입금 신청을 남긴 뒤 위 계좌로 입금해주세요. 확인은 수동으로 진행되며, 승인되면 이 화면의 Plus 상태가 자동으로 갱신됩니다.
      ${bankAccount.contact ? `<br/>문의: ${bankAccount.contact}` : ''}
    </p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="posta-copy-account" type="button" style="flex:1;min-width:120px;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:10px;padding:11px 12px;font-weight:700;cursor:pointer;">계좌 복사</button>
      <button id="posta-submit-bank-transfer" type="button" style="flex:1.4;min-width:150px;border:none;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:10px;padding:11px 12px;font-weight:800;cursor:pointer;">입금 신청하기</button>
    </div>
  `;

  let firestoreUnsub = null;
  let closed = false;

  const cleanup = (eventName = 'posta:checkout-cancel') => {
    if (closed) return;
    closed = true;
    if (firestoreUnsub) firestoreUnsub();
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
    window.dispatchEvent(new CustomEvent(eventName, { detail: { eventId } }));
  };

  const setSubmittedState = () => {
    content.innerHTML = `
      <div style="padding:8px 0;text-align:center;">
        <div style="width:46px;height:46px;border-radius:50%;background:#ecfdf5;color:#059669;display:grid;place-items:center;margin:0 auto 14px;font-size:24px;font-weight:900;">✓</div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px;">입금 신청이 접수되었습니다</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 18px;">
          ${formatWon(PLUS_PRICE_KRW)} 입금 확인 후 관리자가 Plus Pass를 활성화합니다.
          승인되면 대시보드가 자동으로 갱신됩니다.
        </p>
        <button id="posta-close-bank-transfer" type="button" style="border:none;background:#111827;color:#fff;border-radius:10px;padding:11px 16px;font-weight:800;cursor:pointer;">확인</button>
      </div>
    `;
    content.querySelector('#posta-close-bank-transfer')?.addEventListener('click', () => cleanup('posta:checkout-pending'));
    window.dispatchEvent(new CustomEvent('posta:checkout-pending', { detail: { eventId } }));
  };

  const handleSubmit = async () => {
    const submitBtn = content.querySelector('#posta-submit-bank-transfer');
    const depositorInput = content.querySelector('#posta-bank-depositor');
    const depositorName = String(depositorInput?.value || '').trim();

    if (!depositorName) {
      window.alert('입금자명을 입력해주세요.');
      depositorInput?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '신청 중...';
    try {
      const response = await requestPlusBankTransfer({
        eventId,
        depositorName,
        amount: PLUS_PRICE_KRW,
        origin: window.location.origin,
      });
      if (response.data?.alreadyPlus) {
        cleanup('posta:checkout-success');
        return;
      }
      setSubmittedState();
    } catch (error) {
      console.error('[Posta] Bank transfer request failed:', error);
      window.alert(getBankTransferErrorMessage(error));
      submitBtn.disabled = false;
      submitBtn.textContent = '입금 신청하기';
    }
  };

  const handleCopy = async () => {
    const accountText = `${bankAccount.bankName} ${bankAccount.accountNumber} ${bankAccount.accountHolder}`.trim();
    if (!accountText) return;
    try {
      await navigator.clipboard.writeText(accountText);
      window.alert('계좌 정보가 복사되었습니다.');
    } catch {
      window.alert('복사에 실패했습니다. 계좌번호를 직접 복사해주세요.');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') cleanup();
  };

  closeBtn.addEventListener('click', () => cleanup());
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) cleanup();
  });
  document.addEventListener('keydown', handleKeyDown);

  modal.appendChild(closeBtn);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  content.querySelector('#posta-copy-account')?.addEventListener('click', handleCopy);
  content.querySelector('#posta-submit-bank-transfer')?.addEventListener('click', handleSubmit);

  firestoreUnsub = onSnapshot(doc(db, 'events', eventId), (snap) => {
    if (!snap.exists()) return;
    if (snap.data().billing?.tier === 'plus') {
      cleanup('posta:checkout-success');
    }
  });
}
