import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import MobileProfile from "./MobileProfile";

export default async function MobileProfilePage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <MobileProfile
      name={user.name}
      email={user.email}
      role={user.role}
      phone={user.phone}
    />
  );
}
