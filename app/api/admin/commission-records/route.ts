import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/commission-records — List commission records
// Admin sees all, comfort_pro sees own
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = dbUser?.role === "admin";

  const url = request.nextUrl;
  const userFilter = url.searchParams.get("user_id");
  const statusFilter = url.searchParams.get("status");

  let query = supabase
    .from("commission_records")
    .select(`
      *,
      estimates!commission_records_estimate_id_fkey (
        estimate_number,
        customers ( name )
      ),
      users!commission_records_user_id_fkey ( name )
    `)
    .order("created_at", { ascending: false });

  // Non-admin can only see own records
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  } else if (userFilter) {
    query = query.eq("user_id", userFilter);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data });
}
