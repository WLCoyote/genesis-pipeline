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

    // Upsert materials
    let materialsImported = 0;
    if (materials.length > 0) {
      const materialRows = materials.map((m: HcpMaterial) => ({
        hcp_uuid: m.id,
        hcp_type: "material" as const,
        display_name: m.name || "Unnamed Material",
        description: m.description || null,
        unit_price: m.price != null ? m.price / 100 : null, // HCP uses cents
        cost: m.cost != null ? m.cost / 100 : null,
        taxable: m.taxable ?? true,
        unit_of_measure: m.unit_of_measure || null,
        part_number: m.part_number || null,
        hcp_category_uuid: m.category?.id || null,
        hcp_category_name: m.category?.name || null,
        category: "material", // default — admin recategorizes later
        is_active: m.active ?? true,
      }));

      const { error } = await serviceClient
        .from("pricebook_items")
        .upsert(materialRows, { onConflict: "hcp_uuid" });

      if (error) {
        console.error("[Pricebook Import] Material upsert error:", error);
        return NextResponse.json({ error: `Material upsert failed: ${error.message}` }, { status: 500 });
      }
      materialsImported = materialRows.length;
    }

    // Upsert services
    let servicesImported = 0;
    if (services.length > 0) {
      const serviceRows = services.map((s: HcpService) => ({
        hcp_uuid: s.id,
        hcp_type: "service" as const,
        display_name: s.name || "Unnamed Service",
        description: s.description || null,
        unit_price: s.price != null ? s.price / 100 : null,
        cost: s.cost != null ? s.cost / 100 : null,
        taxable: s.taxable ?? true,
        unit_of_measure: s.unit_of_measure || null,
        hcp_category_uuid: s.category?.id || null,
        hcp_category_name: s.category?.name || null,
        category: "labor", // default for services
        is_active: s.active ?? true,
      }));

      const { error } = await serviceClient
        .from("pricebook_items")
        .upsert(serviceRows, { onConflict: "hcp_uuid" });

      if (error) {
        console.error("[Pricebook Import] Service upsert error:", error);
        return NextResponse.json({ error: `Service upsert failed: ${error.message}` }, { status: 500 });
      }
      servicesImported = serviceRows.length;
    }

    console.log(`[Pricebook Import] Done: ${materialsImported} materials, ${servicesImported} services`);

    return NextResponse.json({
      success: true,
      materials_imported: materialsImported,
      services_imported: servicesImported,
    });
  } catch (err) {
    console.error("[Pricebook Import] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
