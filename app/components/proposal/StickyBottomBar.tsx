"use client";

interface StickyBottomBarProps {
  selectedTierName: string | null;
  selectedAddonNames: string[];
  cashTotal: number;
  monthlyTotal: number | null;
  hasSelection: boolean;
  onAcceptClick: () => void;
}

export default function StickyBottomBar({
  selectedTierName,
  selectedAddonNames,
  cashTotal,
  monthlyTotal,
  hasSelection,
  onAcceptClick,
}: StickyBottomBarProps) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 90,
        background: "rgba(5, 13, 26, 0.97)",
        borderTop: "1px solid #1a3357",
        backdropFilter: "blur(20px)",
        padding: "0 40px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="proposal-summary-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "14px 0",
          minHeight: 74,
        }}
      >
        {/* Package name */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 180 }}>
          <span
            style={{
              fontSize: 9,
              textTransform: "uppercase" as const,
              letterSpacing: 2,
              color: "#7a8fa8",
            }}
          >
            Selected Package
          </span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.1,
            }}
          >
            {selectedTierName || "Nothing selected yet"}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 40,
            background: "#1a3357",
            flexShrink: 0,
          }}
        />

        {/* Addon tags */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexWrap: "wrap" as const,
            gap: 6,
          }}
        >
          {selectedAddonNames.length === 0 ? (
            <span
              style={{ fontSize: 12, color: "#7a8fa8", fontStyle: "italic" }}
            >
              {hasSelection
                ? "No add-ons selected"
                : "No add-ons yet \u2014 check boxes above \u2191"}
            </span>
          ) : (
            selectedAddonNames.map((name, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "rgba(21,101,192,0.15)",
                  border: "1px solid rgba(30,136,229,0.25)",
                  color: "#42a5f5",
                }}
              >
                + {name}
              </span>
            ))
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 40,
            background: "#1a3357",
            flexShrink: 0,
          }}
        />

        {/* Totals */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "right" as const }}>
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase" as const,
                letterSpacing: 2,
                color: "#7a8fa8",
              }}
            >
              Cash Total
            </div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 34,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {cashTotal > 0 ? `$${cashTotal.toLocaleString()}` : "\u2014"}
            </div>
          </div>
          {monthlyTotal !== null && (
            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 9,
                  textTransform: "uppercase" as const,
                  letterSpacing: 2,
                  color: "#7a8fa8",
                }}
              >
                Est. Monthly
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                ${monthlyTotal}/mo
              </div>
              <div style={{ fontSize: 11, color: "#42a5f5" }}>
                / month OAC
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={onAcceptClick}
          disabled={!hasSelection}
          style={{
            background: hasSelection
              ? "linear-gradient(135deg, #e65100, #ff6d00)"
              : "rgba(120,144,156,0.12)",
            color: hasSelection ? "#fff" : "#7a8fa8",
            border: hasSelection ? "none" : "1.5px solid rgba(120,144,156,0.3)",
            borderRadius: 10,
            padding: "14px 28px",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            cursor: hasSelection ? "pointer" : "not-allowed",
            boxShadow: hasSelection
              ? "0 6px 20px rgba(255,109,0,0.35)"
              : "none",
            transition: "all 0.2s",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
        >
          &#10022; Accept & Schedule Install
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .proposal-summary-inner { flex-wrap: wrap !important; gap: 12px !important; padding: 12px 0 !important; }
        }
      `}</style>
    </div>
  );
}
