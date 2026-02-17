"use client";

import { useState } from "react";
import { User, UserInvite, UserRole } from "@/lib/types";

interface TeamMemberListProps {
  users: User[];
  invites: UserInvite[];
  currentUserId: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  comfort_pro: "Comfort Pro",
  csr: "CSR",
};

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "comfort_pro", label: "Comfort Pro" },
  { value: "csr", label: "CSR" },
];

export default function TeamMemberList({
  users: initialUsers,
  invites: initialInvites,
  currentUserId,
}: TeamMemberListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("comfort_pro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("comfort_pro");
  const [inviting, setInviting] = useState(false);

  const handleEditStart = (user: User) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setError("");
  };

  const handleEditSave = async (userId: string) => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: editRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update user.");
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: editRole } : u))
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, is_active: !currentlyActive }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update user.");
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentlyActive } : u
        )
      );
    }
    setSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        name: inviteName,
        phone: invitePhone || null,
        role: inviteRole,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create invite.");
    } else {
      setInvites((prev) => [...prev, data.invite]);
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      setInviteRole("comfort_pro");
      setShowInviteForm(false);
    }
    setInviting(false);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setError("");

    const res = await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to revoke invite.");
    } else {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Active Team Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Team Members ({users.length})
          </h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {showInviteForm ? "Cancel" : "Invite Member"}
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <form
            onSubmit={handleInvite}
            className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@genesisservices.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {inviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}

        {/* User List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((u) => (
            <div
              key={u.id}
              className={`p-4 flex items-center justify-between ${
                !u.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {u.name}
                  </p>
                  {u.id === currentUserId && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      (you)
                    </span>
                  )}
                  {!u.is_active && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {u.email}
                  {u.phone && ` · ${u.phone}`}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-4">
                {editingId === u.id ? (
                  <>
                    <select
                      value={editRole}
                      onChange={(e) =>
                        setEditRole(e.target.value as UserRole)
                      }
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleEditSave(u.id)}
                      disabled={saving}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {roleLabels[u.role]}
                    </span>
                    {u.id !== currentUserId && (
                      <>
                        <button
                          onClick={() => handleEditStart(u)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleToggleActive(u.id, u.is_active)
                          }
                          disabled={saving}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pending Invites ({invites.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              These people will be auto-provisioned when they sign in with Google
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {inv.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {inv.email}
                    {inv.phone && ` · ${inv.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    {roleLabels[inv.role]} (pending)
                  </span>
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
