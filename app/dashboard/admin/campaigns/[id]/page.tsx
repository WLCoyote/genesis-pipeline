import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageTopbar from "@/app/components/ui/PageTopbar";
import CampaignDetail from "@/app/components/campaigns/CampaignDetail";

export default async function CampaignDetailPage({
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

  if (dbUser?.role !== "admin") redirect("/dashboard/estimates");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) redirect("/dashboard/admin/campaigns");

  return (
    <div>
      <PageTopbar title={campaign.name} subtitle={`${campaign.type} campaign · ${campaign.status}`} />
      <div className="p-6">
        <CampaignDetail campaign={campaign} />
      </div>
    </div>
  );
}
