/**
 * Branded HTML email templates for internal team notifications.
 * Follows the same pattern as proposal-email.ts (dark header, clean layout).
 */

interface NotificationEmailOpts {
  headline: string;
  customerName: string;
  estimateNumber: string;
  amount?: number | null;
  detailUrl: string;
  bodyText: string;
}

function fmt(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildNotificationEmailHtml(opts: NotificationEmailOpts): string {
  const amountBlock = opts.amount
    ? `
      <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
        Amount
      </p>
      <p style="margin:0;font-size:18px;color:#e65100;font-weight:bold;">
        ${fmt(opts.amount)}
      </p>`
    : "";

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
                Genesis Pipeline
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#0a2540;">
                ${opts.headline}
              </h2>

              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">
                ${opts.bodyText}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin:20px 0;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      Customer
                    </p>
                    <p style="margin:0 0 12px;font-size:14px;color:#1a1a1a;font-weight:bold;">
                      ${opts.customerName}
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      Estimate
                    </p>
                    <p style="margin:0 0 ${opts.amount ? "12px" : "0"};font-size:14px;color:#1a1a1a;font-weight:bold;">
                      ${opts.estimateNumber}
                    </p>

                    ${amountBlock}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 0;">
                    <a href="${opts.detailUrl}" style="display:inline-block;padding:12px 28px;background-color:#e65100;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">
                      View in Pipeline
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                Genesis Pipeline — Internal Team Notification
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
