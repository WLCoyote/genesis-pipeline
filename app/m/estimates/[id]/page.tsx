import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileEstimateDetail from "./MobileEstimateDetail";

export default async function MobileEstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (!dbUser) redirect("/login");
  const isAdmin = dbUser.role === "admin";

  const { data: estimate, error } = await supabase
    .from("estimates")
    .select(
      `
      *,
      customers (*),
      users!estimates_assigned_to_fkey ( id, name, email ),
      estimate_options (*),
      estimate_line_items (*),
      follow_up_events (*),
      follow_up_sequences (steps, is_active),
      proposal_engagement (*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !estimate) notFound();

  // Role guard: comfort pros can only see their own estimates
  if (!isAdmin && (estimate as any).assigned_to !== user.id) {
    redirect("/m/pipeline");
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("estimate_id", id)
    .order("created_at", { ascending: true });

  const est = estimate as any;
  const customer = est.customers;
  const events = est.follow_up_events || [];
  const lineItems = est.estimate_line_items || [];
  const engagements = est.proposal_engagement || [];

  // Compute next due step
  const sequenceSteps = (est.follow_up_sequences as any)?.steps as Array<{
    day_offset: number; channel: string; is_call_task: boolean;
  }> | undefined;
  const sequenceIsActive = (est.follow_up_sequences as any)?.is_active !== false;

  let nextDueStep: { day_offset: number; channel: string; step_index: number; is_call_task: boolean } | null = null;
  if (est.status === "active" && sequenceSteps && est.sent_date) {
    const stepIndex = est.sequence_step_index || 0;
    if (stepIndex < sequenceSteps.length) {
      const step = sequenceSteps[stepIndex];
      const sentDate = new Date(est.sent_date);
      const dueDate = new Date(sentDate);
      dueDate.setDate(dueDate.getDate() + step.day_offset);
      if (dueDate <= new Date()) {
        const hasEvent = events.some((e: any) => e.sequence_step_index === stepIndex);
        if (!hasEvent) {
          nextDueStep = { day_offset: step.day_offset, channel: step.channel, step_index: stepIndex, is_call_task: step.is_call_task };
        }
      }
    }
  }

  return (
    <MobileEstimateDetail
      estimateId={id}
      estimate={{
        estimate_number: est.estimate_number,
        status: est.status,
        total_amount: est.total_amount,
        sent_date: est.sent_date,
        snooze_note: est.snooze_note,
        snooze_until: est.snooze_until,
        proposal_token: est.proposal_token,
        proposal_signed_at: est.proposal_signed_at,
        proposal_signed_name: est.proposal_signed_name,
        proposal_pdf_url: est.proposal_pdf_url,
        sequence_step_index: est.sequence_step_index || 0,
        selected_tier: est.selected_tier ?? null,
        subtotal: est.subtotal,
        tax_amount: est.tax_amount,
        tax_rate: est.tax_rate,
      }}
      customer={customer}
      events={events}
      lineItems={lineItems}
      engagements={engagements}
      messages={messages || []}
      isAdmin={isAdmin}
      sequenceSteps={sequenceSteps || null}
      sequenceIsActive={sequenceIsActive}
      nextDueStep={nextDueStep}
      options={est.estimate_options || []}
    />
  );
}
