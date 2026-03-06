import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Cached auth helper — deduplicates getUser() + users table query
 * within a single Next.js request. Layout and page can both call this
 * but only one set of Supabase queries runs.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, name, role, email, phone")
    .eq("id", user.id)
    .single();

  if (!dbUser) return null;

  return {
    id: user.id,
    name: dbUser.name as string,
    role: dbUser.role as string,
    email: (dbUser.email as string) || user.email || "",
    phone: dbUser.phone as string | null,
  };
});
