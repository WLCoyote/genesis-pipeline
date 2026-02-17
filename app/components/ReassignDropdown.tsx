"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ComfortPro {
  id: string;
  name: string;
}

interface ReassignDropdownProps {
  estimateId: string;
  currentAssignedTo: string | null;
  comfortPros: ComfortPro[];
}

export default function ReassignDropdown({
  estimateId,
  currentAssignedTo,
  comfortPros,
}: ReassignDropdownProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChange = async (newAssignedTo: string) => {
    if (newAssignedTo === (currentAssignedTo || "")) return;

    setLoading(true);

    const res = await fetch(`/api/estimates/${estimateId}/reassign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: newAssignedTo || null }),
    });

    if (res.ok) {
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <select
      value={currentAssignedTo || ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {comfortPros.map((pro) => (
        <option key={pro.id} value={pro.id}>
          {pro.name}
        </option>
      ))}
    </select>
  );
}
