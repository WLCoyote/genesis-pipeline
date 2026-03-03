/**
 * Notification dispatcher — creates in-app notifications and sends branded emails.
 * Uses Resend directly (same pattern as lib/proposal-email.ts).
 */

import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { buildNotificationEmailHtml } from "@/lib/email-templates";
import type { NotificationType } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.genesishvacr.com";

interface NotifyOpts {
  type: NotificationType;
  estimateId: string;
  estimateNumber: string;
  customerName: string;
  message: string;
  amount?: number | null;
}

/**
 * Send notifications for an estimate event.
 * 1. Determines who to notify (assigned rep + admins + marketing email)
 * 2. Creates in-app notification records
 * 3. Sends branded email to each user (if their preferences allow)
 */
export async function sendEstimateNotifications(
  opts: NotifyOpts,
  assignedTo?: string | null
): Promise<void> {
  const supabase = createServiceClient();

  // Collect user IDs to notify
  const notifyUserIds = new Set<string>();
  if (assignedTo) notifyUserIds.add(assignedTo);

  // Add all active admins
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  for (const admin of admins || []) {
    notifyUserIds.add(admin.id);
  }

  // Load user details for email sending
  const { data: usersToNotify } = await supabase
    .from("users")
    .select("id, email, name")
    .in("id", Array.from(notifyUserIds))
    .eq("is_active", true);

  if (!usersToNotify || usersToNotify.length === 0) return;

  // Load CC emails from settings (comma-separated list)
  let ccEmails: string[] = [];
  try {
    const { data: ccSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "notification_cc_emails")
      .single();

    if (ccSetting?.value) {
      const parsed = JSON.parse(ccSetting.value as string);
      if (typeof parsed === "string" && parsed.trim()) {
        ccEmails = parsed.split(",").map((e: string) => e.trim()).filter(Boolean);
      }
    }
  } catch {
    // no CC setting configured — skip
  }

  // Load notification preferences for these users
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, event_type, email_enabled")
    .in("user_id", usersToNotify.map((u) => u.id))
    .eq("event_type", opts.type);

  const prefMap = new Map(
    (prefs || []).map((p) => [`${p.user_id}:${p.event_type}`, p.email_enabled])
  );

  const detailUrl = `${APP_URL}/dashboard/estimates/${opts.estimateId}`;

  // Build email content based on event type
  const emailOpts = getEmailContent(opts, detailUrl);

  for (const user of usersToNotify) {
    // 1. Create in-app notification
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: opts.type,
        estimate_id: opts.estimateId,
        message: opts.message,
      });
    } catch (err) {
      console.error(`[Notifications] In-app notification failed for ${user.id}:`, err);
    }

    // 2. Send email if enabled (default: true if no preference row exists)
    const emailEnabled = prefMap.get(`${user.id}:${opts.type}`) ?? true;
    if (emailEnabled && emailOpts) {
      try {
        const html = buildNotificationEmailHtml(emailOpts);
        const { error } = await resend.emails.send({
          from: "Genesis Pipeline <marketing@genesishvacr.com>",
          to: user.email,
          ...(ccEmails.length > 0 && { cc: ccEmails }),
          subject: emailOpts.headline,
          html,
        });

        if (error) {
          console.error(`[Notifications] Email failed for ${user.email}:`, error.message);
        } else {
          console.log(`[Notifications] Email sent to ${user.email}: ${emailOpts.headline}`);
        }
      } catch (err) {
        console.error(`[Notifications] Email error for ${user.email}:`, err);
      }
    }
  }

  // 3. Send to marketing email (from settings) for signed proposals
  if (opts.type === "estimate_approved") {
    try {
      const { data: setting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "notification_marketing_email")
        .single();

      const marketingEmail = setting?.value
        ? JSON.parse(setting.value as string)
        : null;

      if (marketingEmail && emailOpts) {
        const html = buildNotificationEmailHtml(emailOpts);
        await resend.emails.send({
          from: "Genesis Pipeline <marketing@genesishvacr.com>",
          to: marketingEmail,
          subject: emailOpts.headline,
          html,
        });
        console.log(`[Notifications] Marketing email sent to ${marketingEmail}`);
      }
    } catch (err) {
      console.error("[Notifications] Marketing email failed:", err);
    }
  }
}

function getEmailContent(
  opts: NotifyOpts,
  detailUrl: string
): {
  headline: string;
  customerName: string;
  estimateNumber: string;
  amount: number | null;
  detailUrl: string;
  bodyText: string;
} | null {
  switch (opts.type) {
    case "estimate_approved":
      return {
        headline: "Proposal Signed!",
        customerName: opts.customerName,
        estimateNumber: opts.estimateNumber,
        amount: opts.amount || null,
        detailUrl,
        bodyText: `${opts.customerName} has signed their proposal. Time to schedule the install!`,
      };
    case "estimate_declined":
      return {
        headline: "Estimate Lost",
        customerName: opts.customerName,
        estimateNumber: opts.estimateNumber,
        amount: opts.amount || null,
        detailUrl,
        bodyText: `${opts.customerName}'s estimate has been marked as lost. Review the details and consider a follow-up.`,
      };
    case "lead_assigned":
      return {
        headline: "New Lead Assigned",
        customerName: opts.customerName,
        estimateNumber: opts.estimateNumber,
        amount: null,
        detailUrl,
        bodyText: `A new lead has been assigned: ${opts.customerName}. Check the estimate details.`,
      };
    case "commission_estimated":
      return {
        headline: "Commission Estimated",
        customerName: opts.customerName,
        estimateNumber: opts.estimateNumber,
        amount: opts.amount || null,
        detailUrl: `${APP_URL}/dashboard/commission`,
        bodyText: `A commission has been estimated for ${opts.customerName}'s signed proposal. It will be confirmed once the job is complete and the invoice is paid.`,
      };
    case "commission_confirmed":
      return {
        headline: "Commission Confirmed!",
        customerName: opts.customerName,
        estimateNumber: opts.estimateNumber,
        amount: opts.amount || null,
        detailUrl: `${APP_URL}/dashboard/commission`,
        bodyText: `Great news! Your commission for ${opts.customerName}'s job has been confirmed. The job is complete and the invoice has been paid.`,
      };
    default:
      return null;
  }
}
