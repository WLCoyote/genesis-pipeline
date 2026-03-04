"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export default function PushOptIn() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    } catch {
      setState("unsupported");
    }
  }

  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const keys = sub.toJSON().keys || {};
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      setState("subscribed");
    } catch (err) {
      console.error("[PushOptIn] Subscribe failed:", err);
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("[PushOptIn] Unsubscribe failed:", err);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <div className="text-xs text-ds-gray">
        Push notifications are not supported on this device. On iOS, add this app to your Home Screen first.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="text-xs text-ds-gray">
        Push notifications are blocked. Please enable them in your browser settings.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-ds-text dark:text-gray-100">
          Push Notifications
        </div>
        <div className="text-xs text-ds-gray">
          {state === "subscribed"
            ? "You'll receive alerts for new leads, signed proposals, and commissions."
            : "Get notified about new leads, signed proposals, and commissions."}
        </div>
      </div>
      <button
        onClick={state === "subscribed" ? unsubscribe : subscribe}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          state === "subscribed" ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            state === "subscribed" ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
