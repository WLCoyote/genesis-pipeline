/**
 * HCP Pricebook API client
 *
 * Handles all Housecall Pro pricebook API calls (materials + services).
 *
 * HCP pricebook endpoints:
 *   GET  /api/price_book/material_categories — list categories
 *   GET  /api/price_book/material_categories/{uuid}/materials — list materials in category
 *   POST /api/price_book/materials — create material
 *   PUT  /api/price_book/materials/{uuid} — update material
 *   GET  /api/price_book/services — list services
 *
 * Materials MUST be fetched per-category (no "list all" endpoint).
 */

// ---------- HCP response types (match actual HCP schema) ----------

export interface HcpMaterialCategory {
  uuid: string;
  parent_uuid: string | null;
  name: string;
  image: string | null;
}

export interface HcpMaterial {
  uuid: string;
  name: string;
  description: string | null;
  price: number; // cents
  cost: number; // cents
  taxable: boolean;
  unit_of_measure: string | null;
  part_number: string | null;
  material_category_uuid: string | null;
  material_category_name: string | null;
  flat_rate_enabled: boolean;
  image: string | null;
}

export interface HcpService {
  uuid: string;
  name: string;
  description: string | null;
  price: number; // cents
  cost: number; // cents
  taxable: boolean;
  unit_of_measure: string | null;
  category: { id: number; name: string } | null;
}

// ---------- Helpers ----------

function getHcpConfig() {
  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;
  if (!hcpBase || !hcpToken) {
    throw new Error("HCP API not configured (HCP_API_BASE_URL / HCP_BEARER_TOKEN)");
  }
  return { hcpBase, hcpToken };
}

function hcpHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const FETCH_TIMEOUT = 30_000;
const MAX_PAGES = 20;

// ---------- Material Categories ----------

async function fetchMaterialCategories(): Promise<HcpMaterialCategory[]> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpMaterialCategory[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${hcpBase}/api/price_book/material_categories?page=${page}`,
      { headers: hcpHeaders(hcpToken), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP material_categories API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const items = (data.data || []) as HcpMaterialCategory[];
    all.push(...items);
    console.log(`[HCP Pricebook] Categories page ${page}: ${items.length} categories`);

    // Check if there are more pages
    const totalPages = data.total_pages || 1;
    hasMore = page < totalPages;
    page++;
  }

  console.log(`[HCP Pricebook] Total categories: ${all.length}`);
  return all;
}

// ---------- Materials ----------

export async function fetchAllHcpMaterials(): Promise<HcpMaterial[]> {
  // Step 1: Get all material categories
  const categories = await fetchMaterialCategories();

  if (categories.length === 0) {
    console.log("[HCP Pricebook] No material categories found");
    return [];
  }

  // Step 2: Fetch materials from each category
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpMaterial[] = [];

  for (const cat of categories) {
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(
        `${hcpBase}/api/price_book/material_categories/${cat.uuid}/materials?page=${page}`,
        { headers: hcpHeaders(hcpToken), signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        console.error(`[HCP Pricebook] Materials for category ${cat.name} (${cat.uuid}) failed: ${res.status} ${body}`);
        break;
      }

      const data = await res.json();
      const items = (data.data || []) as HcpMaterial[];
      all.push(...items);

      const totalPages = data.total_pages || 1;
      hasMore = page < totalPages;
      page++;
    }

    console.log(`[HCP Pricebook] Category "${cat.name}": fetched materials (total so far: ${all.length})`);
  }

  console.log(`[HCP Pricebook] Total materials: ${all.length}`);
  return all;
}

export async function createHcpMaterial(
  material: { name: string; description?: string; price: number; cost?: number; taxable?: boolean; unit_of_measure?: string; part_number?: string }
): Promise<HcpMaterial> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(`${hcpBase}/api/price_book/materials`, {
    method: "POST",
    headers: hcpHeaders(hcpToken),
    body: JSON.stringify(material),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP create material ${res.status}: ${body}`);
  }

  return await res.json();
}

export async function updateHcpMaterial(
  uuid: string,
  updates: { name?: string; description?: string; price?: number; cost?: number; taxable?: boolean; unit_of_measure?: string; part_number?: string }
): Promise<HcpMaterial> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(`${hcpBase}/api/price_book/materials/${uuid}`, {
    method: "PUT",
    headers: hcpHeaders(hcpToken),
    body: JSON.stringify(updates),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP update material ${res.status}: ${body}`);
  }

  return await res.json();
}

// ---------- Services (read-only) ----------

export async function fetchAllHcpServices(): Promise<HcpService[]> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpService[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${hcpBase}/api/price_book/services?page=${page}`,
      { headers: hcpHeaders(hcpToken), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP services API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const items = (data.data || []) as HcpService[];
    all.push(...items);

    const totalPages = data.total_pages || 1;
    hasMore = page < totalPages;
    page++;
  }

  console.log(`[HCP Pricebook] Total services: ${all.length}`);
  return all;
}
