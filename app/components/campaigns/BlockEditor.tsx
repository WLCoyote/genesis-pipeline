"use client";

import { EmailBlock } from "@/lib/campaign-types";
import FormField, { inputCls, textareaCls } from "@/app/components/ui/FormField";

interface Props {
  block: EmailBlock;
  onChange: (content: Record<string, unknown>) => void;
}

export default function BlockEditor({ block, onChange }: Props) {
  const c = block.content;

  const set = (key: string, value: unknown) => {
    onChange({ ...c, [key]: value });
  };

  switch (block.type) {
    case "header":
      return (
        <div className="space-y-3">
          <FormField label="Title" required>
            <input
              className={inputCls}
              value={String(c.title || "")}
              onChange={(e) => set("title", e.target.value)}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-ds-text">
            <input
              type="checkbox"
              checked={c.showLogo !== false}
              onChange={(e) => set("showLogo", e.target.checked)}
            />
            Show logo
          </label>
        </div>
      );

    case "text":
      return (
        <FormField label="Content (HTML)">
          <textarea
            className={textareaCls}
            rows={6}
            value={String(c.html || "")}
            onChange={(e) => set("html", e.target.value)}
            placeholder="<p>Your message here...</p>"
          />
          <p className="text-xs text-ds-text-lt mt-1">
            Supports HTML tags: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a href=&quot;...&quot;&gt;, &lt;br&gt;
          </p>
        </FormField>
      );

    case "image":
      return (
        <div className="space-y-3">
          <FormField label="Image URL" required>
            <input
              className={inputCls}
              value={String(c.url || "")}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Alt Text">
            <input
              className={inputCls}
              value={String(c.alt || "")}
              onChange={(e) => set("alt", e.target.value)}
            />
          </FormField>
          <FormField label="Width (px)">
            <input
              type="number"
              className={inputCls}
              value={Number(c.width) || 600}
              onChange={(e) => set("width", parseInt(e.target.value) || 600)}
              max={600}
            />
          </FormField>
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <FormField label="Button Text" required>
            <input
              className={inputCls}
              value={String(c.text || "")}
              onChange={(e) => set("text", e.target.value)}
            />
          </FormField>
          <FormField label="URL" required>
            <input
              className={inputCls}
              value={String(c.url || "")}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Color">
            <input
              type="color"
              className="w-12 h-8 rounded border border-ds-border cursor-pointer"
              value={String(c.color || "#1565c0")}
              onChange={(e) => set("color", e.target.value)}
            />
          </FormField>
        </div>
      );

    case "divider":
      return (
        <FormField label="Color">
          <input
            type="color"
            className="w-12 h-8 rounded border border-ds-border cursor-pointer"
            value={String(c.color || "#e0e0e0")}
            onChange={(e) => set("color", e.target.value)}
          />
        </FormField>
      );

    case "spacer":
      return (
        <FormField label="Height (px)">
          <input
            type="number"
            className={inputCls}
            value={Number(c.height) || 24}
            onChange={(e) => set("height", parseInt(e.target.value) || 24)}
            min={8}
            max={120}
          />
        </FormField>
      );

    case "two-column":
      return (
        <div className="space-y-3">
          <FormField label="Left Column (HTML)">
            <textarea
              className={textareaCls}
              rows={4}
              value={String((c.left as Record<string, unknown>)?.html || "")}
              onChange={(e) => set("left", { html: e.target.value })}
            />
          </FormField>
          <FormField label="Right Column (HTML)">
            <textarea
              className={textareaCls}
              rows={4}
              value={String((c.right as Record<string, unknown>)?.html || "")}
              onChange={(e) => set("right", { html: e.target.value })}
            />
          </FormField>
        </div>
      );

    default:
      return <p className="text-sm text-ds-text-lt">No editor for this block type.</p>;
  }
}
