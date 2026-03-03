/**
 * GET /api/auth/qbo — QuickBooks Online OAuth callback
 * Exchanges authorization code for tokens, stores in settings, redirects to Settings page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const errorParam = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.genesishvacr.com";
  const settingsUrl = `${appUrl}/dashboard/admin/settings`;

  if (errorParam) {
    console.error("[QBO OAuth] Error:", errorParam);
    return NextResponse.redirect(`${settingsUrl}?qbo=error`);
  }

  if (!code || !realmId) {
    return NextResponse.redirect(`${settingsUrl}?qbo=missing_params`);
  }

  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[QBO OAuth] Missing QBO_CLIENT_ID or QBO_CLIENT_SECRET");
    return NextResponse.redirect(`${settingsUrl}?qbo=config_error`);
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const redirectUri = `${appUrl}/api/auth/qbo`;

    const tokenRes = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[QBO OAuth] Token exchange failed:", tokenRes.status, text);
      return NextResponse.redirect(`${settingsUrl}?qbo=token_error`);
    }

    const data = await tokenRes.json();

    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      realm_id: realmId,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    // Store tokens in settings table
    const supabase = createServiceClient();
    await supabase
      .from("settings")
      .upsert(
        { key: "qbo_tokens", value: JSON.stringify(tokens) },
        { onConflict: "key" }
      );

    console.log("[QBO OAuth] Connected successfully, realmId:", realmId);
    return NextResponse.redirect(`${settingsUrl}?qbo=connected`);
  } catch (err) {
    console.error("[QBO OAuth] Error:", err);
    return NextResponse.redirect(`${settingsUrl}?qbo=error`);
  }
}
