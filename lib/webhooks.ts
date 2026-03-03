/**
 * Webhook event dispatcher for the Genesis Ecosystem.
 * Fire-and-forget: sends events to WEBHOOK_RECEIVER_URL.
 * Uses GENESIS_INTERNAL_API_KEY for auth.
 */

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Fire a webhook event (fire-and-forget — does not block caller).
 */
export function fireWebhookEvent(payload: WebhookPayload): void {
  const receiverUrl = process.env.WEBHOOK_RECEIVER_URL;
  if (!receiverUrl) return; // No receiver configured — silently skip

  const apiKey = process.env.GENESIS_INTERNAL_API_KEY;
  if (!apiKey) return;

  const body = {
    data: payload.data,
    error: null,
    meta: {
      app: "pipeline",
      version: "1.0",
      event: payload.event,
      timestamp: new Date().toISOString(),
    },
  };

  // Fire and forget — intentionally not awaited
  fetch(receiverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error(`[Webhook] Failed to fire ${payload.event}:`, err);
  });
}
