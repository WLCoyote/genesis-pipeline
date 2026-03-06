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

  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .eq("is_active", true)
    .order("is_preset", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="h-full flex flex-col">
      <CampaignWizard templates={templates || []} />
    </div>
  );
}
