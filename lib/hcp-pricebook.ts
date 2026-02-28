/**
 * HCP Pricebook API client
 *
 * HCP pricebook endpoints (from housecall.v1.yaml):
 *   GET  /api/price_book/material_categories          — list categories (paginated, data[])
 *   GET  /api/price_book/materials?material_category_uuid=  — list materials in category (paginated, data[])
 *   POST /api/price_book/materials                    — create material (requires material_category_uuid in body)
 *   PUT  /api/price_book/materials/{uuid}             — update material
 *   GET  /api/price_book/services                     — list services (paginated, services[])
 *
 * Pagination: page (default 1), page_size (default 10), sort_by, sort_direction
 * Materials response: { data: [], page, page_size, total_pages_count, total_count }
 * Services response: { services: [] } (no pagination metadata in response)
 * Prices/costs in cents.
 */

// ---------- HCP response types (from housecall.v1.yaml) ----------

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

// ---------- HCP Description Builder ----------

/** Build a rich description for HCP from Pipeline item fields.
 *  Format: Description first, then spec details underneath. */
export function buildHcpDescription(item: {
  description?: string | null;
  manufacturer?: string | null;
  model_number?: string | null;
  system_type?: string | null;
  efficiency_rating?: string | null;
  refrigerant_type?: string | null;
  spec_line?: string | null;
}): string | undefined {
  const lines: string[] = [];

  // Description on top
  if (item.description) lines.push(item.description);

  // Spec details line: Manufacturer | System Type | Efficiency | Refrigerant
  const specParts = [
    item.manufacturer,
    item.model_number,
    item.system_type,
    item.efficiency_rating,
    item.refrigerant_type,
  ].filter(Boolean);
  if (specParts.length > 0) lines.push(specParts.join(" | "));

  // Spec line
  if (item.spec_line) lines.push(item.spec_line);

  return lines.length > 0 ? lines.join("\n") : undefined;
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
const MAX_PAGES = 50;
const PAGE_SIZE = 200;

// ---------- Material Categories ----------

async function fetchCategoriesAtLevel(parentUuid?: string): Promise<HcpMaterialCategory[]> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpMaterialCategory[] = [];
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let url = `${hcpBase}/api/price_book/material_categories?page=${page}&page_size=${PAGE_SIZE}`;
    if (parentUuid) url += `&parent_uuid=${parentUuid}`;

    const res = await fetch(url, {
      headers: hcpHeaders(hcpToken),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP material_categories API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const items = (data.data || []) as HcpMaterialCategory[];
    all.push(...items);

    if (all.length >= (data.total_count || 0) || items.length === 0 || page >= MAX_PAGES) break;
    page++;
  }

  return all;
}

// Recursively fetch all categories at every nesting level
async function fetchAllMaterialCategories(): Promise<HcpMaterialCategory[]> {
  const all: HcpMaterialCategory[] = [];

  // Start with root categories (no parent_uuid)
  const roots = await fetchCategoriesAtLevel();
  all.push(...roots);
  console.log(`[HCP Pricebook] Root categories: ${roots.length}`);

  // BFS through subcategories
  const queue = [...roots];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    const children = await fetchCategoriesAtLevel(parent.uuid);
    if (children.length > 0) {
      all.push(...children);
      queue.push(...children);
      console.log(`[HCP Pricebook] "${parent.name}" has ${children.length} subcategories`);
    }
  }

  console.log(`[HCP Pricebook] Total categories (all levels): ${all.length}`);
  return all;
}

// ---------- Materials ----------

export async function fetchAllHcpMaterials(): Promise<HcpMaterial[]> {
  // Step 1: Get all material categories (recursively, all nesting levels)
  const categories = await fetchAllMaterialCategories();

  if (categories.length === 0) {
    console.log("[HCP Pricebook] No material categories found");
    return [];
  }

  // Step 2: Fetch materials from each category using required query param
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpMaterial[] = [];

  for (const cat of categories) {
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(
        `${hcpBase}/api/price_book/materials?material_category_uuid=${cat.uuid}&page=${page}&page_size=${PAGE_SIZE}`,
        { headers: hcpHeaders(hcpToken), signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        console.error(`[HCP Pricebook] Materials for "${cat.name}" failed: ${res.status} ${body}`);
        break;
      }

      const data = await res.json();
      const items = (data.data || []) as HcpMaterial[];
      all.push(...items);

      const totalInCategory = data.total_count || 0;
      const fetchedInCategory = (page - 1) * PAGE_SIZE + items.length;

      if (fetchedInCategory >= totalInCategory || items.length === 0 || page >= MAX_PAGES) break;
      page++;
    }
  }

  console.log(`[HCP Pricebook] Total materials across all categories: ${all.length}`);
  return all;
}

export async function createHcpMaterial(
  material: { name: string; material_category_uuid?: string; description?: string; price: number; cost?: number; taxable?: boolean; unit_of_measure?: string; part_number?: string }
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

  // Services response has NO pagination metadata — stop when empty page
  while (page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${hcpBase}/api/price_book/services?page=${page}&page_size=${PAGE_SIZE}`,
      { headers: hcpHeaders(hcpToken), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP services API ${res.status}: ${body}`);
    }

    const data = await res.json();
    // Services use "services" key, NOT "data"
    const items = (data.services || data.data || []) as HcpService[];
    all.push(...items);
    console.log(`[HCP Pricebook] Services page ${page}: ${items.length} items`);

    if (items.length === 0) break;
    page++;
  }

  console.log(`[HCP Pricebook] Total services: ${all.length}`);
  return all;
}
