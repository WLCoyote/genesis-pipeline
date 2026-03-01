// Quote Builder — Shared Types

export interface PricebookItemSlim {
  id: string;
  display_name: string;
  spec_line: string | null;
  unit_price: number | null;
  cost: number | null;
  manufacturer: string | null;
  model_number: string | null;
  category: string;
  system_type: string | null;
  efficiency_rating: string | null;
  is_addon: boolean;
  addon_default_checked: boolean;
  unit_of_measure: string | null;
  hcp_type: string | null;
  is_favorite: boolean;
}

export interface FinancingPlanFull {
  id: string;
  plan_code: string;
  label: string;
  fee_pct: number;
  months: number;
  apr: number;
  is_default: boolean;
}

export interface LineItemForm {
  pricebook_item_id: string;
  display_name: string;
  spec_line: string | null;
  description: string | null;
  unit_price: number;
  quantity: number;
  is_addon: boolean;
  addon_default_checked: boolean;
  hcp_type: string | null;
  category: string;
  cost: number | null;
}

export interface TierForm {
  tier_number: number;
  tier_name: string;
  tagline: string;
  feature_bullets: string[];
  is_recommended: boolean;
  items: LineItemForm[];
}

export interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface UserSlim {
  id: string;
  name: string;
  role: string;
}

export interface TemplateTierData {
  id: string;
  tier_number: number;
  tier_name: string;
  tagline: string | null;
  feature_bullets: string[];
  is_recommended: boolean;
  image_url: string | null;
  quote_template_items?: Array<{
    pricebook_item_id: string;
    quantity: number;
    is_addon: boolean;
    addon_default_checked: boolean;
    sort_order: number;
    pricebook_items: PricebookItemSlim | null;
  }>;
}

export interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
  is_shared: boolean;
  quote_template_tiers: Array<{
    id: string;
    tier_number: number;
    tier_name: string;
    tagline: string | null;
    is_recommended: boolean;
    image_url: string | null;
  }>;
  users: { name: string }[] | { name: string } | null;
}

export interface DraftEstimate {
  id: string;
  estimate_number: string;
  hcp_estimate_id: string | null;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  assigned_to: string | null;
}

export interface QuoteBuilderProps {
  templates: TemplateData[];
  pricebookItems: PricebookItemSlim[];
  financingPlans: FinancingPlanFull[];
  users: UserSlim[];
  currentUserId: string;
  draftEstimate?: DraftEstimate | null;
}

export type BuilderStep = 1 | 2 | 3 | 4 | 5;

export interface TierTotals {
  equipmentTotal: number;
  addonTotal: number;
  total: number;
  itemCount: number;
}
