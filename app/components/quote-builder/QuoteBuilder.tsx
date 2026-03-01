"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  QuoteBuilderProps,
  BuilderStep,
  TierForm,
  CustomerResult,
  PricebookItemSlim,
  TemplateTierData,
  FinancingPlanFull,
} from "./types";
import { emptyTier, calculateTierTotals, formatCurrency } from "./utils";
import QuoteBuilderTopbar from "./QuoteBuilderTopbar";
import QuoteBuilderSteps from "./QuoteBuilderSteps";
import QuoteBuilderTotalsBar from "./QuoteBuilderTotalsBar";
import QuoteBuilderCustomerStep from "./QuoteBuilderCustomerStep";
import QuoteBuilderTiersStep from "./QuoteBuilderTiersStep";
import QuoteBuilderAddonsStep from "./QuoteBuilderAddonsStep";
import QuoteBuilderFinancingStep from "./QuoteBuilderFinancingStep";
import QuoteBuilderReviewStep from "./QuoteBuilderReviewStep";
import QuoteBuilderPricebookPanel from "./QuoteBuilderPricebookPanel";

// ---- Copy button with feedback ----

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`w-full px-4 py-2 text-white rounded-md text-sm font-medium ${
        copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {copied ? "Copied!" : "Copy Proposal Link"}
    </button>
  );
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

  // ---- Step navigation ----
  const [activeStep, setActiveStep] = useState<BuilderStep>(draftEstimate ? 2 : 1);

  // ---- Customer state ----
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

  // ---- Template state ----
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // ---- Tier state (reconstruct from draft if available) ----
  const [tiers, setTiers] = useState<TierForm[]>(() => {
    if (draftEstimate?.line_items && draftEstimate.line_items.length > 0) {
      const newTiers: TierForm[] = [emptyTier(1), emptyTier(2), emptyTier(3)];
      const meta = draftEstimate.tier_metadata;

      // Apply tier metadata
      if (meta) {
        for (const m of meta) {
          const idx = m.tier_number - 1;
          if (idx >= 0 && idx < 3) {
            newTiers[idx].tier_name = m.tier_name;
            newTiers[idx].tagline = m.tagline;
            newTiers[idx].feature_bullets = m.feature_bullets || [];
            newTiers[idx].is_recommended = m.is_recommended;
          }
        }
      }

      // Group line items into tiers
      for (const li of draftEstimate.line_items) {
        const idx = li.option_group - 1;
        if (idx < 0 || idx >= 3) continue;

        // Look up cost from pricebook
        const pbItem = li.pricebook_item_id
          ? pricebookItems.find((p) => p.id === li.pricebook_item_id)
          : null;

        newTiers[idx].items.push({
          pricebook_item_id: li.pricebook_item_id || `manual-${li.display_name}`,
          display_name: li.display_name,
          spec_line: li.spec_line,
          description: li.description,
          unit_price: li.unit_price,
          quantity: li.quantity,
          is_addon: li.is_addon,
          addon_default_checked: li.is_selected,
          hcp_type: pbItem?.hcp_type ?? null,
          category: li.category || pbItem?.category || "equipment",
          cost: pbItem?.cost ?? null,
        });
      }

      // Sort items by sort_order
      for (const tier of newTiers) {
        tier.items.sort((a, b) => {
          const aIdx = draftEstimate.line_items!.findIndex(
            (li) => (li.pricebook_item_id || li.display_name) === a.pricebook_item_id
          );
          const bIdx = draftEstimate.line_items!.findIndex(
            (li) => (li.pricebook_item_id || li.display_name) === b.pricebook_item_id
          );
          return aIdx - bIdx;
        });
      }

      return newTiers;
    }
    return [emptyTier(1), emptyTier(2), emptyTier(3)];
  });

  // ---- Pricebook panel state ----
  const [targetTier, setTargetTier] = useState<1 | 2 | 3>(2);
  const [pricebookSearch, setPricebookSearch] = useState("");
  const [pricebookCategoryFilter, setPricebookCategoryFilter] = useState("all");

  // ---- Assignment ----
  const [assignedTo, setAssignedTo] = useState(draftEstimate?.assigned_to || currentUserId);

  // ---- Financing ----
  const defaultPlan = financingPlans.find((p) => p.is_default) || financingPlans[0] || null;
  const [selectedFinancingPlanId, setSelectedFinancingPlanId] = useState<string | null>(
    draftEstimate?.selected_financing_plan_id || defaultPlan?.id || null
  );
  const selectedFinancingPlan = useMemo(
    () => financingPlans.find((p) => p.id === selectedFinancingPlanId) || null,
    [financingPlans, selectedFinancingPlanId]
  );

  // ---- Tax ----
  const [includeTax, setIncludeTax] = useState(draftEstimate?.include_tax ?? false);
  const [taxRate, setTaxRate] = useState<number | null>(draftEstimate?.tax_rate ?? null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);

  // ---- Submission ----
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(draftEstimate?.id || null);
  const [proposalToken, setProposalToken] = useState<string | null>(draftEstimate?.proposal_token || null);
  const [createdEstimate, setCreatedEstimate] = useState<{
    estimate_id: string;
    estimate_number: string;
    proposal_url: string;
  } | null>(null);

  // ---- Customer actions ----

  const selectCustomer = (cust: CustomerResult) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerEmail(cust.email || "");
    setCustomerPhone(cust.phone || "");
    setCustomerAddress(cust.address || "");
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

  // ---- Tax Lookup ----

  const lookupTax = useCallback(async (address: string) => {
    if (!address.trim()) return;
    setTaxLoading(true);
    setTaxError(null);
    try {
      const res = await fetch(`/api/tax/lookup?address=${encodeURIComponent(address.trim())}`);
      const data = await res.json();
      if (res.ok && data.rate != null) {
        setTaxRate(data.rate);
      } else {
        setTaxError(data.error || "Tax lookup failed");
      }
    } catch {
      setTaxError("Tax lookup failed");
    } finally {
      setTaxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (includeTax && customerAddress.trim() && taxRate === null && !taxLoading) {
      lookupTax(customerAddress);
    }
  }, [includeTax, customerAddress, taxRate, taxLoading, lookupTax]);

  // ---- Template loading ----

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
        setActiveStep(2);
      } catch {
        setError("Failed to load template");
      }
    },
    []
  );

  // ---- Tier item management ----

  const addItemToTier = useCallback(
    (tierNumber: number, pbItem: PricebookItemSlim, quantity: number = 1) => {
      setTiers((prev) =>
        prev.map((tier) => {
          if (tier.tier_number !== tierNumber) return tier;
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
    },
    []
  );

  const removeItemFromTier = useCallback(
    (tierNumber: number, pbItemId: string) => {
      setTiers((prev) =>
        prev.map((tier) => {
          if (tier.tier_number !== tierNumber) return tier;
          return { ...tier, items: tier.items.filter((i) => i.pricebook_item_id !== pbItemId) };
        })
      );
    },
    []
  );

  const updateItemQuantity = useCallback(
    (tierNumber: number, pbItemId: string, quantity: number) => {
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
    },
    []
  );

  const updateItemPrice = useCallback(
    (tierNumber: number, pbItemId: string, unitPrice: number) => {
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
    },
    []
  );

  const toggleAddon = useCallback(
    (tierNumber: number, pbItemId: string, checked: boolean) => {
      setTiers((prev) =>
        prev.map((tier) => {
          if (tier.tier_number !== tierNumber) return tier;
          return {
            ...tier,
            items: tier.items.map((i) =>
              i.pricebook_item_id === pbItemId ? { ...i, addon_default_checked: checked } : i
            ),
          };
        })
      );
    },
    []
  );

  const updateTierField = useCallback(
    (tierNumber: number, field: keyof TierForm, value: unknown) => {
      setTiers((prev) =>
        prev.map((tier) =>
          tier.tier_number === tierNumber ? { ...tier, [field]: value } : tier
        )
      );
    },
    []
  );

  const setRecommended = useCallback((tierNumber: number) => {
    setTiers((prev) =>
      prev.map((tier) => ({ ...tier, is_recommended: tier.tier_number === tierNumber }))
    );
  }, []);

  // ---- Calculated values ----

  const tierTotals = useMemo(() => calculateTierTotals(tiers), [tiers]);

  const completedSteps = useMemo(() => {
    const steps = new Set<number>();
    if (customerName.trim()) steps.add(1);
    if (tiers.some((t) => t.items.length > 0)) steps.add(2);
    // Add-ons are optional — mark done if step 2 is done
    if (steps.has(2)) steps.add(3);
    // Financing is optional — always "done"
    steps.add(4);
    return steps;
  }, [customerName, tiers]);

  const canSend = useMemo(() => {
    if (!customerName.trim()) return false;
    return tiers.some((t) => t.items.length > 0);
  }, [customerName, tiers]);

  // ---- Save Draft ----

  const handleSaveDraft = async () => {
    if (draftSaving || !customerName.trim()) return;
    setDraftSaving(true);
    setDraftSaved(false);
    setError(null);
    try {
      const payload = {
        existing_estimate_id: savedEstimateId,
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        assigned_to: assignedTo,
        template_id: selectedTemplateId,
        tax_rate: includeTax && taxRate !== null ? taxRate : null,
        selected_financing_plan_id: selectedFinancingPlanId,
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

      const res = await fetch("/api/quotes/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save draft");
        return;
      }
      setSavedEstimateId(data.estimate_id);
      if (data.proposal_token) setProposalToken(data.proposal_token);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setDraftSaving(false);
    }
  };

  // ---- Preview ----

  const handlePreview = async () => {
    // Save draft first (always — to persist latest changes + get proposal_token)
    await handleSaveDraft();
  };

  // Open preview after draft save succeeds and we have a proposal token
  // This is handled via useEffect to capture the updated proposalToken state
  const [pendingPreview, setPendingPreview] = useState(false);

  const handlePreviewClick = async () => {
    setPendingPreview(true);
    await handlePreview();
  };

  useEffect(() => {
    if (pendingPreview && proposalToken) {
      setPendingPreview(false);
      window.open(`/proposals/${proposalToken}`, "_blank");
    }
  }, [pendingPreview, proposalToken]);

  // ---- Submit (Send to Customer) ----

  const handleSubmit = async () => {
    if (!canSend || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        existing_estimate_id: savedEstimateId || draftEstimate?.id || null,
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        assigned_to: assignedTo,
        template_id: selectedTemplateId,
        tax_rate: includeTax && taxRate !== null ? taxRate : null,
        selected_financing_plan_id: selectedFinancingPlanId,
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-lg w-full text-center">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8">
            <div className="text-4xl mb-4">✓</div>
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
              <CopyButton url={`${window.location.origin}${createdEstimate.proposal_url}`} />
              <button
                onClick={() => router.push(`/dashboard/estimates/${createdEstimate.estimate_id}`)}
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
                  setSavedEstimateId(null);
                  setActiveStep(1);
                }}
                className="w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                Create Another Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Layout ----

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-7 py-2 text-sm shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <QuoteBuilderTopbar
        estimateNumber={draftEstimate?.estimate_number || null}
        users={users}
        assignedTo={assignedTo}
        onAssignedToChange={setAssignedTo}
        onSaveDraft={handleSaveDraft}
        onPreview={handlePreviewClick}
        onSend={handleSubmit}
        draftSaving={draftSaving}
        draftSaved={draftSaved}
        saving={saving}
        canSend={canSend}
      />

      <QuoteBuilderSteps
        activeStep={activeStep}
        completedSteps={completedSteps}
        onStepClick={setActiveStep}
      />

      <QuoteBuilderTotalsBar
        tiers={tiers}
        tierTotals={tierTotals}
        selectedFinancingPlan={selectedFinancingPlan}
        includeTax={includeTax}
        taxRate={taxRate}
        onSend={handleSubmit}
        saving={saving}
        canSend={canSend}
      />

      {/* Builder body: left panel + right pricebook */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeStep === 1 && (
            <QuoteBuilderCustomerStep
              selectedCustomer={selectedCustomer}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              isNewCustomer={isNewCustomer}
              onSelectCustomer={selectCustomer}
              onClearCustomer={clearCustomer}
              onSetNewCustomer={() => setIsNewCustomer(true)}
              onCustomerNameChange={setCustomerName}
              onCustomerEmailChange={setCustomerEmail}
              onCustomerPhoneChange={setCustomerPhone}
              onCustomerAddressChange={setCustomerAddress}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onLoadTemplate={loadTemplate}
              onClearTemplate={() => {
                setSelectedTemplateId(null);
                setTiers([emptyTier(1), emptyTier(2), emptyTier(3)]);
              }}
            />
          )}

          {activeStep === 2 && (
            <QuoteBuilderTiersStep
              tiers={tiers}
              tierTotals={tierTotals}
              targetTier={targetTier}
              selectedFinancingPlan={selectedFinancingPlan}
              includeTax={includeTax}
              taxRate={taxRate}
              onSetTargetTier={setTargetTier}
              onRemoveItem={removeItemFromTier}
              onToggleAddon={toggleAddon}
              onUpdateTierField={updateTierField}
              onSetRecommended={setRecommended}
              onUpdateItemQuantity={updateItemQuantity}
              onUpdateItemPrice={updateItemPrice}
              onToggleTax={setIncludeTax}
            />
          )}

          {activeStep === 3 && (
            <QuoteBuilderAddonsStep
              tiers={tiers}
              pricebookItems={pricebookItems}
              onToggleAddon={toggleAddon}
              onAddItem={addItemToTier}
              onRemoveItem={removeItemFromTier}
            />
          )}

          {activeStep === 4 && (
            <QuoteBuilderFinancingStep
              financingPlans={financingPlans}
              selectedFinancingPlanId={selectedFinancingPlanId}
              onSelectPlan={setSelectedFinancingPlanId}
              includeTax={includeTax}
              taxRate={taxRate}
              taxLoading={taxLoading}
              taxError={taxError}
              customerAddress={customerAddress}
              onToggleTax={setIncludeTax}
              onLookupTax={lookupTax}
              tiers={tiers}
              tierTotals={tierTotals}
            />
          )}

          {activeStep === 5 && (
            <QuoteBuilderReviewStep
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              tiers={tiers}
              tierTotals={tierTotals}
              selectedFinancingPlan={selectedFinancingPlan}
              includeTax={includeTax}
              taxRate={taxRate}
              assignedTo={assignedTo}
              users={users}
              onSubmit={handleSubmit}
              saving={saving}
              canSend={canSend}
            />
          )}
        </div>

        {/* Right panel — Pricebook (visible on steps 2-5) */}
        {activeStep >= 2 && (
          <QuoteBuilderPricebookPanel
            pricebookItems={pricebookItems}
            search={pricebookSearch}
            onSearchChange={setPricebookSearch}
            categoryFilter={pricebookCategoryFilter}
            onCategoryFilterChange={setPricebookCategoryFilter}
            targetTier={targetTier}
            onTargetTierChange={setTargetTier}
            tiers={tiers}
            onAddItem={addItemToTier}
          />
        )}
      </div>
    </div>
  );
}
