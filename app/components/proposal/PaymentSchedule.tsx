"use client";

interface PaymentStage {
  label: string;
  percentage: number;
  condition: string;
  fixed_amount?: number;
}

interface PaymentScheduleProps {
  stages: PaymentStage[];
  totalAmount: number;
}

export default function PaymentSchedule({
  stages,
  totalAmount,
}: PaymentScheduleProps) {
  if (stages.length === 0) return null;

  return (
    <div className="proposal-section proposal-payment" style={{ padding: "0 40px 40px" }}>
      <div
        className="proposal-payment-card"
        style={{
          background: "rgba(21,101,192,0.06)",
          border: "1px solid rgba(30,136,229,0.15)",
          borderRadius: 14,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            color: "#42a5f5",
            marginBottom: 16,
          }}
        >
          Payment Schedule
        </div>

        <div className="proposal-payment-stages" style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {stages.map((step, i) => {
            const amount = step.fixed_amount ?? Math.round((totalAmount * step.percentage) / 100);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid #1a3357",
                  borderRadius: 10,
                  padding: "14px 16px",
                  textAlign: "center" as const,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    letterSpacing: 2,
                    color: "#7a8fa8",
                    marginBottom: 4,
                  }}
                >
                  {step.label}
                </div>
                <div
                  className="proposal-payment-amount"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#fff",
                  }}
                >
                  ${amount.toLocaleString()}
                </div>
                <div
                  style={{ fontSize: 10, color: "#7a8fa8", marginTop: 4 }}
                >
                  {step.condition}
                </div>
                {/* Arrow connector */}
                {i < stages.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      right: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#1a3357",
                      fontSize: 16,
                      zIndex: 1,
                    }}
                  >
                    &#9654;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .proposal-payment { padding: 0 16px 20px !important; }
          .proposal-payment-card { padding: 14px 16px !important; }
          .proposal-payment-stages { flex-direction: column !important; gap: 8px !important; }
          .proposal-payment-amount { font-size: 18px !important; }
        }
      `}</style>
    </div>
  );
}
