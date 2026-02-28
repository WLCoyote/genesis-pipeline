/**
 * HCP Pricebook API client
 *
 * Handles all Housecall Pro pricebook API calls (materials + services).
 * Follows the same env var / auth pattern as lib/hcp-polling.ts.
 *
 * HCP API coverage:
 *   Materials — GET (list), POST (create), PUT (update)
 *   Services  — GET (list) only (read-only in HCP API)
 *
 * HCP pricebook endpoints: /api/price_book/materials, /api/price_book/services
 */

// ---------- HCP response types (match actual HCP schema) ----------

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

// ---------- Materials ----------

export async function fetchAllHcpMaterials(): Promise<HcpMaterial[]> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(
    `${hcpBase}/api/price_book/materials`,
    { headers: hcpHeaders(hcpToken), signal: controller.signal }
  );
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP materials API ${res.status}: ${body}`);
  }

  const data = await res.json();
  console.log(`[HCP Pricebook] Materials response keys:`, Object.keys(data));
  console.log(`[HCP Pricebook] Materials raw sample:`, JSON.stringify(data).slice(0, 500));

  // Try common HCP response shapes
  const items = (
    data.materials || data.price_book_materials || data.data || (Array.isArray(data) ? data : [])
  ) as HcpMaterial[];
  console.log(`[HCP Pricebook] Materials found: ${items.length}`);

  return items;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(
    `${hcpBase}/api/price_book/services`,
    { headers: hcpHeaders(hcpToken), signal: controller.signal }
  );
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP services API ${res.status}: ${body}`);
  }

  const data = await res.json();
  console.log(`[HCP Pricebook] Services response keys:`, Object.keys(data));
  console.log(`[HCP Pricebook] Services raw sample:`, JSON.stringify(data).slice(0, 500));

  const items = (
    data.services || data.price_book_services || data.data || (Array.isArray(data) ? data : [])
  ) as HcpService[];
  console.log(`[HCP Pricebook] Services found: ${items.length}`);

  return items;
}
