import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignWizard from "@/app/components/campaigns/CampaignWizard";

export default async function NewCampaignPage() {
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

  const [{ data: templates }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true)
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "campaign_default_batch_size",
        "campaign_default_batch_interval",
        "campaign_warmup_enabled",
      ]),
  ]);

  const defaults: Record<string, number | boolean> = {};
  for (const s of settingsRows || []) {
    if (s.key === "campaign_default_batch_size" && s.value) defaults.batchSize = Number(s.value);
    if (s.key === "campaign_default_batch_interval" && s.value) defaults.batchInterval = Number(s.value);
    if (s.key === "campaign_warmup_enabled") defaults.warmup = Boolean(s.value);
  }

  return (
    <div className="h-full flex flex-col">
      <CampaignWizard
        templates={templates || []}
        defaultBatchSize={typeof defaults.batchSize === "number" ? defaults.batchSize : undefined}
        defaultBatchInterval={typeof defaults.batchInterval === "number" ? defaults.batchInterval : undefined}
        defaultWarmup={typeof defaults.warmup === "boolean" ? defaults.warmup : undefined}
      />
    </div>
  );
}
