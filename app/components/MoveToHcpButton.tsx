"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";

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
        `Move "${customerName}" to Housecall Pro? This will create a customer and estimate draft in HCP. The estimate will appear in your pipeline after it's been sent to the customer.`
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
      <Button
        variant="success"
        size="xs"
        onClick={handleMove}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
      >
        {loading ? "Moving..." : "Move to HCP"}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
