import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import StatusBadge from "@/app/components/StatusBadge";
import CreateLeadForm from "@/app/components/CreateLeadForm";
import CreateEstimateForm from "@/app/components/CreateEstimateForm";
import ReassignDropdown from "@/app/components/ReassignDropdown";
import LeadCard from "@/app/components/LeadCard";
import LeadsTabs from "@/app/components/LeadsTabs";

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

  // Fetch active leads (not yet moved to HCP)
  const { data: leads } = await supabase
    .from("leads")
    .select("*, users!leads_assigned_to_fkey ( name )")
    .neq("status", "moved_to_hcp")
    .order("created_at", { ascending: false });

  const activeLeads = (leads || []) as any[];

  // Fetch recent estimates with customer + assigned user
  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      `
      id,
      estimate_number,
      status,
      total_amount,
      sent_date,
      assigned_to,
      customers ( name, email, phone ),
      users!estimates_assigned_to_fkey ( name )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (estimates || []) as any[];

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "—";
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  const leadStatusStyles: Record<string, string> = {
    new: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    contacted: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    qualified: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  };

  // Build the leads section
  const leadsContent = (
    <>
      <div className="mb-4">
        <CreateLeadForm comfortPros={pros} prefillPhone={prefillPhone} leadSources={leadSources} />
      </div>

      {activeLeads.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
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
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </>
  );

  // Build the estimates section
  const estimatesContent = (
    <>
      <div className="mb-4">
        <CreateEstimateForm comfortPros={pros} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          No estimates yet.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Sent
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Assigned To
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((est) => (
                  <tr
                    key={est.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {est.customers?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        #{est.estimate_number}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {est.customers?.email || "—"}
                      </div>
                      {est.customers?.phone && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {est.customers.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {formatAmount(est.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={est.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(est.sent_date)}
                    </td>
                    <td className="px-4 py-3">
                      <ReassignDropdown
                        estimateId={est.id}
                        currentAssignedTo={est.assigned_to}
                        comfortPros={pros}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((est) => (
              <div
                key={est.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {est.customers?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      #{est.estimate_number}
                    </div>
                  </div>
                  <StatusBadge status={est.status} />
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatAmount(est.total_amount)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Sent {formatDate(est.sent_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Assign to:</span>
                  <ReassignDropdown
                    estimateId={est.id}
                    currentAssignedTo={est.assigned_to}
                    comfortPros={pros}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leads & Estimates</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage incoming leads and assign estimates to comfort pros
        </p>
      </div>

      <LeadsTabs
        leadCount={activeLeads.length}
        estimateCount={rows.length}
        leadsContent={leadsContent}
        estimatesContent={estimatesContent}
      />
    </div>
  );
}
