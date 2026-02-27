import React, { useState, useEffect } from "react";
import {
  auth,
  db,
  functions,
  httpsCallable,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL
} from "../../api/firebase";
import { useEvent } from "../../contexts/EventContext";
import AIProgressTimer from "../../components/AIProgressTimer";
import classes from "./Reservation.module.css";

const Reservation = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: Input, 2: Success
  const [reservationId, setReservationId] = useState(null);
  const [reservationToken, setReservationToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [depositConfirmed, setDepositConfirmed] = useState(false);
  const [verifyingAI, setVerifyingAI] = useState(false);

  const { eventId, eventData } = useEvent();
  const [isReservationClosed, setIsReservationClosed] = useState(false); // 깜빡임 방지를 위해 기본값을 false로 변경
  const [isFreeEvent, setIsFreeEvent] = useState(false);

  // 새로고침 대비: localStorage에서 기존 예약 기록 가져오기 및 DB 검증
  useEffect(() => {
    const verifyLocalReservation = async () => {
      if (!eventId) return;
      const savedData = localStorage.getItem(`reserved_${eventId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.reservationId) {
            // DB에 해당 예약 내역이 여전히 존재하는지 확인 (관리자가 삭제했을 수 있음)
            const docRef = doc(db, "events", eventId, "reservations", parsed.reservationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              setName(parsed.name || "");
              setPhone(parsed.phone || "");
              setEmail(parsed.email || "");
              setTicketCount(parsed.ticketCount || 1);
              setReservationId(parsed.reservationId);
              setReceiptUrl(parsed.receiptUrl || null);
              setDepositConfirmed(data.depositConfirmed || false);
              setReservationToken(parsed.token || data.token || null);
              setStep(2);
            } else {
              // DB에서 삭제된 예약이면 로컬 스토리지 비우기
              localStorage.removeItem(`reserved_${eventId}`);
            }
          }
        } catch (e) {
          console.error("Failed to parse local reservation data", e);
        }
      }
    };

    verifyLocalReservation();
  }, [eventId]);

  // 이벤트에서 입금 정보 가져오기
  const payment = eventData?.payment || {};
  const bankName = payment.bankName || '';
  const accountNum = payment.accountNumber || '';
  const accountHolder = payment.accountHolder || '';
  const ticketPrice = payment.ticketPrice || '';
  const displayAccount = bankName && accountNum ? `${bankName} ${accountNum}` : '';

  useEffect(() => {
    if (eventData) {
      setIsReservationClosed(eventData.isReservationClosed === true);
      setIsFreeEvent(eventData.payment?.isFreeEvent === true);
    }
  }, [eventData]);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!eventId || !reservationId) return;

    const uploaderUid = auth.currentUser?.uid;
    if (!uploaderUid) {
      alert("로그인 상태 확인 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setUploadingReceipt(true);
    try {
      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `receipts/${eventId}/${uploaderUid}/${reservationId}_${Date.now()}.${fileExt}`;
      const imageRef = storageRef(storage, fileName);

      await uploadBytes(imageRef, file);
      const downloadedUrl = await getDownloadURL(imageRef);

      await updateDoc(doc(db, "events", eventId, "reservations", reservationId), {
        receiptUrl: downloadedUrl,
        updatedAt: new Date().toISOString(),
      });

      setReceiptUrl(downloadedUrl);
      alert("입금 캡처 이미지가 성공적으로 업로드되었습니다.");

      const savedData = localStorage.getItem(`reserved_${eventId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        localStorage.setItem(`reserved_${eventId}`, JSON.stringify({ ...parsed, receiptUrl: downloadedUrl }));
      }
    } catch (err) {
      console.error("Receipt upload failed:", err);
      alert("업로드에 실패했습니다. 권한 문제이거나 파일 용량이 너무 큽니다.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!eventId) {
      alert("이벤트 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ticketCount: Number(ticketCount),
      };

      if (reservationId) {
        const savedData = localStorage.getItem(`reserved_${eventId}`);
        const parsed = savedData ? JSON.parse(savedData) : {};

        await updateDoc(doc(db, "events", eventId, "reservations", reservationId), {
          ...payload,
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem(
          `reserved_${eventId}`,
          JSON.stringify({
            ...parsed,
            ...payload,
            reservationId,
            token: reservationToken || parsed.token || null
          })
        );
      } else {
        const createdByUid = auth.currentUser?.uid;
        if (!createdByUid) {
          alert("로그인 상태 확인 중입니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        const token = 'r_' + Math.random().toString(36).substr(2, 9);
        const docRef = await addDoc(collection(db, "events", eventId, "reservations"), {
          ...payload,
          token,
          createdByUid,
          status: "reserved",
          depositConfirmed: false,
          createdAt: new Date().toISOString(),
        });
        setReservationId(docRef.id);
        setReservationToken(token);
        localStorage.setItem(
          `reserved_${eventId}`,
          JSON.stringify({ ...payload, reservationId: docRef.id, token })
        );
      }

      setStep(2);
    } catch (err) {
      console.error("Reservation failed:", err);
      alert("예약 신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIVerify = async () => {
    if (!eventId || !reservationId || !receiptUrl) return;

    setVerifyingAI(true);
    try {
      const verifyReceiptFn = httpsCallable(functions, "verifyDepositReceipt");
      const response = await verifyReceiptFn({
        eventId,
        reservationId,
        reservationToken: reservationToken || undefined,
        originUrl: window.location.origin
      });
      const result = response.data || {};

      if (result.isValid) {
        setDepositConfirmed(true);
        alert(`🎉 [입금 확인 완료]\nAI가 정상적으로 입금을 확인했습니다.\n입력하신 이메일로 모바일 티켓이 발송됩니다.`);
      } else {
        alert(
          `[AI 확인 실패]\nAI가 영수증을 명확히 인식하지 못했습니다.\n사유: ${result.reason || "수동 확인 필요"}\n\n걱정하지 마세요! 빠른 시일 내에 관리자가 수동으로 확인 후 승인해드릴 예정입니다.`
        );
      }

    } catch (err) {
      console.error("AI Verification failed:", err);
      if (err?.code === "unauthenticated") {
        alert("로그인이 필요합니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
      } else if (err?.code === "permission-denied") {
        alert("이 예약을 확인할 권한이 없습니다. 동일한 브라우저에서 다시 시도해주세요.");
      } else {
        alert("AI 검증 중 오류가 발생했습니다. 관리자가 수동으로 확인할 예정이니 조금만 기다려주세요.");
      }
    } finally {
      setVerifyingAI(false);
    }
  };

  const handleCopyAccount = async () => {
    if (!displayAccount) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(displayAccount);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = displayAccount;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      alert("계좌번호가 복사되었습니다.");
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };

  const handleNewReservation = () => {
    if (window.confirm("현재 예약 내역 창을 닫고, 새로운 예매를 진행하시겠습니까? (기존 예약은 정상 처리됩니다)")) {
      localStorage.removeItem(`reserved_${eventId}`);
      setReservationId(null);
      setReservationToken(null);
      setReceiptUrl(null);
      setName("");
      setPhone("");
      setEmail("");
      setTicketCount(1);
      setStep(1);
    }
  };

  return (
    <div className={classes.container}>
      {isReservationClosed ? (
        <div className={classes.closedContainer} style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h2 className={classes.title}>사전 예매가 마감되었습니다</h2>
          <p className={classes.subtitle} style={{ marginTop: "2rem", fontSize: "1.1rem", lineHeight: "1.6" }}>
            온라인 예매가 종료되었습니다.
            <br />
            <strong>현장 예매</strong>를 이용해 주시기 바랍니다.
          </p>
        </div>
      ) : step === 1 ? (
        <>
          <h2 className={classes.title}>공연 예매하기</h2>
          <p className={classes.subtitle}>
            입력하신 이메일로 예약 확인 안내가 전송됩니다.
            <br />한 명씩 개별적으로 작성해 주세요.
          </p>
          <form onSubmit={handleSubmit} className={classes.form}>
            <div className={classes.inputGroup}>
              <label>성함(입금명)</label>
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
                placeholder="예: 01012345678"
                required
              />
            </div>
            <div className={classes.inputGroup}>
              <label>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="예: user@example.com"
                required
              />
            </div>
            <div className={classes.inputGroup}>
              <label>수량(장)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={ticketCount}
                onChange={(e) => setTicketCount(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={classes.submitBtn}
              disabled={isSubmitting}
            >
              {reservationId ? "정보 수정 저장하기" : "예매 신청하기"}
            </button>
          </form>
        </>
      ) : (
        <div className={classes.successStep}>
          <h3 className={classes.successTitle}>
            {isFreeEvent || depositConfirmed ? "🎉 예매가 확정되었습니다!" : receiptUrl ? "업로드가 완료되었습니다. 입금을 확인해주세요!" : "💳 입금을 진행해주세요!"}
          </h3>
          <div className={classes.infoBox}>
            <div className={classes.infoHeader}>
              <h4 className={classes.infoTitle}>내 정보</h4>
              <button
                type="button"
                className={classes.editBtn}
                onClick={() => setStep(1)}
              >
                내 정보 확인/수정
              </button>
            </div>
            <div className={classes.infoList}>
              <div className={classes.infoRow}>
                <span className={classes.infoLabel}>이름</span>
                <span className={classes.infoValue}>{name || "-"}</span>
              </div>
              <div className={classes.infoRow}>
                <span className={classes.infoLabel}>연락처</span>
                <span className={classes.infoValue}>{phone || "-"}</span>
              </div>
              <div className={classes.infoRow}>
                <span className={classes.infoLabel}>이메일</span>
                <span className={classes.infoValue}>{email || "-"}</span>
              </div>
              <div className={classes.infoRow}>
                <span className={classes.infoLabel}>예매 수량</span>
                <span className={classes.infoValue}>{ticketCount}장</span>
              </div>
            </div>
          </div>

          {!isFreeEvent && displayAccount && (
            <div className={classes.accountBox}>
              {ticketPrice && (
                <p className={classes.amount}>
                  입금 금액: <strong>{(Number(ticketPrice) * ticketCount).toLocaleString()}원</strong>
                </p>
              )}
              <button
                type="button"
                className={classes.bankNameButton}
                onClick={handleCopyAccount}
              >
                {displayAccount}
              </button>
              {accountHolder && (
                <p className={classes.accountName}>예금주 {accountHolder} (터치하여 복사)</p>
              )}
              <p className={classes.warningText}>
                반드시 예약하신 <strong>"{name}"</strong> 이름으로 입금해 주세요.
              </p>

              <div style={{ marginTop: '1.5rem', padding: '1.2rem 1rem', backgroundColor: depositConfirmed ? '#f0fdf4' : '#fff', borderRadius: '8px', border: depositConfirmed ? '1px solid #bbf7d0' : '1px solid #ddd' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', color: '#1a1a1a', textAlign: 'center' }}>
                  {depositConfirmed ? "🎉 입금 확인 완료" : "🧾 입금 캡처본 업로드 및 인증"}
                </h4>
                {receiptUrl ? (
                  <div style={{ textAlign: 'center' }}>
                    {depositConfirmed ? (
                      <p style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.8rem' }}>결제가 정상적으로 확인되었습니다. 이메일을 확인해주세요!</p>
                    ) : (
                      <p style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.8rem' }}>✅ 업로드 완료! AI로 즉시 확인해보세요.</p>
                    )}
                    <img src={receiptUrl} alt="입금 내역" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #eee', objectFit: 'contain', marginBottom: '1rem' }} />

                    {!depositConfirmed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={handleAIVerify}
                          disabled={verifyingAI}
                          style={{
                            width: '100%', maxWidth: '300px', padding: '0.8rem',
                            backgroundColor: verifyingAI ? '#ccc' : '#f6c458',
                            color: '#333', border: 'none', borderRadius: '6px',
                            fontWeight: 'bold', cursor: verifyingAI ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem', alignSelf: 'center'
                          }}
                        >
                          {verifyingAI ? "분석 중..." : "🤖 입금 확인 후 예약 확정하기!"}
                        </button>
                        <label style={{
                          display: 'inline-block', padding: '0.5rem 0.8rem', backgroundColor: 'transparent', color: '#888', textAlign: 'center', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline'
                        }}>
                          {uploadingReceipt ? "업로드 중..." : "다른 이미지로 다시 올리기"}
                          <input type="file" accept="image/*" onChange={handleReceiptUpload} disabled={uploadingReceipt || verifyingAI} style={{ display: 'none' }} />
                        </label>
                        <AIProgressTimer
                          active={verifyingAI}
                          title="AI 영수증 분석 중"
                          icon="🧾"
                          estimatedSeconds={20}
                          steps={[
                            { label: '영수증 이미지를 서버로 전송 중...' },
                            { label: 'AI가 입금 내역을 분석 중...' },
                            { label: '금액과 입금자명을 대조 중...' },
                            { label: '결과를 확인하고 있습니다...' },
                          ]}
                          tips={[
                            '영수증이 선명할수록 인식 정확도가 올라갑니다.',
                            '입금 내역이 명확히 보이는 캡처가 좋아요.',
                            'AI가 확인하지 못해도 관리자가 직접 확인합니다.',
                          ]}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                      원활한 예매 확정을 위해, 아래 버튼을 눌러 이체 완료 화면을 캡처하여 업로드해주세요.
                    </p>
                    <label style={{
                      display: 'inline-block', padding: '0.6rem 1rem', backgroundColor: '#333', color: '#fff', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 'bold', fontSize: '0.9rem'
                    }}>
                      {uploadingReceipt ? "업로드 중..." : "이미지 선택 및 업로드"}
                      <input type="file" accept="image/*" onChange={handleReceiptUpload} disabled={uploadingReceipt} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className={classes.guideText}>
            {!isFreeEvent && !depositConfirmed ? (
              <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>AI 입금 확인을 거치거나, 관리자 승인이 완료되어야 메일이 발송됩니다.</span>
            ) : (
              "입력하신 이메일로 예약 확인 안내가 발송되었습니다."
            )}
          </p>
          <p className={classes.guideText}>
            공연 당일 이름과 연락처를 확인 후 입장됩니다.
          </p>

          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.8rem' }}>일행의 티켓을 추가로 예매하고 싶으신가요?</p>
            <button
              onClick={handleNewReservation}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: 'transparent',
                color: 'var(--primary-color, #d04c31)',
                border: '1px solid var(--primary-color, #d04c31)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              + 새 티켓 추가 예매하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservation;

