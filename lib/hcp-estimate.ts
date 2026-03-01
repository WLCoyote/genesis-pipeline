/**
 * HCP Estimate & Customer API client
 *
 * HCP endpoints (from housecall.v1.yaml):
 *   POST /customers              — create customer
 *   GET  /customers?q=           — search customers
 *   POST /estimates              — create estimate with options + line items
 *
 * Prices in cents. Addresses use E.164 phone format.
 */

// ---------- Types ----------

interface HcpCustomerAddress {
  id: string;
  street: string;
  street_line_2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface HcpCustomerResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile_number: string | null;
  addresses: HcpCustomerAddress[];
}

interface HcpEstimateResponse {
  id: string;
  estimate_number: number;
  options: Array<{
    id: string;
    name: string;
  }>;
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
    Accept: "application/json",
  };
}

const FETCH_TIMEOUT = 30_000;

/** Split a full name into first + last. */
function splitName(name: string): { first_name: string; last_name: string } {
  const trimmed = name.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { first_name: trimmed, last_name: "" };
  }
  return {
    first_name: trimmed.slice(0, spaceIdx),
    last_name: trimmed.slice(spaceIdx + 1),
  };
}

/** Parse a street address string into components (best-effort). */
function parseAddress(address: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  // Try to parse "123 Main St, City, ST 98272" format
  const parts = address.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].split(/\s+/);
    const state = stateZip[0] || "WA";
    const zip = stateZip[1] || "";
    return { street, city, state, zip };
  }

  if (parts.length === 2) {
    const street = parts[0];
    const stateZip = parts[1].split(/\s+/);
    return { street, city: "", state: stateZip[0] || "WA", zip: stateZip[1] || "" };
  }

  // Can't parse — use full string as street
  return { street: address, city: "", state: "WA", zip: "" };
}

// ---------- Customer ----------

