"use client";

interface ProposalHeaderProps {
  customerName: string;
  customerAddress: string | null;
  estimateNumber: string;
  sentDate: string | null;
  technicianName: string;
  daysRemaining: number;
  currentStep: number;
}

export default function ProposalHeader({
  customerName,
  customerAddress,
  estimateNumber,
  sentDate,
  technicianName,
  daysRemaining,
  currentStep,
}: ProposalHeaderProps) {
  const formattedDate = sentDate
    ? new Date(sentDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  return (
    <>
      {/* STICKY HEADER */}
      <header
        style={{
          background:
            "linear-gradient(160deg, #040b17 0%, #091a35 55%, #0d2348 100%)",
          borderBottom: "1px solid #1a3357",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="proposal-header-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 40px",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              className="proposal-header-logo-box"
              style={{
                width: 46,
                height: 46,
                background: "linear-gradient(135deg, #1565c0, #0d47a1)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 0 20px rgba(21,101,192,0.5)",
                flexShrink: 0,
              }}
            >
              &#10052;
            </div>
            <div>
              <div
                className="proposal-header-brand"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase" as const,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                Genesis
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 4,
                  textTransform: "uppercase" as const,
                  color: "#42a5f5",
                  marginTop: 3,
                }}
              >
                Heating &middot; Cooling &middot; Refrigeration
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#7a8fa8",
                  fontStyle: "italic",
                  marginTop: 1,
                }}
              >
                Comfort You Can Trust
              </div>
            </div>
          </div>

          {/* Customer info — hidden on mobile */}
          <div
            className="proposal-header-customer"
            style={{ display: "flex", gap: 28, alignItems: "center" }}
          >
            <HeaderField label="Customer" value={customerName} />
            {customerAddress && (
              <HeaderField
                label="Address"
                value={
                  customerAddress.includes(",")
                    ? customerAddress.split(",").slice(-2).join(",").trim()
                    : customerAddress
                }
              />
            )}
            <HeaderField label="Proposal #" value={estimateNumber} />
            <HeaderField label="Date" value={formattedDate} />
            <HeaderField label="Technician" value={technicianName} />
          </div>

          {/* Price guarantee badge */}
          <div
            className="proposal-header-badge"
            style={{
              background:
                "linear-gradient(135deg, #e65100, #ff6d00)",
              color: "white",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              whiteSpace: "nowrap" as const,
              boxShadow: "0 4px 16px rgba(255,109,0,0.35)",
            }}
          >
            &#9200; Price Guaranteed {daysRemaining} Days
          </div>
        </div>
      </header>

      {/* HERO */}
      <div
        className="proposal-hero"
        style={{
          background: "linear-gradient(180deg, #091a35 0%, #050d1a 100%)",
          padding: "44px 40px 36px",
          textAlign: "center" as const,
          borderBottom: "1px solid #1a3357",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="proposal-hero-glow"
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(21,101,192,0.12) 0%, transparent 70%)",
            pointerEvents: "none" as const,
          }}
        />
        <div
          style={{
            fontSize: 10,
            letterSpacing: 5,
            textTransform: "uppercase" as const,
            color: "#42a5f5",
            marginBottom: 10,
            position: "relative",
          }}
        >
          &#10022; Your personalized estimate
        </div>
        <div
          className="proposal-hero-title"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 48,
            fontWeight: 900,
            textTransform: "uppercase" as const,
            letterSpacing: 2,
            color: "#fff",
            lineHeight: 1,
            marginBottom: 10,
            position: "relative",
          }}
        >
          Build Your{" "}
          <span style={{ color: "#42a5f5" }}>Perfect</span> Comfort System
        </div>
        <div
          className="proposal-hero-subtitle"
          style={{
            fontSize: 15,
            color: "#7a8fa8",
            maxWidth: 560,
            margin: "0 auto",
            lineHeight: 1.6,
            position: "relative",
          }}
        >
          Select your equipment package below, customize with add-ons, and see
          your total update in real time. No pressure — just clarity.
        </div>

        {/* Step indicators */}
        <div
          className="proposal-steps-row"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 24,
            position: "relative",
          }}
        >
          {[
            { num: 1, text: "Choose Package" },
            { num: 2, text: "Add Upgrades" },
            { num: 3, text: "Review & Accept" },
          ].map((step) => {
            const isActive = currentStep >= step.num;
            return (
              <div
                key={step.num}
                className="proposal-step-indicator"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: isActive ? "#fff" : "#7a8fa8",
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${isActive ? "#1e88e5" : "#1a3357"}`,
                  background: isActive
                    ? "rgba(21,101,192,0.15)"
                    : "rgba(255,255,255,0.03)",
                  transition: "all 0.3s",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "currentColor",
                  }}
                />
                {step.num}. {step.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .proposal-header-customer { display: none !important; }
        }
        @media (max-width: 600px) {
          .proposal-header-bar { padding: 10px 16px !important; }
          .proposal-header-logo-box { width: 36px !important; height: 36px !important; font-size: 18px !important; }
          .proposal-header-brand { font-size: 20px !important; letter-spacing: 2px !important; }
          .proposal-header-badge { padding: 6px 12px !important; font-size: 10px !important; }
          .proposal-hero { padding: 24px 16px 20px !important; }
          .proposal-hero-glow { width: 300px !important; height: 150px !important; }
          .proposal-hero-title { font-size: 28px !important; }
          .proposal-hero-subtitle { font-size: 13px !important; max-width: 100% !important; }
          .proposal-step-indicator { padding: 4px 8px !important; font-size: 10px !important; gap: 4px !important; }
          .proposal-steps-row { gap: 4px !important; margin-top: 16px !important; }
        }
      `}</style>
    </>
  );
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
    >
      <span
        style={{
          fontSize: 9,
          textTransform: "uppercase" as const,
          letterSpacing: 2,
          color: "#7a8fa8",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>
        {value}
      </span>
    </div>
  );
}
