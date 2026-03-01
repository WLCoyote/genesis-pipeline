"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureBlockProps {
  selectedTierName: string | null;
  selectedAddonNames: string[];
  cashTotal: number;
  monthlyTotal: number | null;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  signatureData: string | null;
  onSignatureChange: (data: string | null) => void;
  canSign: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  hasFinancing: boolean;
  onDisclosuresChange?: (complete: boolean) => void;
}

export default function SignatureBlock({
  selectedTierName,
  selectedAddonNames,
  cashTotal,
  monthlyTotal,
  customerName,
  onCustomerNameChange,
  signatureData,
  onSignatureChange,
  canSign,
  onSubmit,
  isSubmitting,
  hasFinancing,
  onDisclosuresChange,
}: SignatureBlockProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [warrantyAccepted, setWarrantyAccepted] = useState(false);
  const [financingAccepted, setFinancingAccepted] = useState(false);

  const disclosuresComplete = termsAccepted && warrantyAccepted && (!hasFinancing || financingAccepted);
  const canSubmit = canSign && disclosuresComplete;

  useEffect(() => {
    onDisclosuresChange?.(disclosuresComplete);
  }, [disclosuresComplete, onDisclosuresChange]);

  // Sync canvas intrinsic width with container width to prevent pointer offset
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const w = container.clientWidth;
      if (w > 0 && w !== canvasWidth) {
        setCanvasWidth(w);
        // Clear and reset after resize since canvas resets on dimension change
        sigRef.current?.clear();
        onSignatureChange(null);
      }
    };

    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(container);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      onSignatureChange(sigRef.current.toDataURL());
    }
  }, [onSignatureChange]);

  const clearSignature = useCallback(() => {
    sigRef.current?.clear();
    onSignatureChange(null);
  }, [onSignatureChange]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ padding: "0 40px 120px" }}>
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
          05
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
            Review & Accept Your Proposal
          </h2>
          <p style={{ fontSize: 13, color: "#7a8fa8", marginTop: 3 }}>
            Your complete selection is summarized below. Sign to authorize your
            installation.
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

      <div
        style={{
          background: "#0c1c35",
          border: "1.5px solid #1a3357",
          borderRadius: 18,
          padding: "36px 40px",
        }}
      >
        <h3
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            textTransform: "uppercase" as const,
            letterSpacing: 2,
            color: "#fff",
            marginBottom: 6,
            marginTop: 0,
          }}
        >
          Authorization to Proceed
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "#7a8fa8",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          By signing below, you authorize Genesis Heating, Cooling &
          Refrigeration to proceed with the selected installation package. A
          deposit of 50% is due when the job is scheduled. Remaining balance
          due upon completion of installation.
        </p>

        {/* Selection preview */}
        <div
          style={{
            background: "rgba(21,101,192,0.08)",
            border: "1px solid rgba(30,136,229,0.2)",
            borderRadius: 10,
            padding: "14px 18px",
            margin: "20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap" as const,
          }}
        >
          <div
            style={{ fontSize: 13, color: "#cdd8e8", lineHeight: 1.6 }}
          >
            {selectedTierName ? (
              <>
                <strong style={{ color: "#fff" }}>
                  {selectedTierName} Package
                </strong>
                {selectedAddonNames.length > 0 && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: "#42a5f5" }}>
                      Add-ons: {selectedAddonNames.join(", ")}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <strong style={{ color: "#fff" }}>
                  No package selected yet.
                </strong>
                <br />
                <span style={{ color: "#7a8fa8", fontSize: 12 }}>
                  Please choose a package above to continue.
                </span>
              </>
            )}
          </div>
          <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 32,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              {cashTotal > 0 ? `$${cashTotal.toLocaleString()}` : "\u2014"}
            </div>
            {monthlyTotal !== null && monthlyTotal > 0 && (
              <div style={{ fontSize: 12, color: "#42a5f5" }}>
                Est. ${monthlyTotal}/mo
              </div>
            )}
          </div>
        </div>

        {/* Signature fields */}
        <div
          className="proposal-sig-fields"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9,
                textTransform: "uppercase" as const,
                letterSpacing: 2,
                color: "#7a8fa8",
                marginBottom: 8,
              }}
            >
              Print Full Name
            </label>
            <input
              type="text"
              placeholder="Full legal name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid #1a3357",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#fff",
                fontFamily: "'Lato', sans-serif",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9,
                textTransform: "uppercase" as const,
                letterSpacing: 2,
                color: "#7a8fa8",
                marginBottom: 8,
              }}
            >
              Date
            </label>
            <input
              type="text"
              value={today}
              readOnly
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid #1a3357",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#fff",
                fontFamily: "'Lato', sans-serif",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Signature canvas */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label
              style={{
                fontSize: 9,
                textTransform: "uppercase" as const,
                letterSpacing: 2,
                color: "#7a8fa8",
              }}
            >
              Signature (draw below)
            </label>
            {signatureData && (
              <button
                onClick={clearSignature}
                style={{
                  background: "none",
                  border: "none",
                  color: "#42a5f5",
                  fontSize: 11,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div
            ref={containerRef}
            style={{
              background: "#ffffff",
              border: "1.5px solid #1a3357",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="#000"
              backgroundColor="#ffffff"
              canvasProps={{
                width: canvasWidth,
                height: 120,
                style: {
                  width: "100%",
                  height: 120,
                  cursor: "crosshair",
                  display: "block",
                },
              }}
              onEnd={handleEnd}
            />
          </div>
        </div>

        {/* Disclosure checkboxes */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              cursor: "pointer",
              fontSize: 12.5,
              color: "#cdd8e8",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: 3, accentColor: "#1e88e5", cursor: "pointer" }}
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#42a5f5", textDecoration: "underline" }}>
                Terms & Conditions
              </a>
              {" "}and authorize Genesis Heating, Cooling & Refrigeration to perform the work described above.
            </span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              cursor: "pointer",
              fontSize: 12.5,
              color: "#cdd8e8",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={warrantyAccepted}
              onChange={(e) => setWarrantyAccepted(e.target.checked)}
              style={{ marginTop: 3, accentColor: "#1e88e5", cursor: "pointer" }}
            />
            <span>
              I understand the labor warranty terms. All labor is warranted for one (1) year unless an extended labor warranty is included in my package.
            </span>
          </label>

          {hasFinancing && (
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 0",
                cursor: "pointer",
                fontSize: 12.5,
                color: "#cdd8e8",
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={financingAccepted}
                onChange={(e) => setFinancingAccepted(e.target.checked)}
                style={{ marginTop: 3, accentColor: "#1e88e5", cursor: "pointer" }}
              />
              <span>
                I acknowledge that financing is provided by Synchrony Bank, subject to credit approval. Monthly payments are estimates and may vary based on the approved amount.
              </span>
            </label>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          style={{
            width: "100%",
            padding: 16,
            background: canSubmit
              ? "linear-gradient(135deg, #e65100, #ff6d00)"
              : "rgba(120,144,156,0.12)",
            color: canSubmit ? "#fff" : "#7a8fa8",
            border: canSubmit ? "none" : "1.5px solid rgba(120,144,156,0.3)",
            borderRadius: 10,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 6px 20px rgba(255,109,0,0.35)" : "none",
            transition: "all 0.2s",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting
            ? "Submitting..."
            : "\u2726 Approve Proposal & Schedule Install"}
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .proposal-sig-fields { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
