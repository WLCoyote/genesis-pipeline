import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageTopbar from "@/app/components/ui/PageTopbar";
import AnalyticsStats from "@/app/components/analytics/AnalyticsStats";
import ActivitySummary from "@/app/components/analytics/ActivitySummary";
import RepPerformance from "@/app/components/analytics/RepPerformance";
import RecentActivity from "@/app/components/analytics/RecentActivity";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "admin") redirect("/dashboard/estimates");

  // ---- Fetch all estimates with follow-up events ----
  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      `
      id,
      status,
      total_amount,
      sent_date,
      assigned_to,
      proposal_signed_at,
      created_at,
      last_contacted,
      customers ( name ),
      users!estimates_assigned_to_fkey ( id, name ),
      follow_up_events ( status, sent_at, channel, created_at )
    `
    )
    .order("created_at", { ascending: false });

  const allEstimates = (estimates || []) as any[];

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // ---- Row 1: Headline Stats ----
  const activeEstimates = allEstimates.filter((e) => e.status === "active");
  const pipelineValue = activeEstimates.reduce(
    (sum: number, e: any) => sum + (e.total_amount || 0),
    0
  );

  // Close rate (90 days): won / (won + lost)
  const recent = allEstimates.filter(
    (e) => e.sent_date && new Date(e.sent_date) >= ninetyDaysAgo
  );
  const wonRecent = recent.filter((e) => e.status === "won").length;
  const lostRecent = recent.filter((e) => e.status === "lost").length;
  const closeRate = wonRecent + lostRecent > 0 ? (wonRecent / (wonRecent + lostRecent)) * 100 : 0;

  // Avg days to close (won estimates: signed_at - sent_date)
  const wonEstimates = allEstimates.filter(
    (e) => e.status === "won" && e.proposal_signed_at && e.sent_date
  );
  let avgDaysToClose = 0;
  if (wonEstimates.length > 0) {
    const totalDays = wonEstimates.reduce((sum: number, e: any) => {
      const signed = new Date(e.proposal_signed_at).getTime();
      const sent = new Date(e.sent_date).getTime();
      return sum + Math.max(0, (signed - sent) / (1000 * 60 * 60 * 24));
    }, 0);
    avgDaysToClose = Math.round(totalDays / wonEstimates.length);
  }

  // Revenue won this month
  const revenueWonThisMonth = allEstimates
    .filter(
      (e) =>
        e.status === "won" &&
        e.proposal_signed_at &&
        new Date(e.proposal_signed_at) >= startOfMonth
    )
    .reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0);

  // ---- Row 2: Activity Summary ----
  const allEvents = allEstimates.flatMap((e) => e.follow_up_events || []);

  const followUpsSentThisWeek = allEvents.filter(
    (ev: any) =>
      ev.sent_at &&
      new Date(ev.sent_at) >= startOfWeek &&
      ["sent", "completed"].includes(ev.status)
  ).length;

  // Proposals viewed — from proposal_engagement
  const { count: proposalsViewedCount } = await supabase
    .from("proposal_engagement")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "page_view");

  // Proposals signed this month
  const proposalsSignedThisMonth = allEstimates.filter(
    (e) =>
      e.proposal_signed_at &&
      new Date(e.proposal_signed_at) >= startOfMonth
  ).length;

  // Overdue follow-ups (active estimates where last_contacted > 3 days ago or never contacted)
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const overdueFollowUps = activeEstimates.filter((e) => {
    if (!e.sent_date) return false;
    const lastContact = e.last_contacted
      ? new Date(e.last_contacted)
      : new Date(e.sent_date);
    return lastContact < threeDaysAgo;
  }).length;

  // ---- Row 3: Rep Performance ----
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name, role")
    .in("role", ["comfort_pro", "admin"])
    .eq("is_active", true);

  const reps = (allUsers || []).map((u) => {
    const repEstimates = allEstimates.filter((e) => e.assigned_to === u.id);
    const repActive = repEstimates.filter((e) => e.status === "active");
    const repWon = repEstimates.filter(
      (e) =>
        e.status === "won" &&
        e.sent_date &&
        new Date(e.sent_date) >= ninetyDaysAgo
    ).length;
    const repLost = repEstimates.filter(
      (e) =>
        e.status === "lost" &&
        e.sent_date &&
        new Date(e.sent_date) >= ninetyDaysAgo
    ).length;
    const repCloseRate =
      repWon + repLost > 0 ? (repWon / (repWon + repLost)) * 100 : 0;

    // Last activity — most recent follow-up event
    const repEvents = repEstimates.flatMap((e) => e.follow_up_events || []);
    const lastActivity = repEvents
      .filter((ev: any) => ev.sent_at)
      .sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
      ?.sent_at || null;

    return {
      name: u.name,
      activeEstimates: repActive.length,
      pipelineValue: repActive.reduce(
        (sum: number, e: any) => sum + (e.total_amount || 0),
        0
      ),
      closeRate: repCloseRate,
      lastActivity,
    };
  });

  // ---- Row 4: Recent Activity Feed ----
  type ActivityItem = {
    id: string;
    type: "signed" | "sms_sent" | "email_sent" | "call_made" | "new_lead" | "status_change" | "proposal_viewed";
    description: string;
    timestamp: string;
    amount?: number | null;
  };

  const activities: ActivityItem[] = [];

  // Signed proposals
  for (const est of allEstimates.filter((e) => e.proposal_signed_at)) {
    activities.push({
      id: `signed-${est.id}`,
      type: "signed",
      description: `${est.customers?.name || "Customer"} signed proposal`,
      timestamp: est.proposal_signed_at,
      amount: est.total_amount,
    });
  }

  // Recent follow-up events (sent SMS/Email/Call)
  for (const est of allEstimates) {
    const events = est.follow_up_events || [];
    for (const ev of events) {
      if (!ev.sent_at) continue;
      if (ev.channel === "sms" && ev.status === "sent") {
        activities.push({
          id: `sms-${est.id}-${ev.sent_at}`,
          type: "sms_sent",
          description: `SMS sent to ${est.customers?.name || "Customer"}`,
          timestamp: ev.sent_at,
        });
      } else if (ev.channel === "email" && ev.status === "sent") {
        activities.push({
          id: `email-${est.id}-${ev.sent_at}`,
          type: "email_sent",
          description: `Email sent to ${est.customers?.name || "Customer"}`,
          timestamp: ev.sent_at,
        });
      } else if (ev.channel === "call" && ev.status === "completed") {
        activities.push({
          id: `call-${est.id}-${ev.sent_at}`,
          type: "call_made",
          description: `Call logged for ${est.customers?.name || "Customer"}`,
          timestamp: ev.sent_at,
        });
      }
    }
  }

  // Recent leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, customer_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const lead of recentLeads || []) {
    activities.push({
      id: `lead-${lead.id}`,
      type: "new_lead",
      description: `New lead: ${lead.customer_name}`,
      timestamp: lead.created_at,
    });
  }

  // Sort by timestamp desc, take top 20
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const recentActivities = activities.slice(0, 20);

  return (
    <div>
      <PageTopbar
        title="Analytics"
        subtitle={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      />

      <div className="space-y-5">
        <AnalyticsStats
          pipelineValue={pipelineValue}
          closeRate={closeRate}
          avgDaysToClose={avgDaysToClose}
          revenueWonThisMonth={revenueWonThisMonth}
          activeEstimates={activeEstimates.length}
        />

        <ActivitySummary
          followUpsSentThisWeek={followUpsSentThisWeek}
          proposalsViewed={proposalsViewedCount || 0}
          proposalsSignedThisMonth={proposalsSignedThisMonth}
          overdueFollowUps={overdueFollowUps}
        />

        <RepPerformance reps={reps} />

        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  );
}
