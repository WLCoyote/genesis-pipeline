import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkupTiersEditor from "@/app/components/MarkupTiersEditor";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function MarkupTiersPage() {
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

  const { data: tiers } = await supabase
    .from("markup_tiers")
    .select("*")
    .order("tier_number", { ascending: true });

  return (
    <div>
      <PageTopbar title="Markup Tiers" />

      <MarkupTiersEditor initialTiers={tiers || []} />
    </div>
  );
}
