"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MoveToHcpButtonProps {
  leadId: string;
  customerName: string;
}

export default function MoveToHcpButton({ leadId, customerName }: MoveToHcpButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMove = async () => {
    if (
      !confirm(
        `Move "${customerName}" to Housecall Pro? This will create a customer and estimate in HCP.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/leads/${leadId}/move-to-hcp`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to move to HCP.");
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        onClick={handleMove}
        disabled={loading}
        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {loading ? "Moving..." : "Move to HCP"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
