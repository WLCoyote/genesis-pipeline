"use client";

import { useState } from "react";

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
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Company Information</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Proposal Terms & Policies</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Pipeline Settings</h2>
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

      {/* Bottom save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
