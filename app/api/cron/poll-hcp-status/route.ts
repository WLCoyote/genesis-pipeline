import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { pollHcpEstimates } from "@/lib/hcp-polling";

// Allow up to 120s for HCP API pagination + processing
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const results = await pollHcpEstimates(supabase);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("HCP polling cron error:", err);
    return NextResponse.json(
      { error: "Polling failed" },
      { status: 500 }
    );
  }
}
