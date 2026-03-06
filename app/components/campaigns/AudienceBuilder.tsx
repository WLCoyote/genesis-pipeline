"use client";

import { useState, useEffect, useCallback } from "react";
import { SegmentFilter, SegmentRule, SEGMENT_FIELDS } from "@/lib/campaign-types";
import Button from "@/app/components/ui/Button";
import { selectCls, inputCls } from "@/app/components/ui/FormField";

interface Props {
  filter: SegmentFilter;
  onChange: (filter: SegmentFilter) => void;
  campaignType: "email" | "sms";
  excludeActivePipeline: boolean;
  onExcludeActivePipelineChange: (v: boolean) => void;
  excludeRecentContactDays: number | null;
  onExcludeRecentContactDaysChange: (v: number | null) => void;
}

export default function AudienceBuilder({
  filter,
  onChange,
  campaignType,
  excludeActivePipeline,
  onExcludeActivePipelineChange,
  excludeRecentContactDays,
  onExcludeRecentContactDaysChange,
}: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const rules = filter.rules || [];

  const fetchCount = useCallback(async () => {
    setCounting(true);
    try {
      const res = await fetch("/api/admin/campaigns/audience-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_filter: filter,
          type: campaignType,
          exclude_active_pipeline: excludeActivePipeline,
          exclude_recent_contact_days: excludeRecentContactDays,
        }),
      });
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {
      setCount(null);
    } finally {
      setCounting(false);
    }
  }, [filter, campaignType, excludeActivePipeline, excludeRecentContactDays]);

  // Debounced count fetch
  useEffect(() => {
    const timer = setTimeout(fetchCount, 500);
    return () => clearTimeout(timer);
  }, [fetchCount]);

  function addRule() {
    const newRule: SegmentRule = { field: "tags", operator: "contains_any", value: [] };
    onChange({ ...filter, rules: [...rules, newRule] });
  }

  function updateRule(index: number, updated: SegmentRule) {
    const newRules = [...rules];
    newRules[index] = updated;
    onChange({ ...filter, rules: newRules });
  }

  function removeRule(index: number) {
    onChange({ ...filter, rules: rules.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      {/* Audience count */}
      <div className="flex items-center gap-3 bg-ds-blue-bg border border-ds-blue/20 rounded-lg px-4 py-3">
        <span className="text-sm text-ds-text">Estimated audience:</span>
        <span className="text-lg font-semibold text-ds-blue">
          {counting ? "..." : count !== null ? count.toLocaleString() : "—"}
        </span>
        <span className="text-xs text-ds-text-lt">
          {campaignType === "email" ? "customers with email" : "customers with phone"}
        </span>
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <RuleRow
            key={i}
            rule={rule}
            onChange={(r) => updateRule(i, r)}
            onRemove={() => removeRule(i)}
          />
        ))}
      </div>

      <Button variant="secondary" size="xs" onClick={addRule}>
        + Add Filter Rule
      </Button>

      {/* Exclusions */}
      <div className="border-t border-ds-border pt-3 space-y-2">
        <p className="text-xs font-semibold text-ds-text-lt uppercase tracking-wider">Exclusions</p>
        <label className="flex items-center gap-2 text-sm text-ds-text">
          <input
            type="checkbox"
            checked={excludeActivePipeline}
            onChange={(e) => onExcludeActivePipelineChange(e.target.checked)}
          />
          Exclude customers with active estimates
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ds-text">Exclude contacted within</label>
          <input
            type="number"
            className={`${inputCls} w-20`}
            value={excludeRecentContactDays ?? ""}
            onChange={(e) =>
              onExcludeRecentContactDaysChange(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            min={0}
            placeholder="30"
          />
          <span className="text-sm text-ds-text-lt">days</span>
        </div>
      </div>
    </div>
  );
}

// --- Single rule row ---
function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: SegmentRule;
  onChange: (r: SegmentRule) => void;
  onRemove: () => void;
}) {
  const fieldDef = SEGMENT_FIELDS.find((f) => f.field === rule.field);
  const operators = fieldDef?.operators || ["equals"];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        className={`${selectCls} w-40`}
        value={rule.field}
        onChange={(e) => {
          const newField = SEGMENT_FIELDS.find((f) => f.field === e.target.value);
          onChange({
            field: e.target.value,
            operator: newField?.operators[0] || "equals",
            value: "",
          });
        }}
      >
        {SEGMENT_FIELDS.map((f) => (
          <option key={f.field} value={f.field}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className={`${selectCls} w-36`}
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value })}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {formatOperator(op)}
          </option>
        ))}
      </select>

      {!["is_empty", "is_not_empty"].includes(rule.operator) && (
        <input
          className={`${inputCls} flex-1 min-w-[120px]`}
          value={
            Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value || "")
          }
          onChange={(e) => {
            const val = e.target.value;
            // Arrays for tags, zip in
            if (
              (rule.field === "tags" || (rule.field === "zip" && rule.operator === "in"))
            ) {
              onChange({ ...rule, value: val.split(",").map((s) => s.trim()).filter(Boolean) });
            } else if (rule.field === "last_service_date" || rule.field === "has_estimate") {
              onChange({ ...rule, value: parseInt(val) || 0 });
            } else {
              onChange({ ...rule, value: val });
            }
          }}
          placeholder={getPlaceholder(rule.field, rule.operator)}
        />
      )}

      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center text-ds-red hover:bg-red-50 rounded cursor-pointer text-sm"
      >
        ✕
      </button>
    </div>
  );
}

function formatOperator(op: string): string {
  const map: Record<string, string> = {
    contains_any: "contains any",
    contains_all: "contains all",
    not_contains: "not contains",
    equals: "equals",
    not_equals: "not equals",
    is_empty: "is empty",
    is_not_empty: "is not empty",
    in: "in list",
    older_than_days: "older than (days)",
    newer_than_days: "newer than (days)",
  };
  return map[op] || op;
}

function getPlaceholder(field: string, operator: string): string {
  if (field === "tags") return "tag1, tag2, ...";
  if (field === "zip" && operator === "in") return "98272, 98271, ...";
  if (field === "last_service_date") return "90";
  return "value";
}
