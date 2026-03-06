"use client";

import { useState, useMemo } from "react";
import { EmailBlock } from "@/lib/campaign-types";
import { renderCampaignEmail } from "@/lib/campaign-email";

interface Props {
  blocks: EmailBlock[];
  previewText?: string;
}

export default function EmailPreview({ blocks, previewText }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  const html = useMemo(
    () =>
      renderCampaignEmail({
        blocks,
        customerName: "John Smith",
        customerEmail: "john@example.com",
        customerCity: "Monroe",
        companyName: "Genesis Refrigeration & HVAC",
        unsubscribeUrl: "#",
        previewText,
      }),
    [blocks, previewText]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-ds-text-lt">Preview:</span>
        <button
          onClick={() => setMode("desktop")}
          className={`px-2 py-1 text-xs rounded cursor-pointer ${
            mode === "desktop"
              ? "bg-ds-blue text-white"
              : "text-ds-text-lt hover:bg-gray-100"
          }`}
        >
          Desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          className={`px-2 py-1 text-xs rounded cursor-pointer ${
            mode === "mobile"
              ? "bg-ds-blue text-white"
              : "text-ds-text-lt hover:bg-gray-100"
          }`}
        >
          Mobile
        </button>
      </div>
      <div
        className="flex-1 border border-ds-border rounded-lg bg-gray-50 overflow-hidden flex justify-center"
      >
        <iframe
          srcDoc={html}
          title="Email Preview"
          className="border-0"
          style={{
            width: mode === "desktop" ? "100%" : "375px",
            height: "100%",
            minHeight: "500px",
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
