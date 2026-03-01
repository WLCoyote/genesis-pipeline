"use client";

export interface FinancingPlanData {
  id: string;
  planCode: string;
  label: string;
  feePct: number;
  months: number;
  apr: number;
  isDefault: boolean;
  synchronyUrl: string | null;
}

interface FinancingCalculatorProps {
  plans: FinancingPlanData[];
  selectedPlan: FinancingPlanData | null;
  onSelectPlan: (plan: FinancingPlanData) => void;
  totalAmount: number;
}

export default function FinancingCalculator({
  plans,
  selectedPlan,
  onSelectPlan,
  totalAmount,
}: FinancingCalculatorProps) {
  if (plans.length === 0) return null;

  // Calculate monthly for each plan
  const getMonthlyForPlan = (plan: FinancingPlanData, amount: number) => {
    const financed = amount / (1 - plan.feePct);
    return Math.round(financed / plan.months);
  };

  return (
    <div style={{ padding: "0 40px 52px" }}>
      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 48,
            fontWeight: 900,
            color: "rgba(30,136,229,0.2)",
            lineHeight: 1,
            userSelect: "none" as const,
          }}
        >
          04
        </div>
        <div>
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              textTransform: "uppercase" as const,
              letterSpacing: 2,
              color: "#fff",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Financing Options
          </h2>
          <p style={{ fontSize: 13, color: "#7a8fa8", marginTop: 3 }}>
            Select a plan to see your estimated monthly payment. All packages
            and add-ons can be financed.
          </p>
        </div>
      </div>
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, #1a3357 0%, transparent 80%)",
          marginBottom: 32,
        }}
      />

      {/* Financing overview bar */}
      <div
        className="proposal-fin-bar"
        style={{
          background:
            "linear-gradient(135deg, rgba(21,101,192,0.12) 0%, rgba(21,101,192,0.04) 100%)",
          border: "1px solid rgba(30,136,229,0.2)",
          borderRadius: 16,
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          gap: 28,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 36, flexShrink: 0 }}>&#128179;</div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 4,
              marginTop: 0,
            }}
          >
            Flexible Financing — Approved in Minutes
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "#7a8fa8",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            We partner with Synchrony Bank. No hard credit pull to check your
            rate. Finance your entire package including add-ons.
          </p>
        </div>
      </div>

      {/* Plan selector cards */}
      <div
        className="proposal-fin-plans"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`,
          gap: 14,
        }}
      >
        {plans.map((plan) => {
          const isActive = selectedPlan?.id === plan.id;
          const monthly =
            totalAmount > 0 ? getMonthlyForPlan(plan, totalAmount) : null;

          return (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan)}
              style={{
                background: isActive
                  ? "rgba(21,101,192,0.12)"
                  : "#0c1c35",
                border: `1.5px solid ${
                  isActive ? "#1e88e5" : "#1a3357"
                }`,
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                  color: isActive ? "#42a5f5" : "#7a8fa8",
                  marginBottom: 8,
                }}
              >
                {plan.label}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {plan.apr === 0 ? "0%" : `${(plan.apr * 100).toFixed(2)}%`}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#7a8fa8",
                  marginTop: 4,
                  textTransform: "uppercase" as const,
                  letterSpacing: 1.5,
                }}
              >
                {plan.months} months
              </div>
              {monthly !== null && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 26,
                      fontWeight: 900,
                      color: isActive ? "#42a5f5" : "#fff",
                    }}
                  >
                    ${monthly}
                    <span style={{ fontSize: 13, fontWeight: 400 }}>
                      /mo
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 10, color: "#7a8fa8", marginTop: 2 }}
                  >
                    estimated payment
                  </div>
                </div>
              )}
              {isActive && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#42a5f5",
                    letterSpacing: 1,
                    textTransform: "uppercase" as const,
                  }}
                >
                  &#10003; Selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .proposal-fin-bar { flex-direction: column !important; }
          .proposal-fin-plans { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
