// Email block rendering — converts block definitions to table-based inline-styled HTML
// Table-based layout for maximum email client compatibility

import { EmailBlock, BlockType } from "./campaign-types";

const BRAND_BLUE = "#1565c0";
const BRAND_DARK = "#0a2540";
const LIGHT_GRAY = "#f5f5f5";
const TEXT_COLOR = "#333333";
const MUTED_COLOR = "#666666";

export function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return renderHeader(block.content);
    case "text":
      return renderText(block.content);
    case "image":
      return renderImage(block.content);
    case "button":
      return renderButton(block.content);
    case "divider":
      return renderDivider(block.content);
    case "spacer":
      return renderSpacer(block.content);
    case "two-column":
      return renderTwoColumn(block.content);
    default:
      return "";
  }
}

function renderHeader(content: Record<string, unknown>): string {
  const title = escapeHtml(String(content.title || ""));
  const showLogo = content.showLogo !== false;

  return `
    <tr>
      <td style="background-color: ${BRAND_DARK}; padding: 32px 24px; text-align: center;">
        ${showLogo ? `<img src="https://app.genesishvacr.com/genesis-logo.png" alt="Genesis HVAC" width="180" style="display: block; margin: 0 auto 16px;" />` : ""}
        <h1 style="color: #ffffff; font-family: 'Outfit', Arial, sans-serif; font-size: 28px; font-weight: 600; margin: 0; line-height: 1.3;">
          ${title}
        </h1>
      </td>
    </tr>`;
}

function renderText(content: Record<string, unknown>): string {
  const html = String(content.html || "");
  return `
    <tr>
      <td style="padding: 16px 24px; color: ${TEXT_COLOR}; font-family: 'Lato', Arial, sans-serif; font-size: 16px; line-height: 1.6;">
        ${html}
      </td>
    </tr>`;
}

function renderImage(content: Record<string, unknown>): string {
  const url = escapeHtml(String(content.url || ""));
  const alt = escapeHtml(String(content.alt || ""));
  const width = Number(content.width) || 600;

  return `
    <tr>
      <td style="padding: 16px 24px; text-align: center;">
        <img src="${url}" alt="${alt}" width="${Math.min(width, 552)}" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border-radius: 8px;" />
      </td>
    </tr>`;
}

function renderButton(content: Record<string, unknown>): string {
  const text = escapeHtml(String(content.text || "Learn More"));
  const url = escapeHtml(String(content.url || "#"));
  const color = String(content.color || BRAND_BLUE);

  return `
    <tr>
      <td style="padding: 16px 24px; text-align: center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: ${color}; border-radius: 8px; padding: 14px 32px;">
              <a href="${url}" style="color: #ffffff; font-family: 'Outfit', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;">
                ${text}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderDivider(content: Record<string, unknown>): string {
  const color = String(content.color || "#e0e0e0");
  return `
    <tr>
      <td style="padding: 8px 24px;">
        <hr style="border: none; border-top: 1px solid ${color}; margin: 0;" />
      </td>
    </tr>`;
}

function renderSpacer(content: Record<string, unknown>): string {
  const height = Number(content.height) || 24;
  return `
    <tr>
      <td style="height: ${height}px; font-size: 1px; line-height: 1px;">&nbsp;</td>
    </tr>`;
}

function renderTwoColumn(content: Record<string, unknown>): string {
  const left = (content.left as Record<string, unknown>)?.html || "";
  const right = (content.right as Record<string, unknown>)?.html || "";

  return `
    <tr>
      <td style="padding: 16px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48%" valign="top" style="color: ${TEXT_COLOR}; font-family: 'Lato', Arial, sans-serif; font-size: 16px; line-height: 1.6;">
              ${left}
            </td>
            <td width="4%"></td>
            <td width="48%" valign="top" style="color: ${TEXT_COLOR}; font-family: 'Lato', Arial, sans-serif; font-size: 16px; line-height: 1.6;">
              ${right}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Get a human-readable label for a block type
 */
export function blockTypeLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    header: "Header",
    text: "Text",
    image: "Image",
    button: "Button",
    divider: "Divider",
    spacer: "Spacer",
    "two-column": "Two Column",
  };
  return labels[type] || type;
}

/**
 * Get default content for a new block of the given type
 */
export function defaultBlockContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "header":
      return { title: "Your Headline Here", showLogo: true };
    case "text":
      return { html: "<p>Enter your message here.</p>" };
    case "image":
      return { url: "", alt: "Image", width: 600 };
    case "button":
      return { text: "Learn More", url: "https://", color: BRAND_BLUE };
    case "divider":
      return { color: "#e0e0e0" };
    case "spacer":
      return { height: 24 };
    case "two-column":
      return { left: { html: "<p>Left column</p>" }, right: { html: "<p>Right column</p>" } };
    default:
      return {};
  }
}
