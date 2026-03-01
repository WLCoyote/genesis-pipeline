"use client";

interface PaymentScheduleProps {
  type: "standard" | "large_job";
  totalAmount: number;
}

export default function PaymentSchedule({
  type,
  totalAmount,
}: PaymentScheduleProps) {
  const isLargeJob = type === "large_job";

  const steps = isLargeJob
    ? [
        { label: "Deposit", pct: 50, desc: "Due when scheduled" },
        { label: "Rough-in", pct: 25, desc: "After rough-in complete" },
        { label: "Install", pct: 25, desc: "After install complete" },
        { label: "Final", pct: 0, amount: 1000, desc: "After final inspection" },
      ]
    : [
        { label: "Deposit", pct: 50, desc: "Due when scheduled" },
        { label: "Completion", pct: 50, desc: "Upon install complete" },
      ];

  return (
    <div style={{ padding: "0 40px 40px" }}>
      <div
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

        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {steps.map((step, i) => {
            const amount = step.amount ?? Math.round((totalAmount * step.pct) / 100);
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
                  {step.desc}
                </div>
                {/* Arrow connector */}
                {i < steps.length - 1 && (
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
    </div>
  );
}
