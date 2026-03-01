/**
 * Proposal confirmation email with PDF attachment.
 * Uses Resend directly (not /api/send-email) for attachment support.
 */

import { Resend } from "resend";
import type { CompanyInfo } from "@/lib/company-settings";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendConfirmationEmailOpts {
  customerEmail: string;
  customerName: string;
  estimateNumber: string;
  selectedTierName: string;
  totalAmount: number;
  pdfBuffer: Buffer | null;
  companyInfo: CompanyInfo;
}

function fmt(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildConfirmationHtml(opts: SendConfirmationEmailOpts): string {
  const co = opts.companyInfo;
  const phoneDigits = co.phone.replace(/\D/g, "");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0a2540;padding:24px 32px;">
              <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">
                ${co.company_name}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#0a2540;">
                Thank you, ${opts.customerName}!
              </h2>

              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">
                Your proposal has been accepted. We're excited to get started on your project!
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin:20px 0;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      Estimate
                    </p>
                    <p style="margin:0 0 12px;font-size:14px;color:#1a1a1a;font-weight:bold;">
                      ${opts.estimateNumber}
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      Selected Package
                    </p>
                    <p style="margin:0 0 12px;font-size:14px;color:#1a1a1a;font-weight:bold;">
                      ${opts.selectedTierName}
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      Total
                    </p>
                    <p style="margin:0;font-size:18px;color:#e65100;font-weight:bold;">
                      ${fmt(opts.totalAmount)}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">
                <strong>What happens next:</strong> Our team will reach out to schedule your installation. If you have any questions in the meantime, don't hesitate to give us a call.
              </p>

              <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
                <strong>${co.company_name}</strong><br>
                <a href="tel:${phoneDigits}" style="color:#e65100;text-decoration:none;">${co.phone}</a><br>
                <a href="https://${co.website}" style="color:#e65100;text-decoration:none;">${co.website}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                ${co.company_name} | ${co.address} | License: ${co.license_number}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export async function sendProposalConfirmationEmail(
  opts: SendConfirmationEmailOpts
): Promise<void> {
  const html = buildConfirmationHtml(opts);
  const filename = `Genesis-Proposal-${opts.estimateNumber}-Signed.pdf`;

  const attachments = opts.pdfBuffer
    ? [{ filename, content: opts.pdfBuffer }]
    : [];

  const { error } = await resend.emails.send({
    from: "Genesis HVAC <marketing@genesishvacr.com>",
    to: opts.customerEmail,
    subject: `Your proposal has been accepted — ${opts.estimateNumber}`,
    html,
    attachments,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
