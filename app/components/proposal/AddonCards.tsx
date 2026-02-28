"use client";

export interface AddonData {
  id: string;
  displayName: string;
  description: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isSelected: boolean;
}

interface AddonCardsProps {
  addons: AddonData[];
  selectedAddons: Set<string>;
  onToggleAddon: (addonId: string) => void;
  getMonthly: (amount: number) => number | null;
}

export default function AddonCards({
  addons,
  selectedAddons,
  onToggleAddon,
  getMonthly,
}: AddonCardsProps) {
  if (addons.length === 0) return null;

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
          02
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
            Power-Up Your System
          </h2>
          <p style={{ fontSize: 13, color: "#7a8fa8", marginTop: 3 }}>
            Check any upgrade — it&apos;s added to your total instantly. All can
            roll into monthly payments.
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

      {/* Addon cards grid */}
      <div
        className="proposal-addons-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {addons.map((addon) => {
          const isActive = selectedAddons.has(addon.id);
          const monthly = getMonthly(addon.lineTotal);

          return (
            <div
              key={addon.id}
              onClick={() => onToggleAddon(addon.id)}
              style={{
                background: isActive
                  ? "rgba(21,101,192,0.1)"
                  : "#0c1c35",
                border: `1.5px solid ${
                  isActive ? "#1e88e5" : "#1a3357"
                }`,
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex",
                gap: 14,
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 3,
                  }}
                >
                  {addon.displayName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#7a8fa8",
                    lineHeight: 1.4,
                  }}
                >
                  {addon.description}
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  +${addon.lineTotal.toLocaleString()}
                </div>
                {monthly !== null && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#42a5f5",
                      marginTop: 1,
                    }}
                  >
                    +${monthly}/mo
                  </div>
                )}
              </div>

              {/* Checkbox */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${
                    isActive ? "#1e88e5" : "#1a3357"
                  }`,
                  background: isActive ? "#1e88e5" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                {isActive && "\u2713"}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .proposal-addons-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .proposal-addons-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
