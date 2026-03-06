"use client";

import { useState, useEffect } from "react";
import NotificationSettings from "@/app/components/NotificationSettings";
import Button from "@/app/components/ui/Button";

interface SettingsFormProps {
  initialSettings: Record<string, number | string | boolean>;
  initialCompanyInfo: Partial<CompanyInfoValues>;
  initialProposalTerms: Partial<ProposalTermsValues>;
  hcpLeadSourceCount?: number;
}

interface CompanyInfoValues {
  company_name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  license_number: string;
  license_state: string;
}

interface ProposalTermsValues {
  authorization: string;
  labor_warranty: string;
  financing: string;
  cancellation: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfoValues = {
  company_name: "Genesis Heating, Cooling & Refrigeration",
  phone: "(425) 261-9095",
  email: "info@genesishvacr.com",
  website: "genesishvacr.com",
  address: "Monroe, WA",
  license_number: "GENESRH862OP",
  license_state: "WA",
};

const DEFAULT_PROPOSAL_TERMS: ProposalTermsValues = {
  authorization: "",
  labor_warranty: "",
  financing: "",
  cancellation: "",
};

const pipelineSettingsConfig = [
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

const companyInfoFields: { key: keyof CompanyInfoValues; label: string; placeholder: string; width?: string }[] = [
  { key: "company_name", label: "Company Name", placeholder: "Genesis Heating, Cooling & Refrigeration" },
  { key: "phone", label: "Phone Number", placeholder: "(425) 261-9095", width: "w-64" },
  { key: "email", label: "Email", placeholder: "info@genesishvacr.com", width: "w-64" },
  { key: "website", label: "Website", placeholder: "genesishvacr.com", width: "w-64" },
  { key: "address", label: "Address / Location", placeholder: "Monroe, WA" },
  { key: "license_number", label: "Contractor License #", placeholder: "GENESRH862OP", width: "w-48" },
  { key: "license_state", label: "License State", placeholder: "WA", width: "w-20" },
];

const proposalTermsFields: { key: keyof ProposalTermsValues; label: string; description: string }[] = [
  { key: "authorization", label: "Authorization / General Terms", description: "Shown at the top of the terms section on the signed PDF" },
  { key: "labor_warranty", label: "Labor Warranty Terms", description: "Labor warranty details (prefixed with 'Labor Warranty:' on the PDF)" },
  { key: "financing", label: "Financing Terms", description: "Financing disclosure (prefixed with 'Financing:' on the PDF)" },
  { key: "cancellation", label: "Cancellation Policy", description: "Cancellation terms (prefixed with 'Cancellation:' on the PDF)" },
];

export default function SettingsForm({ initialSettings, initialCompanyInfo, initialProposalTerms, hcpLeadSourceCount }: SettingsFormProps) {
  const [values, setValues] = useState(initialSettings);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoValues>({
    ...DEFAULT_COMPANY_INFO,
    ...initialCompanyInfo,
  });
  const [proposalTerms, setProposalTerms] = useState<ProposalTermsValues>({
    ...DEFAULT_PROPOSAL_TERMS,
    ...initialProposalTerms,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [sourceCount, setSourceCount] = useState(hcpLeadSourceCount ?? 0);

  // HCP Pricebook import/sync
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [fullSyncing, setFullSyncing] = useState(false);
  const [fullSyncResult, setFullSyncResult] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          ...values,
          company_info: companyInfo,
          proposal_terms: proposalTerms,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save settings.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const textareaClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y";

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Settings saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">Company Information</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Used in proposal PDFs, confirmation emails, and the proposal page.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyInfoFields.map((field) => (
            <div key={field.key} className={field.key === "company_name" ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={companyInfo[field.key]}
                onChange={(e) =>
                  setCompanyInfo((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className={`${inputClass} ${field.width || ""}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Proposal Terms */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">Proposal Terms & Policies</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          These appear in the Terms & Conditions section of the signed proposal PDF.
        </p>
        <div className="space-y-4">
          {proposalTermsFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                {field.description}
              </p>
              <textarea
                value={proposalTerms[field.key]}
                onChange={(e) =>
                  setProposalTerms((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                rows={3}
                className={textareaClass}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">Pipeline Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Configure estimate auto-decline and notification behavior.
        </p>

        {/* HCP Lead Sources Sync */}
        <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
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

        {/* HCP Tag Filter */}
        <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            HCP Estimate Tag Filter
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Skip importing new estimates from HCP when any option has a matching tag.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  hcp_tag_filter_enabled: !prev.hcp_tag_filter_enabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                values.hcp_tag_filter_enabled
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  values.hcp_tag_filter_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {values.hcp_tag_filter_enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {values.hcp_tag_filter_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags to Exclude (comma-separated)
              </label>
              <input
                type="text"
                value={String(values.hcp_exclude_tags ?? "")}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    hcp_exclude_tags: e.target.value,
                  }))
                }
                placeholder="Service Estimate, Service Estimate (Estimate Type)"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Estimates with any option tagged with these names will be skipped during HCP polling.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {pipelineSettingsConfig.map((setting) => (
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
                className={`${inputClass} w-32`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* HCP Pricebook Sync */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">HCP Pricebook Sync</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Import or sync pricebook items from Housecall Pro. Per-item &quot;Push to HCP&quot; is still available in the Pricebook page.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={async () => {
              setImporting(true);
              setImportResult("");
              try {
                const res = await fetch("/api/admin/pricebook/import", { method: "POST" });
                const data = await res.json();
                if (!res.ok) {
                  setImportResult(`Error: ${data.error}`);
                } else {
                  const skipped = (data.materials_skipped || 0) + (data.services_skipped || 0);
                  setImportResult(
                    `Imported ${data.materials_imported} materials, ${data.services_imported} services` +
                    (skipped > 0 ? ` (${skipped} skipped)` : "")
                  );
                }
              } catch {
                setImportResult("Import failed — network error");
              } finally {
                setImporting(false);
              }
            }}
            disabled={importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? "Importing..." : "Import New from HCP"}
          </Button>
          <Button
            variant="success"
            size="md"
            onClick={async () => {
              setFullSyncing(true);
              setFullSyncResult("");
              try {
                const res = await fetch("/api/admin/pricebook/full-sync", { method: "POST" });
                const data = await res.json();
                if (!res.ok) {
                  setFullSyncResult(`Error: ${data.error}`);
                } else {
                  setFullSyncResult(
                    `Updated ${data.updated} items, imported ${data.imported} new items`
                  );
                }
              } catch {
                setFullSyncResult("Sync failed — network error");
              } finally {
                setFullSyncing(false);
              }
            }}
            disabled={fullSyncing}
            className="bg-green-600 hover:bg-green-700"
          >
            {fullSyncing ? "Syncing..." : "Full HCP Pricebook Update"}
          </Button>
          {importResult && (
            <span className={`text-sm ${importResult.startsWith("Error") ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>
              {importResult}
            </span>
          )}
          {fullSyncResult && (
            <span className={`text-sm ${fullSyncResult.startsWith("Error") ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>
              {fullSyncResult}
            </span>
          )}
        </div>
      </div>

      {/* Data Import */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">Data Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Upload CSV files from Housecall Pro to import customers and estimates.
        </p>
        <a
          href="/dashboard/import"
          className="inline-block px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Open CSV Import Tool
        </a>
      </div>

      {/* Campaign Defaults */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">Campaign Defaults</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Default settings for new marketing campaigns. Can be overridden per campaign.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sender Name
            </label>
            <input
              type="text"
              value={String(values.campaign_sender_name ?? "")}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, campaign_sender_name: e.target.value }))
              }
              placeholder="Genesis HVAC"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sender Email
            </label>
            <input
              type="email"
              value={String(values.campaign_sender_email ?? "")}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, campaign_sender_email: e.target.value }))
              }
              placeholder="noreply@genesishvacr.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Batch Size
            </label>
            <input
              type="number"
              value={String(values.campaign_default_batch_size ?? "")}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  campaign_default_batch_size: parseInt(e.target.value) || 50,
                }))
              }
              placeholder="50"
              min={1}
              max={500}
              className={`${inputClass} w-32`}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Emails/SMS per batch (1–500)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Batch Interval (min)
            </label>
            <input
              type="number"
              value={String(values.campaign_default_batch_interval ?? "")}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  campaign_default_batch_interval: parseInt(e.target.value) || 60,
                }))
              }
              placeholder="60"
              min={15}
              className={`${inputClass} w-32`}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Minutes between batches (min 15)</p>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    campaign_warmup_enabled: !prev.campaign_warmup_enabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  values.campaign_warmup_enabled
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    values.campaign_warmup_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable warmup mode by default
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-14">
              Gradually increases batch size over 5 days (25 → 50 → 100 → 200 → 500) for new sender reputation.
            </p>
          </div>
        </div>
      </div>

      {/* QuickBooks Online */}
      <QboConnectionSection />

      {/* Email Notifications */}
      <NotificationSettings />

      {/* Bottom save button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}

// --- QBO Connection Section ---
function QboConnectionSection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    // Check connection status
    fetch("/api/admin/qbo-status")
      .then((res) => res.json())
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false));

    // Handle redirect params
    const params = new URLSearchParams(window.location.search);
    const qbo = params.get("qbo");
    if (qbo === "connected") {
      setConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function handleConnect() {
    const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/qbo`;
    const scope = "com.intuit.quickbooks.accounting";
    const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=genesis`;
    window.location.href = url;
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect QuickBooks Online? Commission confirmation will stop working.")) return;
    setDisconnecting(true);
    await fetch("/api/admin/qbo-status", { method: "DELETE" });
    setConnected(false);
    setDisconnecting(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-display text-lg font-normal text-ds-text dark:text-gray-100 mb-1">
        QuickBooks Online
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Connect QBO for automatic commission confirmation when invoices are paid.
      </p>
      {connected === null ? (
        <span className="text-sm text-gray-400">Checking connection...</span>
      ) : connected ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Connected
          </span>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-[#2CA01C] hover:bg-[#259017] text-white text-sm font-medium rounded-md transition-colors"
        >
          Connect to QuickBooks
        </button>
      )}
    </div>
  );
}
