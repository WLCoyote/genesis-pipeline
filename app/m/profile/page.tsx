import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileProfile from "./MobileProfile";

export default async function MobileProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dbUser } = await supabase
    .from("users")
    .select("name, role, email, phone")
    .eq("id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  return (
    <MobileProfile
      name={dbUser.name}
      email={dbUser.email || user.email || ""}
      role={dbUser.role}
      phone={dbUser.phone}
    />
  );
}
