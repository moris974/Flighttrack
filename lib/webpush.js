// lib/webpush.js
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:info@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Invia una notifica push a una sottoscrizione. Se il dispositivo non è
 * più valido (410/404), ritorna { expired: true } così il chiamante può
 * ripulire la sottoscrizione dal database.
 */
export async function sendPush(subscription, payload) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth_key,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { ok: false, expired: true };
    }
    return { ok: false, error: err.message };
  }
}
