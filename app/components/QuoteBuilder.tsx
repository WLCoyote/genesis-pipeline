"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// ---- Slim types (only what we need from server props) ----

interface PricebookItemSlim {
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
}

interface TemplateTierData {
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

interface TemplateData {
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

interface UserSlim {
  id: string;
  name: string;
  role: string;
}

interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface FinancingPlanSlim {
  id: string;
  plan_code: string;
  label: string;
}

// ---- Form state types ----

interface LineItemForm {
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

interface TierForm {
  tier_number: number;
  tier_name: string;
  tagline: string;
  feature_bullets: string[];
  is_recommended: boolean;
  items: LineItemForm[];
}

// ---- Props ----

interface DraftEstimate {
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

interface QuoteBuilderProps {
  templates: TemplateData[];
  pricebookItems: PricebookItemSlim[];
  financingPlans: FinancingPlanSlim[];
  users: UserSlim[];
  currentUserId: string;
  draftEstimate?: DraftEstimate | null;
}

// ---- Helpers ----

const DEFAULT_TIER_NAMES = ["Standard Comfort", "Enhanced Efficiency", "Premium Performance"];

function emptyTier(tierNumber: number): TierForm {
  return {
    tier_number: tierNumber,
    tier_name: DEFAULT_TIER_NAMES[tierNumber - 1] || `Tier ${tierNumber}`,
    tagline: "",
    feature_bullets: [],
    is_recommended: tierNumber === 2,
    items: [],
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---- Main Component ----

export default function QuoteBuilder({
  templates,
  pricebookItems,
  financingPlans,
  users,
  currentUserId,
  draftEstimate,
}: QuoteBuilderProps) {
  const router = useRouter();

  // Customer state — pre-fill from draft estimate if present
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(
    draftEstimate
      ? {
          id: draftEstimate.customer_id,
          name: draftEstimate.customer_name,
          email: draftEstimate.customer_email,
          phone: draftEstimate.customer_phone,
          address: draftEstimate.customer_address,
        }
      : null
  );
  const [customerName, setCustomerName] = useState(draftEstimate?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(draftEstimate?.customer_email || "");
  const [customerPhone, setCustomerPhone] = useState(draftEstimate?.customer_phone || "");
  const [customerAddress, setCustomerAddress] = useState(draftEstimate?.customer_address || "");
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateSystemFilter, setTemplateSystemFilter] = useState("");

  // Tier state
  const [tiers, setTiers] = useState<TierForm[]>([
    emptyTier(1),
    emptyTier(2),
    emptyTier(3),
  ]);
  const [activeTierTab, setActiveTierTab] = useState(1);

  // Item picker state (per tier)
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("");
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [pickerQuantities, setPickerQuantities] = useState<Record<string, number>>({});

  // Assignment & options
  const [assignedTo, setAssignedTo] = useState(draftEstimate?.assigned_to || currentUserId);

  // Submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEstimate, setCreatedEstimate] = useState<{
    estimate_id: string;
    estimate_number: string;
    proposal_url: string;
  } | null>(null);

  // ---- Customer Search ----

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCustomerResults(data.customers || []);
    } catch {
      setCustomerResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim().length >= 2 && !selectedCustomer) {
        searchCustomers(customerSearch.trim());
      } else {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer, searchCustomers]);

  const selectCustomer = (cust: CustomerResult) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerEmail(cust.email || "");
    setCustomerPhone(cust.phone || "");
    setCustomerAddress(cust.address || "");
    setCustomerSearch("");
    setCustomerResults([]);
    setIsNewCustomer(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setIsNewCustomer(false);
  };

  // ---- Template Selection ----

