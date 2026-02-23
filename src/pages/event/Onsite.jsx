import React, { useState } from "react";
import { db, collection, addDoc } from "../../api/firebase";
import { useEvent } from "../../contexts/EventContext";
import classes from "./Onsite.module.css";

const Onsite = () => {
  const { eventId, eventData } = useEvent();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이벤트에서 입금 정보 가져오기
  const payment = eventData?.payment || {};
  const bankName = payment.bankName || '';
  const accountNumber = payment.accountNumber || '';
  const accountHolder = payment.accountHolder || '';
  const onsitePrice = payment.onsitePrice || '';
  const displayAccount = bankName && accountNumber ? `${bankName} ${accountNumber}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!eventId) return;

    setIsSubmitting(true);
    try {
      const token = 'o_' + Math.random().toString(36).substr(2, 9);
      await addDoc(collection(db, "events", eventId, "reservations"), {
        name: name.trim(),
        phone: phone.trim(),
        token,
        status: "onsite",
        depositConfirmed: false,
        createdAt: new Date().toISOString(),
        description: "현장 결제"
      });
      setStep(2);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("오류가 발생했습니다. 데스크에 문의해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAccount = async () => {
    if (!displayAccount) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(displayAccount);
        alert("계좌번호가 복사되었습니다.");
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = displayAccount;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("계좌번호가 복사되었습니다.");
      }
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };

  return (
    <div className={classes.container}>
      {step === 1 ? (
        <>
          <h2 className={classes.title}>현장 예매</h2>
          <p className={classes.subtitle}>
            성함과 연락처를<br />
            입력해주세요.
          </p>
          <form onSubmit={handleSubmit} className={classes.form}>
            <div className={classes.inputGroup}>
              <label>성함</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                required
              />
            </div>
            <div className={classes.inputGroup}>
              <label>연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                required
              />
            </div>
            <button
              type="submit"
              className={classes.submitBtn}
              disabled={isSubmitting}
            >
              현장 결제 요청하기
            </button>
          </form>
        </>
      ) : (
        <div className={classes.successStep}>
          <h3 className={classes.successTitle}>접수되었습니다!</h3>

          {onsitePrice && (
            <p className={classes.amount}>
              결제 금액: <strong>{Number(onsitePrice).toLocaleString()}원</strong>
            </p>
          )}

          {displayAccount && (
            <div className={classes.bankBox}>
              <button
                type="button"
                className={classes.bankCopyBtn}
                onClick={handleCopyAccount}
              >
                {displayAccount}
              </button>
              {accountHolder && (
                <p className={classes.bankOwner}>예금주 {accountHolder} (터치하여 복사)</p>
              )}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '1.5rem',
            width: '100%',
            maxWidth: '320px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: '1rem'
          }}>
            <a href="supertoss://" style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#3182f6', color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem' }}>
              토스로 송금
            </a>
            <a href="kakaotalk://kakaopay" style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#fee500', color: '#191919', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem' }}>
              카카오페이
            </a>
          </div>

          <p className={classes.guideText}>
            입금 후 데스크 스태프에게<br />
            입금 완료를 말씀해주세요.<br />
            확인 후 바로 입장 가능합니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default Onsite;
