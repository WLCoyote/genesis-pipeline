"use client";

import { useState, useRef } from "react";
import { SequenceStep, FollowUpChannel } from "@/lib/types";
import SequenceHeader from "./sequences/SequenceHeader";
import SequenceTokenBar from "./sequences/SequenceTokenBar";
import SequenceStepCard from "./sequences/SequenceStepCard";
import SequenceAddStep from "./sequences/SequenceAddStep";

interface SequenceEditorProps {
  sequenceId: string;
  sequenceName: string;
  initialSteps: SequenceStep[];
  initialIsActive: boolean;
}

export default function SequenceEditor({
  sequenceId,
  sequenceName,
  initialSteps,
  initialIsActive,
}: SequenceEditorProps) {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateStep = (index: number, field: keyof SequenceStep, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setSaved(false);
  };

  const addStep = (channel: FollowUpChannel = "sms") => {
    const maxDay = steps.length > 0 ? Math.max(...steps.map((s) => s.day_offset)) : 0;
    setSteps((prev) => [
      ...prev,
      { day_offset: maxDay + 7, channel, template: "", is_call_task: channel === "call" },
    ]);
    setSaved(false);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleToggleActive = async () => {
    setToggling(true);
    setError("");
    const res = await fetch("/api/admin/sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sequenceId, is_active: !isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to toggle sequence.");
    } else {
      setIsActive(!isActive);
    }
    setToggling(false);
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

  const handleInsertToken = (token: string) => {
    const textarea = activeTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + token + value.substring(end);

    // Find which step this textarea belongs to
    const stepIndex = steps.findIndex((s) => s.template === value);
    if (stepIndex !== -1) {
      updateStep(stepIndex, "template", newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + token.length;
      });
    }
  };

  const daySpan = steps.length > 0 ? Math.max(...steps.map((s) => s.day_offset)) : 0;

  return (
    <div className="space-y-4">
      <SequenceHeader
        name={sequenceName}
        isActive={isActive}
        stepCount={steps.length}
        daySpan={daySpan}
        onToggle={handleToggleActive}
        toggling={toggling}
        onSave={handleSave}
        saving={saving}
        saved={saved}
        error={error}
      />

      {/* Paused warning bar */}
      {!isActive && (
        <div className="bg-gradient-to-r from-ds-yellow-bg to-[#fffde7] border border-ds-yellow/40 rounded-xl px-4.5 py-3 flex items-center gap-2.5">
          <span className="text-[13px]">⏸</span>
          <span className="text-[12px] text-[#795500] dark:text-yellow-300 font-bold">
            Sequence is paused — no follow-ups will be sent. Steps are saved and will resume when you reactivate.
          </span>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className="text-[12px] text-ds-blue font-bold hover:underline ml-1 bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            Resume now →
          </button>
        </div>
      )}

      <SequenceTokenBar onInsert={handleInsertToken} />

      <div className="flex flex-col gap-0">
        {steps.map((step, i) => (
          <SequenceStepCard
            key={i}
            step={step}
            index={i}
            isLast={i === steps.length - 1}
            onUpdate={(field, value) => updateStep(i, field, value)}
            onRemove={() => removeStep(i)}
            onFocusTextarea={(el) => { activeTextareaRef.current = el; }}
            canRemove={steps.length > 1}
          />
        ))}
      </div>

      <SequenceAddStep onAdd={addStep} />
    </div>
  );
}