  const systemTypes = useMemo(() => {
    const types = new Set<string>();
    templates.forEach((t) => {
      if (t.system_type) types.add(t.system_type);
    });
    return Array.from(types).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (templateSystemFilter && t.system_type !== templateSystemFilter) return false;
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.description?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [templates, templateSearch, templateSystemFilter]);

  const loadTemplate = useCallback(
    async (templateId: string) => {
      try {
        const res = await fetch(`/api/admin/quote-templates/${templateId}`);
        const data = await res.json();
        if (!data.template) return;

        const tmpl = data.template;
        const newTiers: TierForm[] = [emptyTier(1), emptyTier(2), emptyTier(3)];

        for (const tier of tmpl.quote_template_tiers || []) {
          const t = tier as TemplateTierData;
          const idx = t.tier_number - 1;
          if (idx < 0 || idx > 2) continue;

          newTiers[idx] = {
            tier_number: t.tier_number,
            tier_name: t.tier_name,
            tagline: t.tagline || "",
            feature_bullets: t.feature_bullets || [],
            is_recommended: t.is_recommended,
            items: (t.quote_template_items || []).map((item) => {
              const pb = item.pricebook_items;
              return {
                pricebook_item_id: item.pricebook_item_id,
                display_name: pb?.display_name || "Unknown Item",
                spec_line: pb?.spec_line || null,
                description: null,
                unit_price: pb?.unit_price ?? 0,
                quantity: item.quantity,
                is_addon: item.is_addon,
                addon_default_checked: item.addon_default_checked,
                hcp_type: pb?.hcp_type ?? null,
                category: pb?.category || "equipment",
                cost: pb?.cost ?? null,
              };
            }),
          };
        }

        setTiers(newTiers);
        setSelectedTemplateId(templateId);
        setActiveTierTab(1);
      } catch {
        setError("Failed to load template");
      }
    },
    []
  );

  // ---- Tier Item Management ----

  const addItemToTier = (tierNumber: number, pbItem: PricebookItemSlim, quantity: number = 1) => {
    setTiers((prev) =>
      prev.map((tier) => {
        if (tier.tier_number !== tierNumber) return tier;
        // Don't add duplicates
        if (tier.items.some((i) => i.pricebook_item_id === pbItem.id)) return tier;
        return {
          ...tier,
          items: [
            ...tier.items,
            {
              pricebook_item_id: pbItem.id,
              display_name: pbItem.display_name,
              spec_line: pbItem.spec_line,
              description: null,
              unit_price: pbItem.unit_price ?? 0,
              quantity,
              is_addon: pbItem.is_addon,
              addon_default_checked: pbItem.addon_default_checked,
              hcp_type: pbItem.hcp_type,
              category: pbItem.category,
              cost: pbItem.cost,
            },
          ],
        };
      })
    );
  };

  const removeItemFromTier = (tierNumber: number, pbItemId: string) => {
    setTiers((prev) =>
      prev.map((tier) => {
        if (tier.tier_number !== tierNumber) return tier;
        return {
          ...tier,
          items: tier.items.filter((i) => i.pricebook_item_id !== pbItemId),
        };
      })
    );
  };

  const updateItemQuantity = (
    tierNumber: number,
    pbItemId: string,
    quantity: number
  ) => {
    setTiers((prev) =>
      prev.map((tier) => {
        if (tier.tier_number !== tierNumber) return tier;
        return {
          ...tier,
          items: tier.items.map((i) =>
            i.pricebook_item_id === pbItemId ? { ...i, quantity } : i
          ),
        };
      })
    );
  };

  const updateItemPrice = (
    tierNumber: number,
    pbItemId: string,
    unitPrice: number
  ) => {
    setTiers((prev) =>
      prev.map((tier) => {
        if (tier.tier_number !== tierNumber) return tier;
        return {
          ...tier,
          items: tier.items.map((i) =>
            i.pricebook_item_id === pbItemId ? { ...i, unit_price: unitPrice } : i
          ),
        };
      })
    );
  };

  const updateTierField = (
    tierNumber: number,
    field: keyof TierForm,
    value: unknown
  ) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.tier_number === tierNumber ? { ...tier, [field]: value } : tier
      )
    );
  };

  const setRecommended = (tierNumber: number) => {
    setTiers((prev) =>
      prev.map((tier) => ({
        ...tier,
        is_recommended: tier.tier_number === tierNumber,
      }))
    );
  };

  // ---- Pricebook item filtering ----

