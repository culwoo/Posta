/**
 * Atempo Cloud Functions
 *
 * 1. sendTicketSMS: Sends ticket email when reservation status changes to paid
 * 2. verifyDepositReceipt: Verifies transfer receipt image with Gemini and confirms deposit
 * 3. extractPosterColors: Extracts theme colors from poster image with Gemini
 */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { defineSecret, defineString } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Firebase Admin init
initializeApp();
const db = getFirestore();

// Email/Gemini config (Secrets)
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const EMAIL_FROM_NAME = defineSecret("EMAIL_FROM_NAME");
const PUBLIC_BASE_URL = defineSecret("PUBLIC_BASE_URL");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const LEMON_SQUEEZY_WEBHOOK_SECRET = defineSecret("LEMON_SQUEEZY_WEBHOOK_SECRET");
const LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET = defineSecret("LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET");
const LEMON_SQUEEZY_STORE_URL = defineString("LEMON_SQUEEZY_STORE_URL");
const LEMON_SQUEEZY_VARIANT_ID = defineString("LEMON_SQUEEZY_VARIANT_ID");

const ADMIN_EMAILS = [
    "4242fire@gmail.com",
    "sseeooyyuunn@naver.com",
    "mides3912@gmail.com"
];

const isAdminEmail = (email) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(String(email).toLowerCase());
};

const normalizeEmailAddress = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const bracketMatch = raw.match(/<([^>]+)>/);
    const candidate = bracketMatch ? bracketMatch[1] : raw;
    return candidate.replace(/^mailto:/i, "").trim().toLowerCase();
};

const resolveTicketBaseUrl = (originUrl, publicBaseUrl) => {
    const origin = String(originUrl || "").trim();
    const fallback = String(publicBaseUrl || "").trim();

    const isLocalhost = (urlString) => {
        try {
            const parsed = new URL(urlString);
            return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        } catch (err) {
            return false;
        }
    };

    if (origin && !isLocalhost(origin)) return origin;
    if (fallback) return fallback;
    return "https://melodicapp.web.app";
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
    const user = normalizeEmailAddress(GMAIL_USER.value());
    const pass = (GMAIL_APP_PASSWORD.value() || "").trim().replace(/\s+/g, "");
    if (!user || !pass) {
        throw new Error("Missing Gmail secrets. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
    }
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass }
    });
};

const getEventDoc = async (eventId) => {
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
        throw new HttpsError("not-found", "Event not found.");
    }
    return eventDoc;
};

const isEventStaff = async (eventId, uid) => {
    if (!uid) return false;
    const performerSnap = await db
        .collection("events")
        .doc(eventId)
        .collection("performers")
        .doc(uid)
        .get();
    return performerSnap.exists;
};

const isEventManager = async (request, eventId, eventData = null) => {
    if (!request.auth?.uid) return false;

    const uid = request.auth.uid;
    const email = request.auth.token?.email || "";
    if (isAdminEmail(email)) return true;

    const data = eventData || (await getEventDoc(eventId)).data() || {};
    if (data.ownerId === uid) return true;

    return isEventStaff(eventId, uid);
};

const extractJsonObject = (text) => {
    const raw = String(text || "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Could not parse JSON from Gemini response.");
    }
    return JSON.parse(jsonMatch[0]);
};

const callGeminiWithFallback = async ({ base64, prompt, models }) => {
    const apiKey = (GEMINI_API_KEY.value() || "").trim();
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY secret.");
    }

    let lastError = "";

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { inlineData: { mimeType: "image/jpeg", data: base64 } },
                                { text: prompt }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                lastError = `${model}: ${response.status} ${errorText}`;
                console.warn(`[Gemini] ${lastError}`);
                continue;
            }

            const data = await response.json();
            if (data?.candidates?.length) {
                return data;
            }

            lastError = `${model}: empty candidates`;
            console.warn(`[Gemini] ${lastError}`);
        } catch (err) {
            lastError = `${model}: ${err.message || String(err)}`;
            console.warn(`[Gemini] ${lastError}`);
        }
    }

    throw new Error(`All Gemini models failed. ${lastError}`.trim());
};

