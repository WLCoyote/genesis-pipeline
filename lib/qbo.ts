/**
 * QuickBooks Online API integration.
 * Handles OAuth token management, authenticated requests, and invoice lookups.
 * Server-only — uses service role client for settings storage.
 */

import { createServiceClient } from "@/lib/supabase/server";

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3";

interface QboTokens {
  access_token: string;
  refresh_token: string;
  realm_id: string;
  expires_at: number; // Unix timestamp
}

interface QboInvoice {
  Id: string;
  DocNumber: string;
  TotalAmt: number;
  Balance: number;
  TxnDate: string;
  TxnTaxDetail?: {
    TotalTax: number;
  };
  Line: Array<{
    Amount: number;
    DetailType: string;
  }>;
}

/**
 * Read QBO tokens from settings table.
 */
export async function getQboTokens(): Promise<QboTokens | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "qbo_tokens")
      .single();

    if (!data?.value) return null;

    const tokens = typeof data.value === "string"
      ? JSON.parse(data.value)
      : data.value;

    return tokens as QboTokens;
  } catch {
    return null;
  }
}

/**
 * Save QBO tokens to settings table.
 */
async function saveQboTokens(tokens: QboTokens): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("settings")
    .upsert(
      { key: "qbo_tokens", value: JSON.stringify(tokens) },
      { onConflict: "key" }
    );
}

/**
 * Refresh the QBO access token using the refresh token.
 */
export async function refreshQboToken(): Promise<QboTokens | null> {
  const tokens = await getQboTokens();
  if (!tokens?.refresh_token) return null;

  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[QBO] Missing QBO_CLIENT_ID or QBO_CLIENT_SECRET");
    return null;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!res.ok) {
      console.error("[QBO] Token refresh failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const updated: QboTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      realm_id: tokens.realm_id,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    await saveQboTokens(updated);
    return updated;
  } catch (err) {
    console.error("[QBO] Token refresh error:", err);
    return null;
  }
}

/**
 * Authenticated fetch wrapper for QBO API. Auto-refreshes expired tokens.
 */
export async function qboFetch(path: string): Promise<Response | null> {
  let tokens = await getQboTokens();
  if (!tokens) return null;

  // Refresh if expired (with 60s buffer)
  if (Date.now() > tokens.expires_at - 60000) {
    tokens = await refreshQboToken();
    if (!tokens) return null;
  }

  const url = `${QBO_API_BASE}/company/${tokens.realm_id}${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    // If 401, try one refresh
    if (res.status === 401) {
      tokens = await refreshQboToken();
      if (!tokens) return null;

      return fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      });
    }

    return res;
  } catch (err) {
    console.error("[QBO] Fetch error:", err);
    return null;
  }
}

/**
 * Find a QBO invoice by estimate number (stored as DocNumber in QBO).
 */
export async function getInvoiceByEstimateNumber(
  estimateNumber: string
): Promise<QboInvoice | null> {
  const query = encodeURIComponent(
    `SELECT * FROM Invoice WHERE DocNumber = '${estimateNumber}'`
  );
  const res = await qboFetch(`/query?query=${query}`);
  if (!res || !res.ok) return null;

  try {
    const data = await res.json();
    const invoices = data.QueryResponse?.Invoice;
    if (!invoices || invoices.length === 0) return null;
    return invoices[0] as QboInvoice;
  } catch {
    return null;
  }
}

/**
 * Check if a QBO invoice is fully paid (Balance === 0).
 */
export function isInvoicePaid(invoice: QboInvoice): boolean {
  return invoice.Balance === 0;
}

/**
 * Get the pre-tax total from a QBO invoice.
 */
export function getPreTaxTotal(invoice: QboInvoice): number {
  const totalTax = invoice.TxnTaxDetail?.TotalTax || 0;
  return Math.round((invoice.TotalAmt - totalTax) * 100) / 100;
}

/**
 * Check if QBO is connected (has valid tokens in settings).
 */
export async function isQboConnected(): Promise<boolean> {
  const tokens = await getQboTokens();
  return tokens !== null && !!tokens.access_token;
}
