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
  for (const s of settings || []) {
    if (s.key === "hcp_lead_sources") {
      hcpLeadSourceCount = Array.isArray(s.value) ? s.value.length : 0;
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure system-wide pipeline settings
        </p>
      </div>

      <SettingsForm initialSettings={settingsMap} hcpLeadSourceCount={hcpLeadSourceCount} />
    </div>
  );
}
