"use client";

import { useState } from "react";

interface SettingsFormProps {
  initialSettings: Record<string, number | string | boolean>;
  hcpLeadSourceCount?: number;
}

const settingsConfig = [
  {
    key: "auto_decline_days",
    label: "Auto-Decline Days",
    description: "Number of days before an estimate is automatically declined",
    type: "number" as const,
  },
  {
    key: "declining_soon_warning_days",
    label: "Declining Soon Warning (days)",
    description: "Days before auto-decline to notify comfort pro",
    type: "number" as const,
  },
];

export default function SettingsForm({ initialSettings, hcpLeadSourceCount }: SettingsFormProps) {
  const [values, setValues] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [sourceCount, setSourceCount] = useState(hcpLeadSourceCount ?? 0);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save settings.");
    } else {
      setSaved(true);
    }

    setSaving(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* HCP Lead Sources Sync */}
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          HCP Lead Sources
        </label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Pull lead source options from Housecall Pro for use in the Create Lead form.
          {sourceCount > 0 && ` (${sourceCount} sources synced)`}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setSyncing(true);
              setSyncResult("");
              const res = await fetch("/api/admin/hcp-lead-sources", { method: "POST" });
              const data = await res.json();
              if (res.ok) {
                setSourceCount(data.count);
                setSyncResult(`Synced ${data.count} lead sources from HCP`);
              } else {
                setSyncResult(data.error || "Sync failed");
              }
              setSyncing(false);
            }}
            disabled={syncing}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? "Syncing..." : "Sync HCP Lead Sources"}
          </button>
          {syncResult && (
            <span className={`text-sm ${syncResult.includes("Synced") ? "text-green-600 dark:text-green-400" : "text-red-600"}`}>
              {syncResult}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {settingsConfig.map((setting) => (
          <div key={setting.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {setting.label}
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
              {setting.description}
            </p>
            <input
              type={setting.type}
              value={String(values[setting.key] ?? "")}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [setting.key]:
                    setting.type === "number"
                      ? parseInt(e.target.value) || 0
                      : e.target.value,
                }))
              }
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
