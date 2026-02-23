/**
 * Atempo Cloud Functions
 *
 * 1. sendTicketSMS: Sends ticket email when reservation status changes to paid
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

// Firebase Admin init
initializeApp();
const db = getFirestore();

// Email config (Secrets)
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const EMAIL_FROM_NAME = defineSecret("EMAIL_FROM_NAME");
const PUBLIC_BASE_URL = defineSecret("PUBLIC_BASE_URL");

const ADMIN_EMAILS = [
    "4242fire@gmail.com",
    "sseeooyyuunn@naver.com",
    "mides3912@gmail.com"
];

const isAdminEmail = (email) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

const requireAdmin = (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required.");
    }
    const email = request.auth.token?.email || "";
    if (!isAdminEmail(email)) {
        throw new HttpsError("permission-denied", "Admin only.");
    }
};

const getMailTransport = () => {
    const user = (GMAIL_USER.value() || "").trim();
    const pass = (GMAIL_APP_PASSWORD.value() || "").trim().replace(/\s+/g, "");
    if (!user || !pass) {
        throw new Error("Missing Gmail secrets. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
    }
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass }
    });
};

/**
 * Reservation status change -> send email
 * Firestore Trigger: events/{eventId}/reservations/{docId} document update
 */
exports.sendTicketSMS = onDocumentUpdated(
    {
        document: "events/{eventId}/reservations/{docId}",
        region: "asia-northeast3",
        secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_FROM_NAME, PUBLIC_BASE_URL]
    },
    async (event) => {
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();
        const eventId = event.params.eventId;

        // Changed status to paid or depositConfirmed changed
        const wasPaid = beforeData.status === "paid" || beforeData.depositConfirmed === true;
        const isPaid = afterData.status === "paid" || afterData.depositConfirmed === true;

        if (!wasPaid && isPaid) {
            const { name, email, token } = afterData;
            const emailAttemptedAt = new Date().toISOString();

            if (!email || !token) {
                console.error("[Email fail] Missing email or token");
                await event.data.after.ref.update({
                    emailStatus: "error",
                    emailAttemptedAt,
                    emailError: "Missing email or token"
                });
                return null;
            }

            let eventTitle = "POSTA";
            let eventDate = "";
            let eventTime = "";
            let eventLocation = "";
            let ticketCount = afterData.ticketCount || 1;
            try {
                const eventDoc = await db.collection("events").doc(eventId).get();
                if (eventDoc.exists) {
                    const data = eventDoc.data();
                    eventTitle = data.title || eventTitle;
                    eventDate = data.date || "";
                    eventTime = data.time || "";
                    eventLocation = data.location || "";
                }
            } catch (err) {
                console.error("Failed to fetch event title", err);
            }

            await event.data.after.ref.update({
                emailStatus: "sending",
                emailAttemptedAt,
                emailError: null,
                emailResult: null
            });

            // Ticket link
            const baseUrl = afterData.originUrl || PUBLIC_BASE_URL.value() || "https://melodicapp.web.app";
            const ticketUrl = `${baseUrl.replace(/\/+$/, "")}/e/${eventId}?auth=${token}`;

            const subject = `[${eventTitle}] 예매가 확정되었습니다! 모바일 티켓을 확인하세요.`;
            const text = `[${eventTitle}] ${name}님 예약이 완료되었습니다.\n\n아래 링크를 클릭하여 모바일 티켓을 확인하세요.\n${ticketUrl}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #d04c31; margin-top: 0;">예매가 확정되었습니다! 🎉</h2>
                    <p>안녕하세요, <strong>${name}</strong>님.</p>
                    <p>결제가 성공적으로 확인되어 예매가 확정되었습니다.<br/>아래 버튼을 클릭하여 모바일 티켓(QR)을 확인해주세요.</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${ticketUrl}" style="background-color: #d04c31; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">모바일 티켓 열기</a>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee;">
                        <h3 style="margin-top: 0; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 15px;">🎟 공연/행사 정보</h3>
                        <p style="margin: 8px 0;"><strong>공연명:</strong> ${eventTitle}</p>
                        <p style="margin: 8px 0;"><strong>일시:</strong> ${eventDate} ${eventTime}</p>
                        <p style="margin: 8px 0;"><strong>장소:</strong> ${eventLocation || '정보 없음'}</p>
                        <p style="margin: 8px 0;"><strong>예매 매수:</strong> ${ticketCount}장</p>
                    </div>
                    
                    <p style="margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; line-height: 1.6;">
                        * 입장 시 모바일 티켓(QR)을 제시해 주시기 바랍니다.<br/>
                        * 본 메일은 발신 전용 메일입니다.
                    </p>
                </div>
            `.trim();

            try {
                const fromName = (EMAIL_FROM_NAME.value() || "POSTA Ticketing").trim();
                const fromUser = (GMAIL_USER.value() || "").trim();
                const transporter = getMailTransport();

                console.log(`[Email send] ${name} (${email}) - URL: ${ticketUrl}`);
                const result = await transporter.sendMail({
                    from: `${fromName} <${fromUser}>`,
                    to: email.trim(),
                    subject,
                    text,
                    html
                });
                console.log(`[Email result] ${name} (${email})`, JSON.stringify(result));

                await event.data.after.ref.update({
                    emailStatus: "success",
                    emailSentAt: new Date().toISOString(),
                    emailResult: JSON.stringify(result)
                });
            } catch (error) {
                console.error(`[Email error] ${name} (${email})`, error);

                await event.data.after.ref.update({
                    emailStatus: "error",
                    emailError: error.message || JSON.stringify(error)
                });
            }
        }

        return null;
    }
);

exports.deletePerformer = onCall({ region: "asia-northeast3" }, async (request) => {
    requireAdmin(request);

    const uid = (request.data?.uid || "").trim();
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    await getAuth().deleteUser(uid);
    // Since we don't know which event, we can't delete from events/{eventId}/performers easily.
    // Client should delete from firestore manually.

    return { success: true };
});

exports.adminResetPassword = onCall({ region: "asia-northeast3" }, async (request) => {
    requireAdmin(request);

    const uid = (request.data?.uid || "").trim();
    const newPassword = (request.data?.newPassword || "").trim();

    if (!uid || !newPassword) {
        throw new HttpsError("invalid-argument", "uid and newPassword are required.");
    }
    if (newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }

    try {
        await getAuth().updateUser(uid, {
            password: newPassword
        });
        return { success: true };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

exports.verifyTicket = onCall({ region: "asia-northeast3" }, async (request) => {
    const rawToken = request.data?.token || "";
    const token = String(rawToken).trim();
    const eventId = String(request.data?.eventId || "").trim();

    if (!token || !eventId) {
        throw new HttpsError("invalid-argument", "token and eventId are required.");
    }

    const snapshot = await db
        .collection("events")
        .doc(eventId)
        .collection("reservations")
        .where("token", "==", token)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { success: false };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.status !== "paid" && !data.depositConfirmed) {
        return { success: false };
    }

    return {
        success: true,
        reservationId: doc.id,
        name: data.name || "",
        checkedIn: Boolean(data.checkedIn),
        checkedInAt: data.checkedInAt || null
    };
});
