import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import PageTopbar from "@/app/components/ui/PageTopbar";
import CreateLeadForm from "@/app/components/CreateLeadForm";
import LeadCard from "@/app/components/LeadCard";
import ArchivedLeadsSection from "@/app/components/ArchivedLeadsSection";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const params = await searchParams;
  const prefillPhone = params.phone || null;
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

  const role = dbUser?.role as UserRole;
  if (!["admin", "csr"].includes(role)) redirect("/dashboard/estimates");

  // Fetch comfort pros for assignment dropdowns
  const { data: comfortPros } = await supabase
    .from("users")
    .select("id, name")
    .in("role", ["comfort_pro", "admin"])
    .eq("is_active", true)
    .order("name");

  const pros = (comfortPros || []).map((p) => ({ id: p.id, name: p.name }));

  // Fetch HCP lead sources from settings
  const { data: leadSourceSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "hcp_lead_sources")
    .single();

  const leadSources: string[] = Array.isArray(leadSourceSetting?.value)
    ? leadSourceSetting.value.map((s: { name: string }) => s.name)
    : [];

  const isAdmin = role === "admin";

  // Fetch active leads (not moved to HCP or archived)
  const { data: leads } = await supabase
    .from("leads")
    .select("*, users!leads_assigned_to_fkey ( name )")
    .not("status", "in", '("moved_to_hcp","archived")')
    .order("created_at", { ascending: false });

  const activeLeads = (leads || []) as any[];

  // Fetch archived leads (including moved to HCP)
  const { data: archivedLeadsData } = await supabase
    .from("leads")
    .select("*, users!leads_assigned_to_fkey ( name )")
    .in("status", ["archived", "moved_to_hcp"])
    .order("updated_at", { ascending: false });

  const archivedLeads = (archivedLeadsData || []) as any[];

  const leadStatusStyles: Record<string, string> = {
    new: "bg-ds-blue-bg text-ds-blue",
    contacted: "bg-ds-yellow-bg text-[#795500]",
    qualified: "bg-ds-green-bg text-ds-green",
    moved_to_hcp: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
    archived: "bg-ds-bg text-ds-gray",
  };

  return (
    <div>
      <PageTopbar
        title="Leads"
        subtitle={
          activeLeads.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-ds-blue-bg text-ds-blue">
              {activeLeads.length} active
            </span>
          ) : undefined
        }
      />

      <div className="mb-4">
        <CreateLeadForm comfortPros={pros} prefillPhone={prefillPhone} leadSources={leadSources} />
      </div>

      {activeLeads.length === 0 ? (
        <div className="text-center py-12 text-ds-gray-lt dark:text-gray-400 text-[13px]">
          No active leads. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {activeLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              comfortPros={pros}
              leadSources={leadSources}
              statusStyles={leadStatusStyles}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      <ArchivedLeadsSection count={archivedLeads.length}>
        {archivedLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            comfortPros={pros}
            leadSources={leadSources}
            statusStyles={leadStatusStyles}
            isAdmin={isAdmin}
          />
        ))}
      </ArchivedLeadsSection>
    </div>
  );
}
