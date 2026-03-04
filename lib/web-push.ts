/**
 * Web push notification sender.
 * Queries push_subscriptions for a user, sends via web-push library.
 * Auto-cleans stale 410 subscriptions. Fire-and-forget.
 */

import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

// Configure VAPID keys (server-side only)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@genesishvacr.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to all subscribed devices for a user.
 * Checks push_enabled preference before sending.
 * Fire-and-forget — catches all errors internally.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[WebPush] VAPID keys not configured, skipping");
    return;
  }

  try {
    const supabase = createServiceClient();

    // Check if user has push enabled
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", userId)
      .single();

    // Default to true if no preference row exists
    if (pref && pref.push_enabled === false) {
      return;
    }

    // Get all subscriptions for this user
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return;

    const jsonPayload = JSON.stringify(payload);

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload
        )
      )
    );

    // Clean up stale subscriptions (410 Gone or 404)
    const staleIds: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          staleIds.push(subs[i].id);
        } else {
          console.error(
            `[WebPush] Failed to send to ${subs[i].endpoint}:`,
            result.reason
          );
        }
      }
    });

    if (staleIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
      console.log(`[WebPush] Cleaned ${staleIds.length} stale subscription(s)`);
    }
  } catch (err) {
    console.error("[WebPush] Error sending push notification:", err);
  }
}