const normalizeHex = (value, fallback) => {
    const raw = String(value || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : fallback;
};

const normalizeHost = (value) =>
    String(value || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "");

const getLemonCheckoutConfig = () => {
    const storeUrl = normalizeHost(LEMON_SQUEEZY_STORE_URL.value());
    const variantId = String(LEMON_SQUEEZY_VARIANT_ID.value() || "").trim();

    if (!storeUrl || !variantId) {
        throw new HttpsError("failed-precondition", "Lemon Squeezy checkout is not configured.");
    }

    return { storeUrl, variantId };
};

const getCheckoutSigningSecret = () => {
    const secret = String(LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET.value() || "").trim();
    if (!secret) {
        throw new Error("Missing LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET secret.");
    }
    return secret;
};

const createCheckoutSignature = ({ eventId, userId, variantId }) =>
    crypto
        .createHmac("sha256", getCheckoutSigningSecret())
        .update(`checkout:${eventId}:${userId}:${variantId}`)
        .digest("hex");

const parseHexBuffer = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
        return null;
    }
    return Buffer.from(normalized, "hex");
};

const safeHexEqual = (expectedValue, actualValue) => {
    const expected = parseHexBuffer(expectedValue);
    const actual = parseHexBuffer(actualValue);

    if (!expected || !actual || expected.length !== actual.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, actual);
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
            const ticketCount = afterData.ticketCount || 1;
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
            const baseUrl = resolveTicketBaseUrl(afterData.originUrl, PUBLIC_BASE_URL.value());
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
                        <p style="margin: 8px 0;"><strong>장소:</strong> ${eventLocation || "정보 없음"}</p>
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
                const fromUser = normalizeEmailAddress(GMAIL_USER.value());
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
                    emailError:
                        error?.code === "EAUTH"
                            ? "Gmail 인증 실패(EAUTH): GMAIL_USER/GMAIL_APP_PASSWORD를 확인하세요."
                            : (error.message || JSON.stringify(error))
                });
            }
        }

        return null;
    }
);

exports.verifyDepositReceipt = onCall(
    {
        region: "asia-northeast3",
        invoker: "public",
        secrets: [GEMINI_API_KEY]
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Login required.");
        }

        const eventId = String(request.data?.eventId || "").trim();
        const reservationId = String(request.data?.reservationId || "").trim();
        const reservationToken = String(request.data?.reservationToken || "").trim();
        const originUrl = String(request.data?.originUrl || "").trim();

        if (!eventId || !reservationId) {
            throw new HttpsError("invalid-argument", "eventId and reservationId are required.");
        }

        const eventDoc = await getEventDoc(eventId);
        const eventData = eventDoc.data() || {};

        const reservationRef = db
            .collection("events")
            .doc(eventId)
            .collection("reservations")
            .doc(reservationId);
        const reservationSnap = await reservationRef.get();
        if (!reservationSnap.exists) {
            throw new HttpsError("not-found", "Reservation not found.");
        }
        const reservation = reservationSnap.data() || {};

        const manager = await isEventManager(request, eventId, eventData);
        const ownReservation =
            Boolean(reservation.createdByUid) && reservation.createdByUid === request.auth.uid;
        const tokenMatched =
            !manager &&
            Boolean(reservationToken) &&
            Boolean(reservation.token) &&
            reservation.token === reservationToken;

        if (!manager && !ownReservation && !tokenMatched) {
            throw new HttpsError("permission-denied", "You can verify only your own reservation.");
        }

        if (reservation.depositConfirmed === true) {
            return {
                success: true,
                isValid: true,
                alreadyConfirmed: true,
                detectedName: reservation.name || null,
                detectedAmount:
                    Number(reservation.ticketCount || 1) *
                    Number(eventData?.payment?.ticketPrice || 0),
                reason: "이미 입금 확인된 예약입니다."
            };
        }

        const receiptUrl = String(reservation.receiptUrl || "").trim();
        if (!receiptUrl) {
            throw new HttpsError("failed-precondition", "Receipt image is required.");
        }

        const expectedAmount =
            Number(eventData?.payment?.ticketPrice || 0) * Number(reservation.ticketCount || 1);
        if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
            throw new HttpsError("failed-precondition", "Invalid expected amount.");
        }

        const expectedName = String(reservation.name || "").trim();
        if (!expectedName) {
            throw new HttpsError("failed-precondition", "Reservation name is missing.");
        }

        await reservationRef.update({
            aiAttemptedAt: new Date().toISOString()
        });

        const imageResponse = await fetch(receiptUrl);
        if (!imageResponse.ok) {
            throw new HttpsError("invalid-argument", "Failed to fetch receipt image.");
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const base64 = imageBuffer.toString("base64");

        const prompt = `
Analyze this bank deposit receipt/transfer screenshot.
Target Sender/Depositor Name: ${expectedName}
Target Amount: ${expectedAmount} won

Look for sender name (보낸사람, 예금주, 입금자, 받는사람 등) and transferred amount (보낸금액, 이체금액, 거래금액, 출금액 등).
Sender name can be partially masked (e.g., 김*수). If pattern matches target name, treat as valid.
Transfer amount must exactly match target amount.

Return ONLY valid JSON:
{
  "isValid": true or false,
  "detectedName": "sender name or null",
  "detectedAmount": "number or null",
  "reason": "very brief explanation in Korean"
}
        `.trim();

        const geminiData = await callGeminiWithFallback({
            base64,
            prompt,
            models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]
        });

        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject(text);
        const result = {
            isValid: Boolean(parsed.isValid),
            detectedName: parsed.detectedName || null,
            detectedAmount:
                parsed.detectedAmount === null || parsed.detectedAmount === undefined
                    ? null
                    : Number(parsed.detectedAmount),
            reason: String(parsed.reason || "")
        };

        if (result.isValid) {
            await reservationRef.update({
                status: "paid",
                depositConfirmed: true,
                depositConfirmedAt: new Date().toISOString(),
                aiVerified: true,
                aiLog: result,
                originUrl: originUrl || null
            });
        } else {
            await reservationRef.update({
                aiVerified: false,
                aiLog: result
            });
        }

        return {
            success: true,
            ...result
        };
    }
);

