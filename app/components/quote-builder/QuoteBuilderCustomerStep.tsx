"use client";

import { useState, useEffect, useCallback } from "react";
import type { CustomerResult, TemplateData } from "./types";

interface Props {
  selectedCustomer: CustomerResult | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  isNewCustomer: boolean;
  onSelectCustomer: (cust: CustomerResult) => void;
  onClearCustomer: () => void;
  onSetNewCustomer: () => void;
  onCustomerNameChange: (v: string) => void;
  onCustomerEmailChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  onCustomerAddressChange: (v: string) => void;
  templates: TemplateData[];
  selectedTemplateId: string | null;
  onLoadTemplate: (id: string) => void;
  onClearTemplate: () => void;
}

export default function QuoteBuilderCustomerStep({
  selectedCustomer,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  isNewCustomer,
  onSelectCustomer,
  onClearCustomer,
  onSetNewCustomer,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  templates,
  selectedTemplateId,
  onLoadTemplate,
  onClearTemplate,
}: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateSystemFilter, setTemplateSystemFilter] = useState("");

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) { setCustomerResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCustomerResults(data.customers || []);
    } catch { setCustomerResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim().length >= 2 && !selectedCustomer) {
        searchCustomers(customerSearch.trim());
      } else {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer, searchCustomers]);

  const systemTypes = [...new Set(templates.map((t) => t.system_type).filter(Boolean))].sort() as string[];

  const filteredTemplates = templates.filter((t) => {
    if (templateSystemFilter && t.system_type !== templateSystemFilter) return false;
    if (templateSearch) {
      const q = templateSearch.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Customer Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
            Customer
          </h3>
          {(selectedCustomer || isNewCustomer) && (
            <button onClick={onClearCustomer} className="text-xs font-bold text-blue-600 dark:text-blue-400">
              Change
            </button>
          )}
        </div>
        <div className="p-5">
          {!selectedCustomer && !isNewCustomer ? (
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600 outline-none transition-colors"
                />
                {searching && (
                  <div className="absolute right-3 top-3 text-xs text-gray-400">Searching...</div>
                )}
              </div>

              {customerResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                  {customerResults.map((cust) => (
                    <button
                      key={cust.id}
                      onClick={() => {
                        onSelectCustomer(cust);
                        setCustomerSearch("");
                        setCustomerResults([]);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{cust.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[cust.email, cust.phone, cust.address].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={onSetNewCustomer}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                + New Customer
              </button>
            </div>
          ) : selectedCustomer && !isNewCustomer ? (
            // Compact selected customer card
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-base font-black shrink-0">
                {customerName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{customerName}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[customerAddress, customerEmail, customerPhone].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          ) : (
            // New customer form
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input type="text" value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                <input type="email" value={customerEmail} onChange={(e) => onCustomerEmailChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                <input type="tel" value={customerPhone} onChange={(e) => onCustomerPhoneChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address</label>
                <input type="text" value={customerAddress} onChange={(e) => onCustomerAddressChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Selector */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
            Template
          </h3>
          {selectedTemplateId && (
            <button onClick={onClearTemplate} className="text-xs font-bold text-red-500 hover:text-red-700">
              Clear Template
            </button>
          )}
        </div>
        <div className="p-5">
          {selectedTemplateId ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Template loaded — customize tiers in the next step
            </p>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <select
                  value={templateSystemFilter}
                  onChange={(e) => setTemplateSystemFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="">All Systems</option>
                  {systemTypes.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {templates.length === 0 ? "No templates yet — build from scratch" : "No templates match your search"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => onLoadTemplate(tmpl.id)}
                      className="text-left border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tmpl.name}</div>
                      {tmpl.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{tmpl.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {tmpl.system_type && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                            {tmpl.system_type}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{tmpl.quote_template_tiers.length} tiers</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                Or skip templates and add items directly in the next step
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
