"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MoveToHcpButton from "./MoveToHcpButton";

interface ComfortPro {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lead_source: string | null;
  notes: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  users?: { name: string } | null;
}

interface LeadCardProps {
  lead: Lead;
  comfortPros: ComfortPro[];
  leadSources?: string[];
  statusStyles: Record<string, string>;
  isAdmin?: boolean;
}

const defaultSources = ["Facebook", "Google", "Referral", "Website", "Other"];

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function LeadCard({
  lead,
  comfortPros,
  leadSources,
  statusStyles,
  isAdmin = false,
}: LeadCardProps) {
  const sources = leadSources && leadSources.length > 0 ? leadSources : defaultSources;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState(lead.first_name);
  const [lastName, setLastName] = useState(lead.last_name);
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [address, setAddress] = useState(lead.address || "");
  const [city, setCity] = useState(lead.city || "");
  const [state, setState] = useState(lead.state || "WA");
  const [zip, setZip] = useState(lead.zip || "");
  const [leadSource, setLeadSource] = useState(lead.lead_source || "");
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || "");
  const [notes, setNotes] = useState(lead.notes || "");
  const [status, setStatus] = useState(lead.status);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || "WA",
        zip: zip || null,
        lead_source: leadSource || null,
        assigned_to: assignedTo || null,
        notes: notes || null,
        status,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update lead.");
    } else {
      setEditing(false);
      router.refresh();
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setFirstName(lead.first_name);
    setLastName(lead.last_name);
    setEmail(lead.email || "");
    setPhone(lead.phone || "");
    setAddress(lead.address || "");
    setCity(lead.city || "");
    setState(lead.state || "WA");
    setZip(lead.zip || "");
    setLeadSource(lead.lead_source || "");
    setAssignedTo(lead.assigned_to || "");
    setNotes(lead.notes || "");
    setStatus(lead.status);
    setEditing(false);
    setError("");
  };

  const handleArchive = async () => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (res.ok) router.refresh();
  };

  const handleUnarchive = async () => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "new" }),
    });
    if (res.ok) router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete lead "${lead.first_name} ${lead.last_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Edit Lead
          </h3>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Lead Source
            </label>
            <select
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select —</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                ZIP
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Assign to
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Unassigned —</option>
              {comfortPros.map((pro) => (
                <option key={pro.id} value={pro.id}>
                  {pro.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving || !firstName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {lead.first_name} {lead.last_name}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {lead.lead_source ? `via ${lead.lead_source}` : "No source"}
            {" · "}
            {formatDate(lead.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              statusStyles[lead.status] ||
              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            {lead.status === "moved_to_hcp" ? "Moved to HCP" : lead.status}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-600 rounded transition-colors cursor-pointer"
          >
            Edit
          </button>
          {lead.status === "archived" ? (
            <button
              onClick={handleUnarchive}
              className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 border border-blue-200 dark:border-blue-700 rounded transition-colors cursor-pointer"
            >
              Unarchive
            </button>
          ) : (
            <>
              <button
                onClick={handleArchive}
                className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 border border-gray-200 dark:border-gray-600 rounded transition-colors cursor-pointer"
              >
                Archive
              </button>
              <MoveToHcpButton
                leadId={lead.id}
                customerName={`${lead.first_name} ${lead.last_name}`}
              />
            </>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="text-gray-600 dark:text-gray-400">
          {lead.email || "No email"}
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          {lead.phone || "No phone"}
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          {lead.users?.name
            ? `Assigned: ${lead.users.name}`
            : "Unassigned"}
        </div>
      </div>

      {lead.address && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {[lead.address, lead.city, lead.state, lead.zip]
            .filter(Boolean)
            .join(", ")}
        </div>
      )}

      {lead.notes && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
          {lead.notes}
        </div>
      )}
    </div>
  );
}
