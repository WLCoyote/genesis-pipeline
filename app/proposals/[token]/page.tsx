import { createClient } from "@/lib/supabase/server";
import ProposalPage from "@/app/components/proposal/ProposalPage";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ProposalPageRoute({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // Fetch estimate by proposal_token — no auth, token-gated
  const { data: estimate, error } = await supabase
    .from("estimates")
    .select(
      `
      id, estimate_number, status, total_amount, subtotal, tax_rate, tax_amount,
      proposal_token, proposal_signed_at, proposal_signed_name, proposal_pdf_url,
      payment_schedule_type, sent_date, auto_decline_date, tier_metadata,
      customers ( id, name, email, phone, address ),
      users!estimates_assigned_to_fkey ( id, name, phone ),
      estimate_line_items (
        id, option_group, display_name, spec_line, description,
        quantity, unit_price, line_total, is_addon, is_selected, sort_order
      )
    `
    )
    .eq("proposal_token", token)
    .single();

  if (error || !estimate) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "#cdd8e8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Proposal Not Found
          </h1>
          <p style={{ fontSize: 16, color: "#7a8fa8", marginTop: 12 }}>
            This proposal link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Check if already signed
  if (estimate.proposal_signed_at) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "#cdd8e8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#00c853",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Proposal Accepted
          </h1>
          <p style={{ fontSize: 16, color: "#7a8fa8", marginTop: 12 }}>
            This proposal was signed by{" "}
            <strong style={{ color: "#fff" }}>
              {estimate.proposal_signed_name}
            </strong>{" "}
            on{" "}
            {new Date(estimate.proposal_signed_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </p>
          <p style={{ fontSize: 14, color: "#7a8fa8", marginTop: 8 }}>
            Thank you for choosing Genesis! We&apos;ll be in touch to schedule
            your installation.
          </p>
          {estimate.proposal_pdf_url && (
            <a
              href={estimate.proposal_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 20,
                padding: "10px 24px",
                backgroundColor: "#e65100",
                color: "#fff",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              Download Signed Proposal (PDF)
            </a>
          )}
        </div>
      </div>
    );
  }

  // Check if expired (auto_decline_date passed)
  if (
    estimate.auto_decline_date &&
    new Date(estimate.auto_decline_date) < new Date()
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "#cdd8e8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#ff6d00",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Proposal Expired
          </h1>
          <p style={{ fontSize: 16, color: "#7a8fa8", marginTop: 12 }}>
            This proposal has expired. Please contact us at (425) 261-9095 for
            an updated quote.
          </p>
        </div>
      </div>
    );
  }

  // Check if lost/dormant
  if (estimate.status === "lost" || estimate.status === "dormant") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "#cdd8e8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#7a8fa8",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Proposal No Longer Available
          </h1>
          <p style={{ fontSize: 16, color: "#7a8fa8", marginTop: 12 }}>
            This proposal is no longer active. Please contact us at (360)
            805-1234 for an updated quote.
          </p>
        </div>
      </div>
    );
  }

  // Fetch financing plans
  const { data: financingPlans } = await supabase
    .from("financing_plans")
    .select("id, plan_code, label, fee_pct, months, apr, is_default, synchrony_url, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch proposal settings (reviews, company story)
  const { data: reviewsSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "proposal_reviews")
    .single();

  const { data: storySetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "proposal_company_story")
    .single();

  // Normalize Supabase FK join types
  const customerRaw = estimate.customers as unknown;
  const customer = (
    Array.isArray(customerRaw) ? customerRaw[0] : customerRaw
  ) as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;

  const techRaw = estimate.users as unknown;
  const technician = (Array.isArray(techRaw) ? techRaw[0] : techRaw) as {
    id: string;
    name: string;
    phone: string | null;
  } | null;

  // Group line items by option_group (tier)
  const lineItems = (estimate.estimate_line_items || []) as Array<{
    id: string;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
  }>;

  // Build tier data from line items
  const tierMap = new Map<
    number,
    {
      items: typeof lineItems;
      subtotal: number;
      addonItems: typeof lineItems;
    }
  >();

  for (const item of lineItems) {
    const existing = tierMap.get(item.option_group) || {
      items: [],
      subtotal: 0,
      addonItems: [],
    };

    if (item.is_addon) {
      existing.addonItems.push(item);
    } else {
      existing.items.push(item);
      existing.subtotal += item.line_total;
    }

    tierMap.set(item.option_group, existing);
  }

  // Use saved tier_metadata if available, otherwise fall back to defaults
  const savedTierMetadata = (estimate as Record<string, unknown>).tier_metadata as Array<{
    tier_number: number;
    tier_name: string;
    tagline: string;
    feature_bullets: string[];
    is_recommended: boolean;
    rebates?: Array<{ id: string; name: string; amount: number }>;
  }> | null;

  const defaultTierNames: Record<number, string> = {
    1: "Standard Comfort",
    2: "Enhanced Efficiency",
    3: "Premium Performance",
  };
  const defaultTierTaglines: Record<number, string> = {
    1: "Reliable performance at an honest price",
    2: "The sweet spot of comfort & savings",
    3: "Maximum comfort, minimum energy bill",
  };

  const tiers = Array.from(tierMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([group, data]) => {
      const meta = savedTierMetadata?.find((m) => m.tier_number === group);
      return {
        tierNumber: group,
        tierName: meta?.tier_name || defaultTierNames[group] || `Option ${group}`,
        tagline: meta?.tagline || defaultTierTaglines[group] || "",
        featureBullets: meta?.feature_bullets || [],
        rebates: (meta?.rebates || []).filter((r) => r.amount > 0),
        items: data.items.sort((a, b) => a.sort_order - b.sort_order),
        subtotal: data.subtotal,
        isRecommended: meta?.is_recommended ?? group === 2,
      };
    });

  // Collect all addon items across tiers (deduplicated by display_name)
  const allAddons: typeof lineItems = [];
  const seenAddonNames = new Set<string>();
  for (const [, data] of tierMap) {
    for (const addon of data.addonItems) {
      if (!seenAddonNames.has(addon.display_name)) {
        seenAddonNames.add(addon.display_name);
        allAddons.push(addon);
      }
    }
  }
  allAddons.sort((a, b) => a.sort_order - b.sort_order);

  // Calculate auto-decline remaining days
  const daysRemaining = estimate.auto_decline_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(estimate.auto_decline_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  return (
    <ProposalPage
      estimateNumber={estimate.estimate_number}
      customerName={customer?.name || "Customer"}
      customerAddress={customer?.address || null}
      technicianName={technician?.name || "Your Technician"}
      sentDate={estimate.sent_date}
      taxRate={estimate.tax_rate}
      paymentScheduleType={estimate.payment_schedule_type || "standard"}
      tiers={tiers}
      addons={allAddons.map((a) => ({
        id: a.id,
        displayName: a.display_name,
        description: a.description || a.spec_line || "",
        unitPrice: a.unit_price,
        quantity: a.quantity,
        lineTotal: a.line_total,
        isSelected: a.is_selected,
      }))}
      financingPlans={
        (financingPlans || []).map((p) => ({
          id: p.id,
          planCode: p.plan_code,
          label: p.label,
          feePct: p.fee_pct,
          months: p.months,
          apr: p.apr,
          isDefault: p.is_default,
          synchronyUrl: p.synchrony_url,
        }))
      }
      reviews={
        (reviewsSetting?.value as Array<{
          author: string;
          text: string;
          rating: number;
        }>) || []
      }
      companyStory={
        (storySetting?.value as string) || ""
      }
      daysRemaining={daysRemaining}
      proposalToken={token}
    />
  );
}
