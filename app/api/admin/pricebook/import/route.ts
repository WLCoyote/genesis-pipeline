import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchAllHcpMaterials, fetchAllHcpServices } from "@/lib/hcp-pricebook";
import type { HcpMaterial, HcpService } from "@/lib/hcp-pricebook";

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

    console.log(`[Pricebook Import] Fetched ${materials.length} materials, ${services.length} services from HCP`);

    // Load existing HCP-linked items so we only import NEW ones
    const { data: existingItems } = await serviceClient
      .from("pricebook_items")
      .select("hcp_uuid")
      .not("hcp_uuid", "is", null);

    const existingUuids = new Set((existingItems || []).map((i) => i.hcp_uuid));

    // Insert only new materials (skip anything already in Pipeline)
    let materialsImported = 0;
    if (materials.length > 0) {
      const newMaterials = materials.filter((m: HcpMaterial) => !existingUuids.has(m.uuid));

      if (newMaterials.length > 0) {
        const rows = newMaterials.map((m: HcpMaterial) => ({
          hcp_uuid: m.uuid,
          hcp_type: "material" as const,
          display_name: m.name || "Unnamed Material",
          description: m.description || null,
          unit_price: m.price != null ? m.price / 100 : null,
          cost: m.cost != null ? m.cost / 100 : null,
          taxable: m.taxable ?? true,
          unit_of_measure: m.unit_of_measure || null,
          part_number: m.part_number || null,
          hcp_category_uuid: m.material_category_uuid || null,
          hcp_category_name: m.material_category_name || null,
          category: "material",
          is_active: true,
        }));

        const { error } = await serviceClient
          .from("pricebook_items")
          .insert(rows);

        if (error) {
          console.error("[Pricebook Import] Material insert error:", error);
          return NextResponse.json({ error: `Material insert failed: ${error.message}` }, { status: 500 });
        }
        materialsImported = rows.length;
      }

      console.log(`[Pricebook Import] Materials: ${newMaterials.length} new, ${materials.length - newMaterials.length} already in Pipeline (skipped)`);
    }

    // Insert only new services
    let servicesImported = 0;
    if (services.length > 0) {
      const newServices = services.filter((s: HcpService) => !existingUuids.has(s.uuid));

      if (newServices.length > 0) {
        const rows = newServices.map((s: HcpService) => ({
          hcp_uuid: s.uuid,
          hcp_type: "service" as const,
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
        }));

        const { error } = await serviceClient
          .from("pricebook_items")
          .insert(rows);

        if (error) {
          console.error("[Pricebook Import] Service insert error:", error);
          return NextResponse.json({ error: `Service insert failed: ${error.message}` }, { status: 500 });
        }
        servicesImported = rows.length;
      }

      console.log(`[Pricebook Import] Services: ${newServices.length} new, ${services.length - newServices.length} already in Pipeline (skipped)`);
    }

    console.log(`[Pricebook Import] Done: ${materialsImported} new materials, ${servicesImported} new services`);

    return NextResponse.json({
      success: true,
      materials_imported: materialsImported,
      materials_skipped: materials.length - materialsImported,
      services_imported: servicesImported,
      services_skipped: services.length - servicesImported,
    });
  } catch (err) {
    console.error("[Pricebook Import] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
