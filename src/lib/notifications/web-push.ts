import webpush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@academicai.local";

let isVapidConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isVapidConfigured = true;
  } catch (err) {
    console.warn("Failed to set VAPID details:", err);
  }
}

export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    data?: any;
  }
): Promise<boolean> {
  if (!isVapidConfigured || !subscription?.endpoint) {
    return false;
  }

  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-192.png",
        url: payload.url || "/attendance",
        data: payload.data || {},
      })
    );
    return true;
  } catch (error: any) {
    console.error("Web push send error:", error?.statusCode, error?.body || error);
    return false;
  }
}
