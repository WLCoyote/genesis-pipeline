// Campaign email orchestrator — blocks + variables + customer → final HTML
// Generates table-based inline-styled HTML with CAN-SPAM footer and List-Unsubscribe headers

import { EmailBlock } from "./campaign-types";
import { blockToHtml } from "./campaign-blocks";

interface RenderOptions {
  blocks: EmailBlock[];
  customerName: string;
  customerEmail: string;
  customerCity: string | null;
  companyName: string;
  unsubscribeUrl: string;
  previewText?: string;
}

/**
 * Render campaign email blocks into complete HTML email
 */
export function renderCampaignEmail(opts: RenderOptions): string {
  const {
    blocks,
    customerName,
    customerEmail,
    customerCity,
    companyName,
    unsubscribeUrl,
    previewText,
  } = opts;

  // Render all blocks
  let blocksHtml = blocks.map((b) => blockToHtml(b)).join("\n");

  // Replace variable tokens
  blocksHtml = replaceVariables(blocksHtml, {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_city: customerCity || "",
    company_name: companyName,
    unsubscribe_url: unsubscribeUrl,
  });

  const previewTextHtml = previewText
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(companyName)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%;">
  ${previewTextHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          ${blocksHtml}
        </table>

        <!-- CAN-SPAM Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
          <tr>
            <td style="padding: 24px; text-align: center; color: #999999; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 8px;">
                ${escapeHtml(companyName)} &middot; Monroe, WA
              </p>
              <p style="margin: 0 0 8px;">
                You received this email because you are a customer of ${escapeHtml(companyName)}.
              </p>
              <p style="margin: 0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #666666; text-decoration: underline;">
                  Unsubscribe from marketing emails
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate List-Unsubscribe headers for CAN-SPAM compliance (RFC 8058)
 */
export function getUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Replace {{variable}} tokens in content
 */
function replaceVariables(
  html: string,
  vars: Record<string, string>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate or retrieve an unsubscribe token for a customer
 */
export async function getOrCreateUnsubscribeToken(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  customerId: string
): Promise<string> {
  // Check for existing token
  const { data: existing } = await supabase
    .from("unsubscribe_tokens")
    .select("token")
    .eq("customer_id", customerId)
    .single();

  if (existing) return existing.token;

  // Create new token
  const { data: newToken } = await supabase
    .from("unsubscribe_tokens")
    .insert({ customer_id: customerId })
    .select("token")
    .single();

  return newToken?.token || "";
}
