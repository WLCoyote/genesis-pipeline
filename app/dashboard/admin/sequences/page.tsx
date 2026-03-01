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
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-6 -mt-6 mb-5">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl font-black tracking-[1px] uppercase text-ds-text dark:text-gray-100">
            Follow-Up Sequences
          </h1>
          <span className="text-xs text-ds-gray dark:text-gray-500">
            Automated follow-up steps for estimates
          </span>
        </div>
      </div>

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
