import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SequenceEditor from "@/app/components/SequenceEditor";

export default async function SequencesPage() {
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

  // Fetch all sequences
  const { data: sequences } = await supabase
    .from("follow_up_sequences")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Follow-Up Sequences
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edit the automated follow-up steps for estimates
        </p>
      </div>

      <div className="space-y-6">
        {(sequences || []).map((seq: any) => (
          <SequenceEditor
            key={seq.id}
            sequenceId={seq.id}
            sequenceName={seq.name}
            initialSteps={seq.steps || []}
          />
        ))}

        {(!sequences || sequences.length === 0) && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
            No sequences found. Run the default sequence SQL to get started.
          </div>
        )}
      </div>
    </div>
  );
}
