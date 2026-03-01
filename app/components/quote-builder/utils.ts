// Quote Builder — Shared Utilities

import type { TierForm, TierTotals, LineItemForm } from "./types";

// ---- Constants ----

export const DEFAULT_TIER_NAMES = [
  "Standard Comfort",
  "Enhanced Efficiency",
  "Premium Performance",
];

export const TIER_BADGES: Record<number, { icon: string; label: string; style: string }> = {
  1: { icon: "⚙", label: "Good", style: "standard" },
  2: { icon: "⭐", label: "Better", style: "enhanced" },
  3: { icon: "🔥", label: "Best", style: "premium" },
};

// Category display order, labels, and color dots for tier cards
export const CATEGORY_ORDER: Record<string, { order: number; label: string; dotColor: string }> = {
  labor:               { order: 1,  label: "Labor",              dotColor: "#6b7a99" },
  indoor:              { order: 2,  label: "Indoor",             dotColor: "#1565c0" },
  cased_coil:          { order: 3,  label: "Cased Coil",         dotColor: "#1565c0" },
  outdoor:             { order: 4,  label: "Outdoor",            dotColor: "#2e7d32" },
  material:            { order: 5,  label: "Materials",           dotColor: "#f9a825" },
  equipment:           { order: 6,  label: "Equipment",           dotColor: "#1565c0" },
  equipment_warranty:  { order: 7,  label: "Equipment Warranty",  dotColor: "#7b1fa2" },
  labor_warranty:      { order: 8,  label: "Labor Warranty",      dotColor: "#7b1fa2" },
  maintenance_plan:    { order: 9,  label: "Maintenance Plan",    dotColor: "#00897b" },
  addon:               { order: 10, label: "Add-On",             dotColor: "#e65100" },
  service_plan:        { order: 11, label: "Service Plan",        dotColor: "#00897b" },
  accessory:           { order: 12, label: "Accessory",           dotColor: "#f9a825" },
  electrical:          { order: 13, label: "Electrical",          dotColor: "#ffa726" },
  exclusion:           { order: 14, label: "Exclusion",           dotColor: "#ef5350" },
  controls:            { order: 15, label: "Controls",            dotColor: "#26c6da" },
  rebate:              { order: 16, label: "Rebate",              dotColor: "#4caf50" },
};

// Pricebook panel category tabs (condensed labels mapping to slugs)
export const CATEGORY_TABS = [
  { key: "all",       label: "All",       match: [] as string[] },
  { key: "labor",     label: "Labor",     match: ["labor"] },
  { key: "indoor",    label: "Indoor",    match: ["indoor"] },
  { key: "coil",      label: "Coil",      match: ["cased_coil"] },
  { key: "outdoor",   label: "Outdoor",   match: ["outdoor"] },
  { key: "materials", label: "Materials",  match: ["material", "equipment", "accessory"] },
  { key: "warranty",  label: "Warranty",   match: ["equipment_warranty", "labor_warranty"] },
  { key: "controls",  label: "Controls",  match: ["controls", "accessory"] },
  { key: "addons",    label: "Add-Ons",   match: ["addon", "service_plan", "maintenance_plan"] },
  { key: "other",     label: "Other",     match: ["electrical", "exclusion"] },
  { key: "rebates",   label: "Rebates",   match: ["rebate"] },
];

// ---- Helpers ----

export function emptyTier(tierNumber: number): TierForm {
  return {
    tier_number: tierNumber,
    tier_name: DEFAULT_TIER_NAMES[tierNumber - 1] || `Tier ${tierNumber}`,
    tagline: "",
    feature_bullets: [],
    is_recommended: tierNumber === 2,
    items: [],
    rebates: [],
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateMonthly(
  cashTotal: number,
  feePct: number,
  months: number
): number {
  if (!feePct || !months || cashTotal <= 0) return 0;
  const financed = cashTotal / (1 - feePct);
  return Math.round(financed / months);
}

export function calculateTierTotals(tiers: TierForm[]): TierTotals[] {
  return tiers.map((tier) => {
    const nonAddonItems = tier.items.filter((i) => !i.is_addon);
    const checkedAddons = tier.items.filter((i) => i.is_addon && i.addon_default_checked);
    const equipmentTotal = nonAddonItems.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0
    );
    const addonTotal = checkedAddons.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0
    );
    const rebateTotal = (tier.rebates || []).reduce(
      (sum, r) => sum + r.amount,
      0
    );
    return {
      equipmentTotal,
      addonTotal,
      total: Math.max(0, equipmentTotal + addonTotal - rebateTotal),
      itemCount: nonAddonItems.length + checkedAddons.length,
    };
  });
}

/** Calculate total cost for a tier (non-addon + checked addon items). */
export function calculateTierCost(tier: TierForm): number {
  return tier.items.reduce((sum, item) => {
    if (item.is_addon && !item.addon_default_checked) return sum;
    return sum + (item.cost ?? 0) * item.quantity;
  }, 0);
}

/**
 * Groups items by category and sorts groups by CATEGORY_ORDER.
 * Returns entries sorted by display order. Non-addon items only.
 */
export function groupItemsByCategory(
  items: LineItemForm[]
): Array<{ slug: string; label: string; dotColor: string; items: LineItemForm[] }> {
  const groups = new Map<string, LineItemForm[]>();

  for (const item of items) {
    if (item.is_addon) continue;
    const cat = item.category || "equipment";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  return [...groups.entries()]
    .sort(
      (a, b) =>
        (CATEGORY_ORDER[a[0]]?.order ?? 99) -
        (CATEGORY_ORDER[b[0]]?.order ?? 99)
    )
    .map(([slug, items]) => ({
      slug,
      label: CATEGORY_ORDER[slug]?.label ?? slug,
      dotColor: CATEGORY_ORDER[slug]?.dotColor ?? "#9ca3af",
      items,
    }));
}
