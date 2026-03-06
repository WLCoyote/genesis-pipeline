"use client";

import { useState } from "react";
import { EmailTemplate, EmailBlock } from "@/lib/campaign-types";
import EmailTemplateBuilder from "./EmailTemplateBuilder";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import FormField, { inputCls, textareaCls } from "@/app/components/ui/FormField";

interface Props {
  initialTemplates: EmailTemplate[];
}

interface TemplateForm {
  id?: string;
  name: string;
  description: string;
  blocks: EmailBlock[];
  is_preset: boolean;
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  description: "",
  blocks: [],
  is_preset: false,
};

export default function EmailTemplateManager({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [editing, setEditing] = useState<TemplateForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "custom" | "preset">("all");

  const filtered = templates.filter((t) => {
    if (filter === "custom") return !t.is_preset;
    if (filter === "preset") return t.is_preset;
    return true;
  });

  function openCreate() {
    setEditing({ ...EMPTY_FORM });
    setError(null);
  }

  function openEdit(t: EmailTemplate) {
    setEditing({
      id: t.id,
      name: t.name,
      description: t.description || "",
      blocks: t.blocks,
      is_preset: t.is_preset,
    });
    setError(null);
  }

  function openDuplicate(t: EmailTemplate) {
    setEditing({
      name: `${t.name} (Copy)`,
      description: t.description || "",
      blocks: [...t.blocks],
      is_preset: false,
    });
    setError(null);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const url = editing.id
        ? `/api/admin/email-templates/${editing.id}`
        : "/api/admin/email-templates";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description || null,
          blocks: editing.blocks,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const saved = await res.json();

      if (editing.id) {
        setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      } else {
        setTemplates((prev) => [saved, ...prev]);
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;

    const res = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleToggleActive(t: EmailTemplate) {
    const res = await fetch(`/api/admin/email-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTemplates((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    }
  }

  // Full-page builder modal
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-normal text-ds-text">
              {editing.id ? "Edit Template" : "New Template"}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-ds-red bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <FormField label="Template Name" required>
              <input
                className={inputCls}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Seasonal Tune-Up"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={textareaCls}
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Brief description of this template..."
              />
            </FormField>
          </div>
          <div className="lg:col-span-2">
            <EmailTemplateBuilder
              initialBlocks={editing.blocks}
              onChange={(blocks) => setEditing({ ...editing, blocks })}
            />
          </div>
        </div>
      </div>
    );
  }

  // Template list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "custom", "preset"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                filter === f
                  ? "bg-ds-blue text-white"
                  : "bg-gray-100 text-ds-text-lt hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "custom" ? "Custom" : "Presets"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate}>
          + New Template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ds-text-lt text-sm">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-ds-card border rounded-xl p-4 transition-colors ${
                t.is_active ? "border-ds-border" : "border-ds-border opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-ds-text">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-ds-text-lt mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {t.is_preset && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-ds-blue-bg text-ds-blue rounded-full">
                      Preset
                    </span>
                  )}
                  {!t.is_active && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-ds-text-lt rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-ds-text-lt mb-3">
                {t.blocks.length} block{t.blocks.length !== 1 ? "s" : ""}
                {" · "}
                {new Date(t.updated_at).toLocaleDateString()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="text-xs text-ds-blue hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => openDuplicate(t)}
                  className="text-xs text-ds-blue hover:underline cursor-pointer"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleToggleActive(t)}
                  className="text-xs text-ds-text-lt hover:underline cursor-pointer"
                >
                  {t.is_active ? "Deactivate" : "Activate"}
                </button>
                {!t.is_preset && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-ds-red hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
