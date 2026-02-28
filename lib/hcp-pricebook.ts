/**
 * HCP Pricebook API client
 *
 * Handles all Housecall Pro pricebook API calls (materials + services).
 * Follows the same env var / auth / pagination pattern as lib/hcp-polling.ts.
 *
 * HCP API coverage:
 *   Materials — GET (list), POST (create), PUT (update)
 *   Services  — GET (list) only (read-only in HCP API)
 */

// ---------- HCP response types ----------

export interface HcpMaterial {
  id: string;
  name: string;
  description: string | null;
  price: number; // cents
  cost: number; // cents
  taxable: boolean;
  active: boolean;
  unit_of_measure: string | null;
  part_number: string | null;
  category: { id: string; name: string } | null;
}

export interface HcpService {
  id: string;
  name: string;
  description: string | null;
  price: number; // cents
  cost: number; // cents
  taxable: boolean;
  active: boolean;
  unit_of_measure: string | null;
  category: { id: string; name: string } | null;
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
const MAX_PAGES = 20; // pricebook can be large

// ---------- Materials ----------

export async function fetchAllHcpMaterials(): Promise<HcpMaterial[]> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const all: HcpMaterial[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${hcpBase}/api/price_book/materials?page=${page}&page_size=200`,
      { headers: hcpHeaders(hcpToken), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP materials API ${res.status}: ${body}`);
    }

    const data = await res.json();
    totalPages = data.total_pages || 1;
    const items = (data.materials || []) as HcpMaterial[];
    all.push(...items);
    console.log(`[HCP Pricebook] Materials page ${page}/${totalPages}: ${items.length} items`);
    page++;
  }

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
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${hcpBase}/api/price_book/services?page=${page}&page_size=200`,
      { headers: hcpHeaders(hcpToken), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HCP services API ${res.status}: ${body}`);
    }

    const data = await res.json();
    totalPages = data.total_pages || 1;
    const items = (data.services || []) as HcpService[];
    all.push(...items);
    console.log(`[HCP Pricebook] Services page ${page}/${totalPages}: ${items.length} items`);
    page++;
  }

  return all;
}
