"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/app/components/ui/Button";

const EVENT_TYPE_LABELS: Record<string, string> = {
  estimate_approved: "Proposal Signed",
  estimate_declined: "Estimate Lost",
  lead_assigned: "New Lead Assigned",
  declining_soon: "Estimate Declining Soon",
};

interface UserPrefs {
  id: string;
  name: string;
  email: string;
  role: string;
  prefs: Record<string, boolean>;
}

export default function NotificationSettings() {
  const [userPrefs, setUserPrefs] = useState<UserPrefs[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState("");

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notification-preferences");
      if (!res.ok) return;
      const data = await res.json();

      setEventTypes(data.event_types || []);

      // Build per-user preference maps
      const prefsByUser = new Map<string, Record<string, boolean>>();
      for (const p of data.preferences || []) {
        if (!prefsByUser.has(p.user_id)) prefsByUser.set(p.user_id, {});
        prefsByUser.get(p.user_id)![p.event_type] = p.email_enabled;
      }

      if (data.users) {
        // Admin view: all users
        setUserPrefs(
          data.users.map((u: { id: string; name: string; email: string; role: string }) => ({
            ...u,
            prefs: prefsByUser.get(u.id) || {},
          }))
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const togglePref = (userId: string, eventType: string) => {
    setUserPrefs((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const current = u.prefs[eventType] ?? true; // default: enabled
        return { ...u, prefs: { ...u.prefs, [eventType]: !current } };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult("");

    try {
      for (const user of userPrefs) {
        const preferences = eventTypes.map((et) => ({
          event_type: et,
          email_enabled: user.prefs[et] ?? true,
        }));

        const res = await fetch("/api/admin/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, preferences }),
        });

        if (!res.ok) {
          const data = await res.json();
          setSaveResult(`Error saving for ${user.name}: ${data.error}`);
          setSaving(false);
          return;
        }
      }

      setSaveResult("Notification preferences saved");
    } catch {
      setSaveResult("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Email Notifications
        </h2>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Email Notifications
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Configure which events trigger email notifications for each team member.
        All notifications are enabled by default.
      </p>

      {userPrefs.length === 0 ? (
        <p className="text-sm text-gray-400">No team members found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Team Member
                </th>
                {eventTypes.map((et) => (
                  <th
                    key={et}
                    className="text-center py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {EVENT_TYPE_LABELS[et] || et}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {userPrefs.map((user) => (
                <tr key={user.id}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  {eventTypes.map((et) => {
                    const enabled = user.prefs[et] ?? true;
                    return (
                      <td key={et} className="text-center py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => togglePref(user.id, et)}
                          className={`w-8 h-5 rounded-full relative transition-colors ${
                            enabled
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              enabled ? "left-3.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Notification Preferences"}
        </Button>
        {saveResult && (
          <span
            className={`text-sm ${
              saveResult.startsWith("Error")
                ? "text-red-600"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {saveResult}
          </span>
        )}
      </div>
    </div>
  );
}
