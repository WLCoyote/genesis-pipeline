/**
 * POST /api/command/events
 * Command Layer event receiver — accepts webhook events from the Genesis ecosystem.
 * Stub: logs event and returns 200. Future: forward to Mac Mini agent, Telegram alerts.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!apiKey || apiKey !== process.env.GENESIS_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = (body.meta as Record<string, unknown>)?.event || "unknown";

  console.log(`[CommandLayer] Event received: ${event}`, JSON.stringify(body, null, 2));

  return NextResponse.json({
    ok: true,
    event,
    received_at: new Date().toISOString(),
  });
}
