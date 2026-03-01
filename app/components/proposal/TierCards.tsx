"use client";

export interface TierData {
  tierNumber: number;
  tierName: string;
  tagline: string;
  featureBullets?: string[];
  items: Array<{
    id: string;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  isRecommended: boolean;
}

interface TierCardsProps {
  tiers: TierData[];
  selectedTier: number | null;
  onSelectTier: (tierNumber: number) => void;
  getMonthly: (amount: number) => number | null;
}

const tierStyles: Record<
  number,
  {
    badge: string;
    badgeBg: string;
    badgeBorder: string;
    selectedBorder: string;
    selectedShadow: string;
    monthlyBg: string;
    monthlyBorder: string;
    btnBg: string;
    btnColor: string;
    btnShadow: string;
    icon: string;
  }
> = {
  1: {
    badge: "#b0bec5",
    badgeBg: "rgba(120,144,156,0.15)",
    badgeBorder: "rgba(120,144,156,0.3)",
    selectedBorder: "#7a8fa8",
    selectedShadow: "0 0 0 2px rgba(120,144,156,0.3), 0 20px 60px rgba(0,0,0,0.5)",
    monthlyBg: "rgba(120,144,156,0.08)",
    monthlyBorder: "rgba(120,144,156,0.2)",
    btnBg: "rgba(120,144,156,0.12)",
    btnColor: "#b0bec5",
    btnShadow: "none",
    icon: "\u2699",
  },
  2: {
    badge: "#42a5f5",
    badgeBg: "rgba(21,101,192,0.2)",
    badgeBorder: "rgba(30,136,229,0.3)",
    selectedBorder: "#1e88e5",
    selectedShadow: "0 0 0 2px rgba(30,136,229,0.2), 0 20px 60px rgba(0,0,0,0.5)",
    monthlyBg: "rgba(21,101,192,0.12)",
    monthlyBorder: "rgba(30,136,229,0.25)",
    btnBg: "linear-gradient(135deg, #1565c0, #1e88e5)",
    btnColor: "#fff",
    btnShadow: "0 6px 20px rgba(30,136,229,0.3)",
    icon: "\u2B50",
  },
  3: {
    badge: "#ff8f00",
    badgeBg: "rgba(230,81,0,0.2)",
    badgeBorder: "rgba(255,109,0,0.3)",
    selectedBorder: "#ff6d00",
    selectedShadow: "0 0 0 2px rgba(255,109,0,0.2), 0 20px 60px rgba(0,0,0,0.5)",
    monthlyBg: "rgba(230,81,0,0.1)",
    monthlyBorder: "rgba(255,109,0,0.25)",
    btnBg: "linear-gradient(135deg, #e65100, #ff6d00)",
    btnColor: "#fff",
    btnShadow: "0 6px 20px rgba(255,109,0,0.35)",
    icon: "\uD83D\uDD25",
  },
};

const tierLabels: Record<number, string> = {
  1: "Good",
  2: "Better",
  3: "Best",
};

export default function TierCards({
  tiers,
  selectedTier,
  onSelectTier,
  getMonthly,
}: TierCardsProps) {
  return (
    <div style={{ padding: "52px 40px" }}>
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
          01
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
            Choose Your Package
          </h2>
          <p style={{ fontSize: 13, color: "#7a8fa8", marginTop: 3 }}>
            Click a tier to select it — your running total updates instantly
            below.
          </p>
        </div>
      </div>
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, #1a3357 0%, transparent 80%)",
          marginBottom: 32,
        }}
      />

      {/* Tier cards grid */}
      <div
        className="proposal-tiers-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {tiers.map((tier) => {
          const s = tierStyles[tier.tierNumber] || tierStyles[1];
          const isSelected = selectedTier === tier.tierNumber;
          const monthly = getMonthly(tier.subtotal);

