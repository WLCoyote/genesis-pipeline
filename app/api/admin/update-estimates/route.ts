import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { pollHcpEstimates } from "@/lib/hcp-polling";

// Allow up to 300s (Vercel Pro max) for HCP API pagination + processing
export const maxDuration = 300;

export async function POST() {
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

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const serviceClient = createServiceClient();
    const results = await pollHcpEstimates(serviceClient);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Manual HCP update error:", err);
    return NextResponse.json(
      { error: "Failed to update estimates from HCP" },
      { status: 500 }
    );
  }
}
