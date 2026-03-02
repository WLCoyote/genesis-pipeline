import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CsvUploader from "@/app/components/CsvUploader";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function ImportPage() {
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

  return (
    <div>
      <PageTopbar title="Import Estimates" />
      <CsvUploader />
    </div>
  );
}
