import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/app/components/SettingsForm";

export default async function SettingsPage() {
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

  // Fetch all settings
  const { data: settings } = await supabase.from("settings").select("*");

  const settingsMap: Record<string, number | string | boolean> = {};
  let hcpLeadSourceCount = 0;
  let companyInfo = {};
  let proposalTerms = {};

  for (const s of settings || []) {
    if (s.key === "hcp_lead_sources") {
      hcpLeadSourceCount = Array.isArray(s.value) ? s.value.length : 0;
    } else if (s.key === "company_info") {
      companyInfo = (typeof s.value === "object" && s.value !== null) ? s.value : {};
    } else if (s.key === "proposal_terms") {
      proposalTerms = (typeof s.value === "object" && s.value !== null) ? s.value : {};
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Company information, proposal terms, and pipeline configuration
        </p>
      </div>

      <SettingsForm
        initialSettings={settingsMap}
        initialCompanyInfo={companyInfo as Record<string, string>}
        initialProposalTerms={proposalTerms as Record<string, string>}
        hcpLeadSourceCount={hcpLeadSourceCount}
      />
    </div>
  );
}
