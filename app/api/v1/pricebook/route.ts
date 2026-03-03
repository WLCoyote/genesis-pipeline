import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-envelope";

// GET /api/v1/pricebook — Cross-app read-only pricebook endpoint
// Auth: GENESIS_INTERNAL_API_KEY (Bearer token)
// Response: { data, error, meta } conventions envelope
// Omits internal fields (cost, hcp_uuid, hcp_type, hcp_category_uuid)
export async function GET(request: NextRequest) {
  const authErr = validateApiKey(request);
  if (authErr) return authErr;

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
      return apiError("INTERNAL_ERROR", error.message);
    }

    return apiSuccess({
      items: data,
      total_count: data.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError("INTERNAL_ERROR", message);
  }
}