export async function createHcpCustomer(customer: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}): Promise<HcpCustomerResponse> {
  const { hcpBase, hcpToken } = getHcpConfig();
  const { first_name, last_name } = splitName(customer.name);

  const payload: Record<string, unknown> = {
    first_name,
    last_name,
    notifications_enabled: true,
  };

  if (customer.email) payload.email = customer.email;
  if (customer.phone) payload.mobile_number = customer.phone;

  if (customer.address) {
    const parsed = parseAddress(customer.address);
    payload.addresses = [
      {
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        country: "US",
      },
    ];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(`${hcpBase}/customers`, {
    method: "POST",
    headers: hcpHeaders(hcpToken),
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP create customer ${res.status}: ${body}`);
  }

  return await res.json();
}

// ---------- Estimate ----------

export interface HcpLineItem {
  name: string;
  description?: string;
  unit_price: number; // cents
  unit_cost?: number; // cents
  quantity: number;
  taxable?: boolean;
}

export interface HcpOption {
  name: string;
  line_items: HcpLineItem[];
}

export async function createHcpEstimate(opts: {
  hcpCustomerId: string;
  hcpAddressId?: string | null;
  options: HcpOption[];
  note?: string;
  taxRate?: number | null;
}): Promise<HcpEstimateResponse> {
  const { hcpBase, hcpToken } = getHcpConfig();

  const payload: Record<string, unknown> = {
    customer_id: opts.hcpCustomerId,
    options: opts.options,
  };

  if (opts.hcpAddressId) payload.address_id = opts.hcpAddressId;
  if (opts.note) payload.note = opts.note;

  if (opts.taxRate != null && opts.taxRate > 0) {
    payload.tax = {
      taxable: true,
      tax_rate: opts.taxRate,
      tax_name: "Sales Tax",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(`${hcpBase}/estimates`, {
    method: "POST",
    headers: hcpHeaders(hcpToken),
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HCP create estimate ${res.status}: ${body}`);
  }

  return await res.json();
}

// ---------- High-level sync helper ----------

/**
 * Sync a Pipeline estimate + line items to HCP.
 * Creates customer + estimate in HCP, returns IDs.
 * Caller should store these on the Pipeline estimate.
 */
export async function syncEstimateToHcp(data: {
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    hcp_customer_id?: string | null;
  };
  tiers: Array<{
    tier_name: string;
    subtotal: number; // dollars — all non-addon items + checked addon items
    items: Array<{
      display_name: string;
      spec_line?: string | null;
      unit_price: number; // dollars
      cost?: number | null; // dollars
      quantity: number;
      is_addon: boolean;
      hcp_type?: string | null; // 'material' | 'service'
      category?: string | null; // equipment, labor, material, addon, service_plan
    }>;
  }>;
  financingPlan?: {
    label: string;
    fee_pct: number;
    months: number;
  } | null;
  taxRate?: number | null;
}): Promise<{
  hcp_customer_id: string;
  hcp_estimate_id: string;
  hcp_option_ids: string[];
}> {
  // 1. Create or reuse HCP customer
  let hcpCustomerId = data.customer.hcp_customer_id;
  let hcpAddressId: string | null = null;

  if (!hcpCustomerId) {
    const hcpCustomer = await createHcpCustomer({
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
      address: data.customer.address,
    });
    hcpCustomerId = hcpCustomer.id;
    if (hcpCustomer.addresses?.length > 0) {
      hcpAddressId = hcpCustomer.addresses[0].id;
    }
  }

  // 2. Build HCP options with structured line items
  //    Pattern: Summary service line item (full price) → labor at $0 → materials at $0 → addons at $0 → financing
  const options: HcpOption[] = data.tiers
    .filter((tier) => tier.items.length > 0)
    .map((tier) => {
      const line_items: HcpLineItem[] = [];

      // 1. Summary service line item with full tier price
      line_items.push({
        name: `Installation of ${tier.tier_name}`,
        description: "Complete installation package",
        unit_price: Math.round(tier.subtotal * 100), // dollars → cents
        quantity: 1,
        taxable: true,
      });

      // 2. Service/labor items at $0 (documentation)
      for (const item of tier.items.filter(
        (i) => !i.is_addon && (i.category === "labor" || i.hcp_type === "service")
      )) {
        line_items.push({
          name: item.display_name,
          description: item.spec_line || undefined,
          unit_price: 0,
          unit_cost: item.cost != null ? Math.round(item.cost * 100) : undefined,
          quantity: item.quantity,
          taxable: false,
        });
      }

      // 3. Equipment/material items at $0 (documentation)
      for (const item of tier.items.filter(
        (i) =>
          !i.is_addon && i.category !== "labor" && i.hcp_type !== "service"
      )) {
        line_items.push({
          name: item.display_name,
          description: item.spec_line || undefined,
          unit_price: 0,
          unit_cost: item.cost != null ? Math.round(item.cost * 100) : undefined,
          quantity: item.quantity,
          taxable: false,
        });
      }

      // 4. Checked add-on items at $0 (documentation)
      for (const item of tier.items.filter((i) => i.is_addon)) {
        line_items.push({
          name: item.display_name,
          description: item.spec_line || undefined,
          unit_price: 0,
          unit_cost: item.cost != null ? Math.round(item.cost * 100) : undefined,
          quantity: item.quantity,
          taxable: false,
        });
      }

      // 5. Financing reference line item
      if (data.financingPlan) {
        const originationFee = Math.round(
          tier.subtotal * data.financingPlan.fee_pct * 100
        ); // cents
        line_items.push({
          name: `Financing: ${data.financingPlan.label}`,
          description: `${data.financingPlan.months} months`,
          unit_price: 0,
          unit_cost: originationFee,
          quantity: 1,
          taxable: false,
        });
      }

      return { name: tier.tier_name, line_items };
    });

  if (options.length === 0) {
    throw new Error("Cannot sync to HCP: no tiers with items");
  }

  // 3. Create HCP estimate
  const hcpEstimate = await createHcpEstimate({
    hcpCustomerId,
    hcpAddressId,
    options,
    taxRate: data.taxRate,
  });

  return {
    hcp_customer_id: hcpCustomerId,
    hcp_estimate_id: hcpEstimate.id,
    hcp_option_ids: hcpEstimate.options.map((o) => o.id),
  };
}
