"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import ProposalHeader from "./ProposalHeader";
import TierCards, { type TierData } from "./TierCards";
import AddonCards, { type AddonData } from "./AddonCards";
import WhyGenesis from "./WhyGenesis";
import FinancingCalculator, {
  type FinancingPlanData,
} from "./FinancingCalculator";
import PaymentSchedule from "./PaymentSchedule";
import SignatureBlock from "./SignatureBlock";
import StickyBottomBar from "./StickyBottomBar";

interface ProposalPageProps {
  estimateNumber: string;
  customerName: string;
  customerAddress: string | null;
  technicianName: string;
  sentDate: string | null;
  taxRate: number | null;
  paymentScheduleType: string;
  tiers: TierData[];
  addons: AddonData[];
  financingPlans: FinancingPlanData[];
  reviews: Array<{ author: string; text: string; rating: number }>;
  companyStory: string;
  daysRemaining: number;
  proposalToken: string;
}

export default function ProposalPage({
  estimateNumber,
  customerName: initialCustomerName,
  customerAddress,
  technicianName,
  sentDate,
  taxRate,
  paymentScheduleType,
  tiers,
  addons,
  financingPlans,
  reviews,
  companyStory,
  daysRemaining,
  proposalToken,
}: ProposalPageProps) {
  // --- State ---
  const [selectedTier, setSelectedTier] = useState<number | null>(() => {
    // Auto-select recommended tier
    const recommended = tiers.find((t) => t.isRecommended);
    return recommended?.tierNumber ?? (tiers.length > 0 ? tiers[0].tierNumber : null);
  });

  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(() => {
    // Pre-check addons that were marked is_selected
    const preSelected = new Set<string>();
    for (const addon of addons) {
      if (addon.isSelected) preSelected.add(addon.id);
    }
    return preSelected;
  });

  const [selectedPlan, setSelectedPlan] = useState<FinancingPlanData | null>(
    () => financingPlans.find((p) => p.isDefault) || financingPlans[0] || null
  );

  const [customerNameInput, setCustomerNameInput] = useState(initialCustomerName);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sigSectionRef = useRef<HTMLDivElement>(null);

  // --- Derived values ---
  const selectedTierData = useMemo(
    () => tiers.find((t) => t.tierNumber === selectedTier) || null,
    [tiers, selectedTier]
  );

  const tierSubtotal = selectedTierData?.subtotal ?? 0;

  const addonTotal = useMemo(() => {
    let total = 0;
    for (const addon of addons) {
      if (selectedAddons.has(addon.id)) {
        total += addon.lineTotal;
      }
    }
    return total;
  }, [addons, selectedAddons]);

  const subtotal = tierSubtotal + addonTotal;
  const tax = taxRate != null ? Math.round(subtotal * taxRate * 100) / 100 : 0;
  const cashTotal = Math.round((subtotal + tax) * 100) / 100;

  // Financing: financed = total / (1 - fee_pct), monthly = financed / months
  const getMonthly = useCallback(
    (amount: number): number | null => {
      if (!selectedPlan || amount <= 0) return null;
      const financed = amount / (1 - selectedPlan.feePct);
      return Math.round(financed / selectedPlan.months);
    },
    [selectedPlan]
  );

  const monthlyTotal = getMonthly(cashTotal);

  const selectedAddonNames = useMemo(
    () =>
      addons
        .filter((a) => selectedAddons.has(a.id))
        .map((a) => a.displayName),
    [addons, selectedAddons]
  );

  // --- Step tracking ---
  const currentStep = selectedTier
    ? selectedAddons.size > 0
      ? 2
      : 1
    : 0;

  // --- Handlers ---
  const handleSelectTier = useCallback((tierNumber: number) => {
    setSelectedTier(tierNumber);
  }, []);

  const handleToggleAddon = useCallback((addonId: string) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
  }, []);

  const handleAcceptClick = useCallback(() => {
    sigSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const canSign =
    selectedTier !== null &&
    customerNameInput.trim().length >= 2 &&
    signatureData !== null &&
    !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSign) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/proposals/${proposalToken}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerNameInput.trim(),
          signature_data: signatureData,
          selected_tier: selectedTier,
          selected_addon_ids: Array.from(selectedAddons),
          selected_financing_plan_id: selectedPlan?.id || null,
        }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      alert("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }, [
    canSign,
    proposalToken,
    customerNameInput,
    signatureData,
    selectedTier,
    selectedAddons,
    selectedPlan,
  ]);

  return (
    <>
      <ProposalHeader
        customerName={initialCustomerName}
        customerAddress={customerAddress}
        estimateNumber={estimateNumber}
        sentDate={sentDate}
        technicianName={technicianName}
        daysRemaining={daysRemaining}
        currentStep={currentStep}
      />

      <TierCards
        tiers={tiers}
        selectedTier={selectedTier}
        onSelectTier={handleSelectTier}
        getMonthly={getMonthly}
      />

      <AddonCards
        addons={addons}
        selectedAddons={selectedAddons}
        onToggleAddon={handleToggleAddon}
        getMonthly={getMonthly}
      />

      <WhyGenesis reviews={reviews} companyStory={companyStory} />

      <FinancingCalculator
        plans={financingPlans}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        totalAmount={cashTotal}
      />

      <PaymentSchedule
        type={paymentScheduleType as "standard" | "large_job"}
        totalAmount={cashTotal}
      />

      <div ref={sigSectionRef}>
        <SignatureBlock
          selectedTierName={selectedTierData?.tierName || null}
          selectedAddonNames={selectedAddonNames}
          cashTotal={cashTotal}
          monthlyTotal={monthlyTotal}
          customerName={customerNameInput}
          onCustomerNameChange={setCustomerNameInput}
          signatureData={signatureData}
          onSignatureChange={setSignatureData}
          canSign={canSign}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      <StickyBottomBar
        selectedTierName={selectedTierData?.tierName || null}
        selectedAddonNames={selectedAddonNames}
        cashTotal={cashTotal}
        monthlyTotal={monthlyTotal}
        hasSelection={selectedTier !== null}
        onAcceptClick={handleAcceptClick}
      />

      {/* Footer */}
      <footer
        style={{
          background: "#030a14",
          borderTop: "1px solid #1a3357",
          padding: "20px 40px",
          textAlign: "center" as const,
          fontSize: 11,
          color: "#7a8fa8",
          lineHeight: 1.8,
        }}
      >
        <p>
          <strong style={{ color: "#e8edf5" }}>
            Genesis Heating, Cooling & Refrigeration
          </strong>{" "}
          &middot; Monroe, WA &middot; (360) 805-1234 &middot;
          info@genesishvac.com
        </p>
        <p>
          WA Contractor License #GENHVAC12345 &middot; EPA 608 Certified
          &middot; Lennox Premier Dealer
        </p>
        <p
          style={{
            marginTop: 6,
            maxWidth: 780,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Financing subject to credit approval through Synchrony Bank.
          Monthly payments are estimates based on selected plan for qualified
          buyers. Prices valid {daysRemaining} days from proposal date.
          Equipment subject to availability. Manufacturer warranty terms
          apply. Rebates subject to utility provider approval.
        </p>
      </footer>
    </>
  );
}
