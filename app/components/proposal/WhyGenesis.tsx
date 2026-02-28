"use client";

interface WhyGenesisProps {
  reviews: Array<{ author: string; text: string; rating: number }>;
  companyStory: string;
}

const defaultCards = [
  {
    icon: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67",
    title: "Family Owned",
    desc: "Local Monroe business. You call, we answer \u2014 no call centers, ever.",
  },
  {
    icon: "\u2B50",
    title: "5-Star Rated",
    desc: "200+ verified Google reviews from your neighbors.",
    stars: true,
  },
  {
    icon: "\uD83C\uDFC5",
    title: "Licensed & Insured",
    desc: "WA State certified. Fully insured for your complete protection.",
  },
  {
    icon: "\uD83D\uDCB3",
    title: "Easy Financing",
    desc: "Approved in minutes. Multiple 0% options for qualified buyers.",
  },
  {
    icon: "\uD83D\uDCAF",
    title: "100% Guarantee",
    desc: "If you\u2019re not completely satisfied, we make it right. Period.",
  },
];

export default function WhyGenesis({ reviews, companyStory }: WhyGenesisProps) {
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
          03
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
            Why Families Choose Genesis
          </h2>
          <p style={{ fontSize: 13, color: "#7a8fa8", marginTop: 3 }}>
            Local &middot; Trusted &middot; Family owned since day one.
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

      {/* Why cards grid */}
      <div
        className="proposal-why-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
        }}
      >
        {defaultCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "#0c1c35",
              border: "1.5px solid #1a3357",
              borderRadius: 14,
              padding: "22px 16px",
              textAlign: "center" as const,
              transition: "border-color 0.2s, transform 0.2s",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
            {card.stars && (
              <div style={{ color: "#f9a825", fontSize: 12, marginBottom: 4 }}>
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 5,
              }}
            >
              {card.title}
            </div>
            <div style={{ fontSize: 11, color: "#7a8fa8", lineHeight: 1.5 }}>
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Customer reviews */}
      {reviews.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(reviews.length, 3)}, 1fr)`,
              gap: 14,
            }}
          >
            {reviews.slice(0, 3).map((review, i) => (
              <div
                key={i}
                style={{
                  background: "#0c1c35",
                  border: "1.5px solid #1a3357",
                  borderRadius: 14,
                  padding: "20px 18px",
                }}
              >
                <div
                  style={{ color: "#f9a825", fontSize: 12, marginBottom: 8 }}
                >
                  {Array.from({ length: review.rating }, (_, j) => (
                    <span key={j}>&#9733;</span>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#cdd8e8",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    marginBottom: 10,
                  }}
                >
                  &ldquo;{review.text}&rdquo;
                </div>
                <div style={{ fontSize: 11, color: "#7a8fa8", fontWeight: 700 }}>
                  &mdash; {review.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company story */}
      {companyStory && (
        <div
          style={{
            marginTop: 24,
            background: "rgba(21,101,192,0.06)",
            border: "1px solid rgba(30,136,229,0.15)",
            borderRadius: 14,
            padding: "20px 24px",
            fontSize: 13,
            color: "#cdd8e8",
            lineHeight: 1.7,
          }}
        >
          {companyStory}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .proposal-why-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .proposal-why-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