exports.extractPosterColors = onCall(
    {
        region: "asia-northeast3",
        invoker: "public",
        secrets: [GEMINI_API_KEY]
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Login required.");
        }

        const eventId = String(request.data?.eventId || "").trim();
        const imageBase64 = String(request.data?.imageBase64 || "").trim();

        if (!eventId || !imageBase64) {
            throw new HttpsError("invalid-argument", "eventId and imageBase64 are required.");
        }

        if (imageBase64.length > 8_000_000) {
            throw new HttpsError("invalid-argument", "Image is too large.");
        }

        const eventDoc = await getEventDoc(eventId);
        const manager = await isEventManager(request, eventId, eventDoc.data() || {});
        if (!manager) {
            throw new HttpsError("permission-denied", "Event managers only.");
        }

        const prompt = `
Analyze this poster image and extract a cohesive 5-color web theme palette.
Return ONLY a JSON object:
{
  "primary": "#RRGGBB",
  "secondary": "#RRGGBB",
  "bgPrimary": "#RRGGBB",
  "bgSecondary": "#RRGGBB",
  "textPrimary": "#RRGGBB"
}

Constraints:
1. primary: vibrant but comfortable for UI.
2. bgPrimary: suitable for app background.
3. textPrimary: high contrast with bgPrimary.
4. secondary: supporting accent.
5. Hex only.
        `.trim();

        const geminiData = await callGeminiWithFallback({
            base64: imageBase64,
            prompt,
            models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]
        });

        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject(text);

        const colors = {
            primary: normalizeHex(parsed.primary, "#d04c31"),
            secondary: normalizeHex(parsed.secondary, "#f6c458"),
            bgPrimary: normalizeHex(parsed.bgPrimary, "#131011"),
            bgSecondary: normalizeHex(parsed.bgSecondary, "#3e3a39"),
            textPrimary: normalizeHex(parsed.textPrimary, "#efefef")
        };

        return {
            success: true,
            colors
        };
    }
);

