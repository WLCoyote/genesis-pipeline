import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageTopbar from "@/app/components/ui/PageTopbar";
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
      <PageTopbar title="Follow-Up Sequences" subtitle="Automated follow-up steps for estimates" />

      <div className="space-y-6">
        {(sequences || []).map((seq: any) => (
          <SequenceEditor
            key={seq.id}
            sequenceId={seq.id}
            sequenceName={seq.name}
            initialSteps={seq.steps || []}
            initialIsActive={seq.is_active !== false}
          />
        ))}

        {(!sequences || sequences.length === 0) && (
          <div className="text-center py-12 text-ds-gray-lt dark:text-gray-500 text-[13px]">
            No sequences found. Run the default sequence SQL to get started.
          </div>
        )}
      </div>
    </div>
  );
}
