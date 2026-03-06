import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailTemplateManager from "@/app/components/campaigns/EmailTemplateManager";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function EmailTemplatesPage() {
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
    .order("is_preset", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageTopbar title="Email Templates" subtitle="Create and manage email templates for campaigns" />
      <div className="p-6">
        <EmailTemplateManager initialTemplates={templates || []} />
      </div>
    </div>
  );
}
