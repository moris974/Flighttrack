// lib/webpush.js
import webpush from "web-push";

let configured = false;

// Configura le chiavi VAPID solo al primo utilizzo reale (non all'avvio/build),
// così l'app funziona anche prima che le chiavi push siano state impostate.
function ensureConfigured() {
  if (configured) return;

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error(
      "Notifiche push non configurate: impostare VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY"
    );
  }

  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:info@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
}

/**
 * Invia una notifica push a una sottoscrizione. Se il dispositivo non è
 * più valido (410/404), ritorna { expired: true } così il chiamante può
 * ripulire la sottoscrizione dal database.
 */
export async function sendPush(subscription, payload) {
  ensureConfigured();

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
