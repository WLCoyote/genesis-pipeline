"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";

const mappableFields = [
  { key: "customer_name", label: "Customer Name", required: true },
  { key: "customer_email", label: "Customer Email" },
  { key: "customer_phone", label: "Customer Phone" },
  { key: "customer_address", label: "Customer Address" },
  { key: "hcp_customer_id", label: "HCP Customer ID" },
  { key: "estimate_number", label: "Estimate Number", required: true },
  { key: "hcp_estimate_id", label: "HCP Estimate ID" },
  { key: "total_amount", label: "Total Amount" },
  { key: "sent_date", label: "Sent Date" },
  { key: "assigned_to_email", label: "Assigned To (email or name)" },
  { key: "equipment_type", label: "Equipment Type" },
  { key: "lead_source", label: "Lead Source" },
  { key: "option_description", label: "Option Description" },
  { key: "option_amount", label: "Option Amount" },
  { key: "option_number", label: "Option Number" },
  { key: "hcp_option_id", label: "HCP Option ID" },
];

interface ImportResult {
  success: boolean;
  customers_created: number;
  customers_updated: number;
  estimates_created: number;
  estimates_updated: number;
  options_created: number;
  rows_processed: number;
  rows_skipped: number;
  errors: string[];
}

export default function CsvUploader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);
    setError("");

    // Parse just the header + first 5 rows for preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = Papa.parse(text, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });

      const headers = parsed.meta.fields || [];
      setCsvHeaders(headers);
      setPreviewRows(parsed.data as Record<string, string>[]);

      // Auto-map columns by fuzzy matching
      const autoMap: Record<string, string> = {};
      for (const field of mappableFields) {
        const match = headers.find((h) => {
          const hLower = h.toLowerCase().replace(/[_\s-]/g, "");
          const fLower = field.key.replace(/_/g, "");
          return hLower === fLower || hLower.includes(fLower) || fLower.includes(hLower);
        });
        if (match) {
          autoMap[field.key] = match;
        }
      }
      setMapping(autoMap);
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error during import.");
    }

    setImporting(false);
  };

  const requiredMapped = mappableFields
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  return (
    <div className="space-y-6">
      {/* File picker */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Upload CSV
        </h2>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100"
          />
          {file && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
      </div>

      {/* Column mapping */}
      {csvHeaders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Map Columns
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Match your CSV columns to the fields below. Required fields are marked with *.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mappableFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Skip —</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Preview (first {previewRows.length} rows)
          </h2>
          <table className="text-xs w-full">
            <thead>
              <tr>
                {csvHeaders.map((h) => (
                  <th key={h} className="text-left px-2 py-1 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                  {csvHeaders.map((h) => (
                    <td key={h} className="px-2 py-1 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                      {row[h] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import button */}
      {csvHeaders.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={importing || !requiredMapped}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : "Import"}
          </button>
          {!requiredMapped && (
            <span className="text-sm text-red-500">
              Map all required fields before importing.
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-green-800 mb-2">
            Import Complete
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {result.rows_processed}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Rows processed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {result.estimates_created}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Estimates created</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {result.customers_created}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Customers created</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {result.options_created}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Options created</div>
            </div>
          </div>
          {result.rows_skipped > 0 && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
              {result.rows_skipped} rows skipped (missing name and estimate number).
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                Errors ({result.errors.length}):
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