          return (
            <div
              key={tier.tierNumber}
              onClick={() => onSelectTier(tier.tierNumber)}
              style={{
                background: "#0c1c35",
                border: `1.5px solid ${isSelected ? s.selectedBorder : "#1a3357"}`,
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.25s, border-color 0.25s, box-shadow 0.25s",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                userSelect: "none" as const,
                boxShadow: isSelected ? s.selectedShadow : "none",
              }}
            >
              {/* Selected check */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 42,
                    right: 14,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background:
                      tier.tierNumber === 3
                        ? "#e65100"
                        : tier.tierNumber === 2
                        ? "#1565c0"
                        : "rgba(120,144,156,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#fff",
                    zIndex: 5,
                  }}
                >
                  &#10003;
                </div>
              )}

              {/* Banner */}
              {tier.isRecommended ? (
                <div
                  style={{
                    background:
                      "linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)",
                    textAlign: "center" as const,
                    padding: "7px 12px",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 3,
                    textTransform: "uppercase" as const,
                    color: "white",
                  }}
                >
                  &#11088; Most Popular — Recommended for Your Home
                </div>
              ) : (
                <div
                  style={{
                    height: 32,
                    background: "rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase" as const,
                      letterSpacing: 2,
                      color: "#7a8fa8",
                    }}
                  >
                    {tier.tierNumber === 3
                      ? "\uD83D\uDD25 Premium Option"
                      : "Standard Option"}
                  </span>
                </div>
              )}

              {/* Tier head */}
              <div style={{ padding: "20px 22px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: 3,
                      textTransform: "uppercase" as const,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: s.badgeBg,
                      color: s.badge,
                      border: `1px solid ${s.badgeBorder}`,
                    }}
                  >
                    {s.icon} {tierLabels[tier.tierNumber] || `Tier ${tier.tierNumber}`}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 36,
                    fontWeight: 900,
                    textTransform: "uppercase" as const,
                    letterSpacing: 2,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {tier.tierName}
                </div>
                <div style={{ fontSize: 12, color: "#7a8fa8", marginTop: 3 }}>
                  {tier.tagline}
                </div>
              </div>

              {/* Features + Equipment */}
              <div style={{ padding: "14px 22px", flex: 1 }}>
                {/* Feature bullets (if available) */}
                {tier.featureBullets && tier.featureBullets.length > 0 ? (
                  <>
                    {tier.featureBullets.filter(b => b.trim()).map((bullet, i) => (
                      <div
                        key={`fb-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 9,
                          padding: "6px 0",
                          borderBottom:
                            i < tier.featureBullets!.filter(b => b.trim()).length - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          color: "#cdd8e8",
                        }}
                      >
                        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                          &#9989;
                        </span>
                        <span style={{ color: "#fff", fontWeight: 600 }}>{bullet}</span>
                      </div>
                    ))}

                    {/* Equipment Included — condensed list */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{
                        fontSize: 9,
                        textTransform: "uppercase" as const,
                        letterSpacing: 2,
                        color: "#7a8fa8",
                        marginBottom: 6,
                        fontWeight: 700,
                      }}>
                        Equipment Included
                      </div>
                      {tier.items.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: "#7a8fa8",
                            padding: "3px 0",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.display_name}
                          {item.spec_line && (
                            <span style={{ color: "#5a6a80" }}> — {item.spec_line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Fallback: show items as features (original behavior) */
                  tier.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        padding: "6px 0",
                        borderBottom:
                          i < tier.items.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        color: "#cdd8e8",
                      }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                        &#9989;
                      </span>
                      <span>
                        <strong style={{ color: "#fff", fontWeight: 700 }}>
                          {item.display_name}
                        </strong>
                        {item.spec_line && (
                          <span style={{ color: "#7a8fa8" }}> — {item.spec_line}</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Pricing block */}
              <div
                style={{
                  padding: "16px 22px 20px",
                  borderTop: "1px solid #1a3357",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    letterSpacing: 2,
                    color: "#7a8fa8",
                    marginBottom: 2,
                  }}
                >
                  Cash / Check Price
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 46,
                      fontWeight: 900,
                      color: "#fff",
                      lineHeight: 1,
                      letterSpacing: -1,
                    }}
                  >
                    ${tier.subtotal.toLocaleString()}
                  </span>
                </div>

                {monthly !== null && (
                  <div
                    style={{
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      background: s.monthlyBg,
                      border: `1px solid ${s.monthlyBorder}`,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 24,
                          fontWeight: 900,
                          color: "#fff",
                        }}
                      >
                        ${monthly}
                        <small style={{ fontSize: 13, fontWeight: 400 }}>
                          /mo
                        </small>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#7a8fa8",
                          marginTop: 1,
                        }}
                      >
                        Financing Available
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#7a8fa8",
                        textAlign: "right" as const,
                        lineHeight: 1.5,
                      }}
                    >
                      Subject to
                      <br />
                      credit approval
                    </div>
                  </div>
                )}

                <button
                  style={{
                    width: "100%",
                    padding: 13,
                    border:
                      tier.tierNumber === 1
                        ? "1.5px solid rgba(120,144,156,0.3)"
                        : "none",
                    borderRadius: 10,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: s.btnBg,
                    color: s.btnColor,
                    boxShadow: s.btnShadow,
                    transition: "all 0.2s",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTier(tier.tierNumber);
                  }}
                >
                  {tier.tierNumber === 2 && "\u2726 "}
                  {tier.tierNumber === 3 && "\uD83D\uDD25 "}
                  Select {tier.tierName}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .proposal-tiers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
