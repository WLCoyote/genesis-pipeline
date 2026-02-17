import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CsvUploader from "@/app/components/CsvUploader";

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Estimates</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload a CSV from Housecall Pro to import customers and estimates
        </p>
      </div>
      <CsvUploader />
    </div>
  );
}