exports.createLemonSqueezyCheckout = onCall(
    {
        region: "asia-northeast3",
        secrets: [LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET]
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Login required.");
        }

        const eventId = String(request.data?.eventId || "").trim();
        if (!eventId) {
            throw new HttpsError("invalid-argument", "eventId is required.");
        }

        const eventDoc = await getEventDoc(eventId);
        const eventData = eventDoc.data() || {};
        const manager = await isEventManager(request, eventId, eventData);

        if (!manager) {
            throw new HttpsError("permission-denied", "Event managers only.");
        }

        const { storeUrl, variantId } = getLemonCheckoutConfig();
        const userId = request.auth.uid;
        const signature = createCheckoutSignature({ eventId, userId, variantId });
        const checkoutUrl = new URL(`https://${storeUrl}/checkout/buy/${variantId}`);

        checkoutUrl.searchParams.set("checkout[custom][eventId]", eventId);
        checkoutUrl.searchParams.set("checkout[custom][userId]", userId);
        checkoutUrl.searchParams.set("checkout[custom][variantId]", variantId);
        checkoutUrl.searchParams.set("checkout[custom][signature]", signature);

        return {
            url: checkoutUrl.toString()
        };
    }
);

exports.deletePerformer = onCall({ region: "asia-northeast3", invoker: "public" }, async (request) => {
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

exports.adminResetPassword = onCall({ region: "asia-northeast3", invoker: "public" }, async (request) => {
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

exports.verifyTicket = onCall({ region: "asia-northeast3", invoker: "public" }, async (request) => {
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

exports.lemonSqueezyWebhook = onRequest(
    {
        region: "asia-northeast3",
        secrets: [LEMON_SQUEEZY_WEBHOOK_SECRET, LEMON_SQUEEZY_CHECKOUT_SIGNING_SECRET]
    },
    async (req, res) => {
        try {
            const webhookSecret = String(LEMON_SQUEEZY_WEBHOOK_SECRET.value() || "").trim();
            if (!webhookSecret || !req.rawBody) {
                console.error("[LemonSqueezy] Missing webhook secret or raw body");
                return res.status(500).send("Webhook not configured");
            }

            const digest = crypto.createHmac("sha256", webhookSecret).update(req.rawBody).digest("hex");
            const signature = req.get("X-Signature") || "";

            if (!safeHexEqual(digest, signature)) {
                console.error("[LemonSqueezy] Invalid signature");
                return res.status(401).send("Invalid signature");
            }

            const body = req.body || {};
            const eventName = body?.meta?.event_name;
            const customData = body?.meta?.custom_data || {};

            if (eventName === "order_created") {
                const eventId = String(customData.eventId || "").trim();
                const userId = String(customData.userId || "").trim();
                const variantId = String(customData.variantId || "").trim();
                const checkoutSignature = String(customData.signature || "").trim();
                const expectedVariantId = getLemonCheckoutConfig().variantId;

                if (!eventId || !userId || !variantId || !checkoutSignature) {
                    console.error("[LemonSqueezy] Missing custom_data fields");
                    return res.status(400).send("Missing custom data");
                }

                if (variantId !== expectedVariantId) {
                    console.error("[LemonSqueezy] Unexpected variantId", variantId);
                    return res.status(400).send("Unexpected variant");
                }

                const expectedSignature = createCheckoutSignature({ eventId, userId, variantId });
                if (!safeHexEqual(expectedSignature, checkoutSignature)) {
                    console.error("[LemonSqueezy] Invalid checkout signature");
                    return res.status(401).send("Invalid checkout signature");
                }

                const eventRef = db.collection("events").doc(eventId);
                const eventSnapshot = await eventRef.get();
                if (!eventSnapshot.exists) {
                    console.error("[LemonSqueezy] Event not found", eventId);
                    return res.status(404).send("Event not found");
                }

                console.log(`[LemonSqueezy] Received order_created for eventId: ${eventId}, userId: ${userId}`);

                await eventRef.set({
                    billing: {
                        tier: "plus",
                        price: 9900,
                        purchasedAt: new Date().toISOString(),
                        purchasedBy: userId,
                        provider: "lemonsqueezy",
                        variantId
                    }
                }, { merge: true });
                console.log(`[LemonSqueezy] Successfully upgraded event ${eventId} to PLUS`);
            }

            res.status(200).send("OK");
        } catch (error) {
            console.error("[LemonSqueezy] Webhook Error:", error);
            res.status(500).send("Internal Server Error");
        }
    }
);
