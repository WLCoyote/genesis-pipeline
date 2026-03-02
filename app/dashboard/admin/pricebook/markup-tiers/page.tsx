import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkupTiersEditor from "@/app/components/MarkupTiersEditor";

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
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-5">
        <h1 className="font-display text-[22px] font-semibold uppercase tracking-[1px] text-ds-text dark:text-gray-100">
          Markup Tiers
        </h1>
      </div>

      <MarkupTiersEditor initialTiers={tiers || []} />
    </div>
  );
}
