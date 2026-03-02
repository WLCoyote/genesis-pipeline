import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchAllHcpMaterials, fetchAllHcpServices } from "@/lib/hcp-pricebook";
import type { HcpMaterial, HcpService } from "@/lib/hcp-pricebook";

/**
 * Full HCP Pricebook Sync — updates existing items AND imports new ones.
 * Unlike the import endpoint which only adds new items, this also refreshes
 * prices/descriptions on items already linked to HCP.
 */
export async function POST() {
  // Auth: require admin
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

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const serviceClient = createServiceClient();

    // Fetch from HCP
    const [materials, services] = await Promise.all([
      fetchAllHcpMaterials(),
      fetchAllHcpServices(),
    ]);

    console.log(
      `[Pricebook Full Sync] Fetched ${materials.length} materials, ${services.length} services from HCP`
    );

    // Load existing HCP-linked items
    const { data: existingItems } = await serviceClient
      .from("pricebook_items")
      .select("id, hcp_uuid")
      .not("hcp_uuid", "is", null);

    const existingByUuid = new Map(
      (existingItems || []).map((i) => [i.hcp_uuid, i.id])
    );

    let updated = 0;
    let imported = 0;

    // Process materials
    for (const m of materials as HcpMaterial[]) {
      const existingId = existingByUuid.get(m.uuid);
      if (existingId) {
        // Update existing item
        const updates: Record<string, unknown> = {};
        if (m.name) updates.display_name = m.name;
        if (m.description != null) updates.description = m.description || null;
        if (m.price != null) updates.unit_price = m.price / 100;
        if (m.cost != null) updates.cost = m.cost / 100;
        if (m.material_category_name) updates.hcp_category_name = m.material_category_name;
        if (m.material_category_uuid) updates.hcp_category_uuid = m.material_category_uuid;
        if (m.material_category_path) updates.hcp_category_path = m.material_category_path;

        if (Object.keys(updates).length > 0) {
          await serviceClient
            .from("pricebook_items")
            .update(updates)
            .eq("id", existingId);
          updated++;
        }
      } else {
        // Insert new
        await serviceClient.from("pricebook_items").insert({
          hcp_uuid: m.uuid,
          hcp_type: "material",
          display_name: m.name || "Unnamed Material",
          description: m.description || null,
          unit_price: m.price != null ? m.price / 100 : null,
          cost: m.cost != null ? m.cost / 100 : null,
          taxable: m.taxable ?? true,
          unit_of_measure: m.unit_of_measure || null,
          part_number: m.part_number || null,
          hcp_category_uuid: m.material_category_uuid || null,
          hcp_category_name: m.material_category_name || null,
          hcp_category_path: m.material_category_path || null,
          category: "material",
          is_active: true,
        });
        imported++;
      }
    }

    // Process services
    for (const s of services as HcpService[]) {
      const existingId = existingByUuid.get(s.uuid);
      if (existingId) {
        const updates: Record<string, unknown> = {};
        if (s.name) updates.display_name = s.name;
        if (s.description != null) updates.description = s.description || null;
        if (s.price != null) updates.unit_price = s.price / 100;
        if (s.cost != null) updates.cost = s.cost / 100;

        if (Object.keys(updates).length > 0) {
          await serviceClient
            .from("pricebook_items")
            .update(updates)
            .eq("id", existingId);
          updated++;
        }
      } else {
        await serviceClient.from("pricebook_items").insert({
          hcp_uuid: s.uuid,
          hcp_type: "service",
          display_name: s.name || "Unnamed Service",
          description: s.description || null,
          unit_price: s.price != null ? s.price / 100 : null,
          cost: s.cost != null ? s.cost / 100 : null,
          taxable: s.taxable ?? true,
          unit_of_measure: s.unit_of_measure || null,
          hcp_category_uuid: s.category?.id != null ? String(s.category.id) : null,
          hcp_category_name: s.category?.name || null,
          category: "labor",
          is_active: true,
        });
        imported++;
      }
    }

    console.log(
      `[Pricebook Full Sync] Done: ${updated} updated, ${imported} imported`
    );

    return NextResponse.json({ success: true, updated, imported });
  } catch (err) {
    console.error("[Pricebook Full Sync] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
