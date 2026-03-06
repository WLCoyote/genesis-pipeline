import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageTopbar from "@/app/components/ui/PageTopbar";
import CampaignList from "@/app/components/campaigns/CampaignList";
import CampaignStats from "@/app/components/campaigns/CampaignStats";

export default async function CampaignsPage() {
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

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageTopbar title="Campaigns" subtitle="Email and SMS marketing campaigns" />
      <div className="p-6 space-y-6">
        <CampaignStats />
        <CampaignList initialCampaigns={campaigns || []} />
      </div>
    </div>
  );
}
