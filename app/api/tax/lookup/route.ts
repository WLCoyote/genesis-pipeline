import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTaxRate } from "@/lib/tax";

// GET /api/tax/lookup?address=123+Main+St&city=Monroe&zip=98272
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address?.trim()) {
    return NextResponse.json(
      { error: "address parameter is required" },
      { status: 400 }
    );
  }

  const city = searchParams.get("city") || undefined;
  const zip = searchParams.get("zip") || undefined;

  const result = await getTaxRate({ address: address.trim(), city, zip });

  return NextResponse.json({
    rate: result.rate,
    source: result.source,
  });
}