  const categories = useMemo(() => {
    const cats = new Set<string>();
    pricebookItems.forEach((item) => cats.add(item.category));
    return Array.from(cats).sort();
  }, [pricebookItems]);

  const filteredPricebookItems = useMemo(() => {
    return pricebookItems.filter((item) => {
      if (showAddonPicker && !item.is_addon) return false;
      if (!showAddonPicker && item.is_addon) return false;
      if (itemCategoryFilter && item.category !== itemCategoryFilter) return false;
      if (itemSearch) {
        const q = itemSearch.toLowerCase();
        if (
          !item.display_name.toLowerCase().includes(q) &&
          !item.manufacturer?.toLowerCase().includes(q) &&
          !item.model_number?.toLowerCase().includes(q) &&
          !item.spec_line?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [pricebookItems, itemSearch, itemCategoryFilter, showAddonPicker]);

  // ---- Tier totals ----

  const tierTotals = useMemo(() => {
    return tiers.map((tier) => {
      const equipmentTotal = tier.items
        .filter((i) => !i.is_addon)
        .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      const addonTotal = tier.items
        .filter((i) => i.is_addon && i.addon_default_checked)
        .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      return { equipmentTotal, addonTotal, total: equipmentTotal + addonTotal };
    });
  }, [tiers]);

  // ---- Submit ----

  const canSubmit = useMemo(() => {
    if (!customerName.trim()) return false;
    // At least one tier must have items
    return tiers.some((t) => t.items.length > 0);
  }, [customerName, tiers]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        existing_estimate_id: draftEstimate?.id || null,
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        assigned_to: assignedTo,
        template_id: selectedTemplateId,
        tiers: tiers
          .filter((t) => t.items.length > 0)
          .map((tier) => ({
            tier_number: tier.tier_number,
            tier_name: tier.tier_name,
            tagline: tier.tagline,
            feature_bullets: tier.feature_bullets,
            is_recommended: tier.is_recommended,
            items: tier.items.map((item, idx) => ({
              pricebook_item_id: item.pricebook_item_id,
              display_name: item.display_name,
              spec_line: item.spec_line,
              description: item.description,
              unit_price: item.unit_price,
              cost: item.cost,
              quantity: item.quantity,
              is_addon: item.is_addon,
              addon_default_checked: item.addon_default_checked,
              hcp_type: item.hcp_type,
              category: item.category,
              sort_order: idx,
            })),
          })),
      };

      const res = await fetch("/api/quotes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create quote");
        return;
      }

      setCreatedEstimate({
        estimate_id: data.estimate_id,
        estimate_number: data.estimate_number,
        proposal_url: data.proposal_url,
      });
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  // ---- Success State ----

  if (createdEstimate) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8">
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Quote Created
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            {createdEstimate.estimate_number}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Proposal link ready to send
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}${createdEstimate.proposal_url}`
                );
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Copy Proposal Link
            </button>
            <button
              onClick={() =>
                router.push(`/dashboard/estimates/${createdEstimate.estimate_id}`)
              }
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
            >
              View Estimate
            </button>
            <button
              onClick={() => {
                setCreatedEstimate(null);
                clearCustomer();
                setTiers([emptyTier(1), emptyTier(2), emptyTier(3)]);
                setSelectedTemplateId(null);
                setActiveTierTab(1);
              }}
              className="w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              Create Another Quote
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Active tier ----
  const activeTier = tiers.find((t) => t.tier_number === activeTierTab) || tiers[0];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* ====== SECTION 1: Customer ====== */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Customer
        </h2>

        {!selectedCustomer && !isNewCustomer ? (
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              {searching && (
                <div className="absolute right-3 top-2.5 text-xs text-gray-400">
                  Searching...
                </div>
              )}
            </div>

            {customerResults.length > 0 && (
              <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                {customerResults.map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => selectCustomer(cust)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cust.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[cust.email, cust.phone, cust.address]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsNewCustomer(true)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + New Customer
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {selectedCustomer ? "Existing Customer" : "New Customer"}
              </span>
              <button
                onClick={clearCustomer}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Change
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ====== SECTION 2: Template Selector ====== */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Template
          </h2>
          {selectedTemplateId && (
            <button
              onClick={() => {
                setSelectedTemplateId(null);
                setTiers([emptyTier(1), emptyTier(2), emptyTier(3)]);
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear Template
            </button>
          )}
        </div>

        {selectedTemplateId ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            Template loaded — customize tiers below
          </p>
        ) : (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <select
                value={templateSystemFilter}
                onChange={(e) => setTemplateSystemFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">All Systems</option>
                {systemTypes.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {filteredTemplates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {templates.length === 0
                  ? "No templates yet — build from scratch below"
                  : "No templates match your search"}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl.id)}
                    className="text-left border border-gray-200 dark:border-gray-600 rounded-md p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tmpl.name}
                    </div>
                    {tmpl.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {tmpl.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {tmpl.system_type && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                          {tmpl.system_type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {tmpl.quote_template_tiers.length} tiers
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Or skip templates and add items directly below
            </p>
          </div>
        )}
      </section>

      {/* ====== SECTION 3: Tier Builder ====== */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Tiers
        </h2>

        {/* Tier tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          {tiers.map((tier) => (
            <button
              key={tier.tier_number}
              onClick={() => setActiveTierTab(tier.tier_number)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTierTab === tier.tier_number
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tier.tier_name}
              {tier.is_recommended && (
                <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
                  ★
                </span>
              )}
              <span className="ml-1.5 text-xs text-gray-400">
                ({tier.items.length})
              </span>
            </button>
          ))}
        </div>

        {/* Active tier config */}
        <div className="space-y-4">
          {/* Tier metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tier Name
              </label>
              <input
                type="text"
                value={activeTier.tier_name}
                onChange={(e) =>
                  updateTierField(activeTier.tier_number, "tier_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={activeTier.tagline}
                onChange={(e) =>
                  updateTierField(activeTier.tier_number, "tagline", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="recommended"
                  checked={activeTier.is_recommended}
                  onChange={() => setRecommended(activeTier.tier_number)}
                  className="text-blue-600"
                />
                Recommended
              </label>
            </div>
          </div>

          {/* Feature bullets */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Feature Bullets
            </label>
            <div className="space-y-1">
              {activeTier.feature_bullets.map((bullet, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => {
                      const newBullets = [...activeTier.feature_bullets];
                      newBullets[idx] = e.target.value;
                      updateTierField(
                        activeTier.tier_number,
                        "feature_bullets",
                        newBullets
                      );
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <button
                    onClick={() => {
                      const newBullets = activeTier.feature_bullets.filter(
                        (_, i) => i !== idx
                      );
                      updateTierField(
                        activeTier.tier_number,
                        "feature_bullets",
                        newBullets
                      );
                    }}
                    className="px-2 text-red-400 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  updateTierField(activeTier.tier_number, "feature_bullets", [
                    ...activeTier.feature_bullets,
                    "",
                  ])
                }
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add Bullet
              </button>
            </div>
          </div>

          {/* Tier items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Equipment & Line Items
              </h3>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(
                  tierTotals[activeTier.tier_number - 1]?.equipmentTotal || 0
                )}
              </span>
            </div>

            {activeTier.items.filter((i) => !i.is_addon).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                No items yet — add from the picker below
              </p>
            ) : (
              <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Item
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-20">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-28">
                        Price
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-24 text-right">
                        Total
                      </th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                    {activeTier.items
                      .filter((i) => !i.is_addon)
                      .map((item) => (
                        <tr key={item.pricebook_item_id}>
                          <td className="px-3 py-2">
                            <div className="text-gray-900 dark:text-gray-100">
                              {item.display_name}
                            </div>
                            {item.spec_line && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.spec_line}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(
                                  activeTier.tier_number,
                                  item.pricebook_item_id,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItemPrice(
                                  activeTier.tier_number,
                                  item.pricebook_item_id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() =>
                                removeItemFromTier(
                                  activeTier.tier_number,
                                  item.pricebook_item_id
                                )
                              }
                              className="text-red-400 hover:text-red-600 text-sm"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add-on items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add-Ons
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Pre-checked shown on proposal
              </span>
            </div>

            {activeTier.items.filter((i) => i.is_addon).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                No add-ons yet — switch to the Add-Ons tab in the picker below
              </p>
            ) : (
              <div className="space-y-1">
                {activeTier.items
                  .filter((i) => i.is_addon)
                  .map((item) => (
                    <div
                      key={item.pricebook_item_id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.addon_default_checked}
                          onChange={(e) => {
                            setTiers((prev) =>
                              prev.map((tier) => {
                                if (tier.tier_number !== activeTier.tier_number) return tier;
                                return {
                                  ...tier,
                                  items: tier.items.map((i) =>
                                    i.pricebook_item_id === item.pricebook_item_id
                                      ? { ...i, addon_default_checked: e.target.checked }
                                      : i
                                  ),
                                };
                              })
                            );
                          }}
                          className="rounded text-blue-600"
                        />
                        <div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {item.display_name}
                          </span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          removeItemFromTier(
                            activeTier.tier_number,
                            item.pricebook_item_id
                          )
                        }
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Item picker */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add Items from Pricebook
              </h3>
            </div>

            <div className="flex mb-3 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
              <button
                onClick={() => setShowAddonPicker(false)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  !showAddonPicker
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Equipment &amp; Line Items
              </button>
              <button
                onClick={() => setShowAddonPicker(true)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  showAddonPicker
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Add-Ons
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
              {filteredPricebookItems.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">
                  No items found
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                    {filteredPricebookItems.slice(0, 50).map((item) => {
                      const alreadyAdded = activeTier.items.some(
                        (i) => i.pricebook_item_id === item.id
                      );
                      return (
                        <tr
                          key={item.id}
                          className={
                            alreadyAdded
                              ? "bg-green-50/50 dark:bg-green-900/10"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          }
                        >
                          <td className="px-3 py-2">
                            <div className="text-gray-900 dark:text-gray-100">
                              {item.display_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {[item.manufacturer, item.model_number, item.spec_line]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {item.unit_price != null
                              ? formatCurrency(item.unit_price)
                              : "—"}
                          </td>
                          <td className="px-2 py-2 w-16">
                            {!alreadyAdded && (
                              <input
                                type="number"
                                min={1}
                                value={pickerQuantities[item.id] ?? 1}
                                onChange={(e) => setPickerQuantities(prev => ({
                                  ...prev,
                                  [item.id]: Math.max(1, parseInt(e.target.value) || 1)
                                }))}
                                className="w-14 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 w-16">
                            {alreadyAdded ? (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  addItemToTier(activeTier.tier_number, item, pickerQuantities[item.id] ?? 1)
                                }
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                + Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {filteredPricebookItems.length > 50 && (
              <p className="text-xs text-gray-400 mt-1">
                Showing first 50 of {filteredPricebookItems.length} items — refine your search
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ====== SECTION 4: Assignment ====== */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Assignment
        </h2>
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Assigned To
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ====== SECTION 5: Summary + Submit ====== */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {tiers.map((tier, idx) => (
            <div
              key={tier.tier_number}
              className={`border rounded-md p-4 ${
                tier.is_recommended
                  ? "border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                  : "border-gray-200 dark:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tier.tier_name}
                </span>
                {tier.is_recommended && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(tierTotals[idx]?.total || 0)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tier.items.filter((i) => !i.is_addon).length} items
                {tier.items.filter((i) => i.is_addon).length > 0 &&
                  ` + ${tier.items.filter((i) => i.is_addon).length} add-ons`}
              </div>
              {tierTotals[idx]?.addonTotal > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Includes {formatCurrency(tierTotals[idx].addonTotal)} in pre-checked add-ons
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {!customerName.trim() && "Enter customer name to continue"}
            {customerName.trim() &&
              !tiers.some((t) => t.items.length > 0) &&
              "Add items to at least one tier"}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className={`px-6 py-2.5 rounded-md text-sm font-medium ${
              canSubmit && !saving
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Creating..." : "Create Quote"}
          </button>
        </div>
      </section>
    </div>
  );
}
