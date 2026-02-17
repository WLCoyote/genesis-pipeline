"use client";

import { useState } from "react";
import { SequenceStep, FollowUpChannel } from "@/lib/types";

interface SequenceEditorProps {
  sequenceId: string;
  sequenceName: string;
  initialSteps: SequenceStep[];
}

const channelOptions: { value: FollowUpChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Call" },
];

export default function SequenceEditor({
  sequenceId,
  sequenceName,
  initialSteps,
}: SequenceEditorProps) {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const updateStep = (index: number, field: keyof SequenceStep, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setSaved(false);
  };

  const addStep = () => {
    const maxDay = steps.length > 0 ? Math.max(...steps.map((s) => s.day_offset)) : 0;
    setSteps((prev) => [
      ...prev,
      { day_offset: maxDay + 7, channel: "email", template: "", is_call_task: false },
    ]);
    setSaved(false);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/sequences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sequenceId, steps }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save sequence.");
    } else {
      setSaved(true);
    }

    setSaving(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{sequenceName}</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
          )}
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 shrink-0">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Day</label>
                <input
                  type="number"
                  min={0}
                  value={step.day_offset}
                  onChange={(e) =>
                    updateStep(index, "day_offset", parseInt(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Channel</label>
                <select
                  value={step.channel}
                  onChange={(e) =>
                    updateStep(index, "channel", e.target.value)
                  }
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                >
                  {channelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 mt-4">
                <input
                  type="checkbox"
                  id={`call-task-${index}`}
                  checked={step.is_call_task}
                  onChange={(e) =>
                    updateStep(index, "is_call_task", e.target.checked)
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor={`call-task-${index}`}
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  Call task
                </label>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Template
              </label>
              <textarea
                value={step.template}
                onChange={(e) => updateStep(index, "template", e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                placeholder="Message template... Use {{customer_name}}, {{comfort_pro_name}}"
              />
            </div>

            <button
              onClick={() => removeStep(index)}
              className="self-start mt-5 text-red-400 hover:text-red-600 text-sm cursor-pointer"
              title="Remove step"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="mt-3 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 rounded-md hover:border-gray-400 hover:text-gray-700 dark:hover:text-gray-300 w-full transition-colors cursor-pointer"
      >
        + Add Step
      </button>
    </div>
  );
}
