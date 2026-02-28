import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/v1/pricebook — Cross-app read-only pricebook endpoint
// Auth: GENESIS_INTERNAL_API_KEY (Bearer token)
// Response: { data, error, meta } conventions envelope
// Omits internal fields (cost, hcp_uuid, hcp_type, hcp_category_uuid)
export async function GET(request: NextRequest) {
  // Authenticate with shared API key
  const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.GENESIS_INTERNAL_API_KEY) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid API key" },
        meta: {
          app: "pipeline",
          version: "1.0",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceClient();

    const url = request.nextUrl;
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    let query = supabase
      .from("pricebook_items")
      .select(
        "id, category, display_name, spec_line, description, unit_price, manufacturer, model_number, is_addon, is_commissionable, rebate_amount, taxable, is_active, created_at, updated_at"
      )
      .eq("is_active", true)
      .order("display_name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,manufacturer.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "INTERNAL_ERROR", message: error.message },
          meta: {
            app: "pipeline",
            version: "1.0",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        items: data,
        total_count: data.length,
      },
      error: null,
      meta: {
        app: "pipeline",
        version: "1.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message },
        meta: {
          app: "pipeline",
          version: "1.0",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
