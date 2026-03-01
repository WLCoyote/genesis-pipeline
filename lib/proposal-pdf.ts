/**
 * Proposal PDF generation via @react-pdf/renderer
 *
 * Flat-rate style: shows included items without individual prices.
 * Clean, print-friendly, 1-page layout with signature + terms.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CompanyInfo, ProposalTerms } from "@/lib/company-settings";

// ---------- Types ----------

export interface ProposalPdfLineItem {
  displayName: string;
  specLine?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ProposalPdfData {
  estimateNumber: string;
  customerName: string;
  customerAddress: string | null;
  technicianName: string;
  signedAt: string; // ISO date
  signedName: string;
  signedIp: string;
  signatureDataUrl: string; // data:image/png;base64,...

  selectedTierName: string;
  tierItems: ProposalPdfLineItem[];
  addonItems: ProposalPdfLineItem[];

  subtotal: number;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number;

  financingLabel?: string | null;
  financingMonthly?: number | null;
  financingMonths?: number | null;

  paymentScheduleType: string; // "standard" or "large_job"

  companyInfo: CompanyInfo;
  proposalTerms: ProposalTerms;
}

// ---------- Styles ----------

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 50,
    paddingHorizontal: 36,
    color: "#1a1a1a",
  },
  // Header
  header: {
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#0a2540",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#e65100",
    marginTop: 3,
  },
  estimateNum: {
    fontSize: 8,
    color: "#888",
    marginTop: 2,
  },
  // Info row
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 9,
    color: "#1a1a1a",
  },
  // Section title
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  // Flat rate item list
  itemRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingLeft: 4,
  },
  itemBullet: {
    width: 10,
    fontSize: 8,
    color: "#999",
  },
  itemName: {
    flex: 1,
    fontSize: 9,
    color: "#333",
  },
  itemSpec: {
    fontSize: 8,
    color: "#777",
    paddingLeft: 14,
    marginBottom: 2,
  },
  itemQty: {
    width: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "right",
  },
  // Totals
  totalsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 9,
    color: "#666",
    width: 110,
    textAlign: "right",
    marginRight: 10,
  },
  totalValue: {
    fontSize: 9,
    width: 75,
    textAlign: "right",
  },
  totalBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
  },
  financingText: {
    fontSize: 9,
    color: "#e65100",
  },
  // Payment schedule
  paymentBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 3,
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#0a2540",
  },
  paymentText: {
    fontSize: 8,
    color: "#444",
    marginBottom: 1,
  },
  // Signature
  sigSection: {
    marginTop: 14,
    borderTopWidth: 2,
    borderTopColor: "#0a2540",
    paddingTop: 8,
  },
  sigTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    marginBottom: 6,
  },
  sigImage: {
    width: 180,
    height: 50,
    marginBottom: 3,
  },
  sigName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sigInfo: {
    fontSize: 8,
    color: "#666",
    marginBottom: 1,
  },
  // Terms
  termsSection: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 7,
    color: "#888",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
});

// ---------- Helpers ----------

function fmt(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- Document Component ----------

function ProposalDocument({ data }: { data: ProposalPdfData }) {
  const el = React.createElement;

  // Build flat item list for tier
  function itemList(items: ProposalPdfLineItem[], keyPrefix: string) {
    const elements: React.ReactElement[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      elements.push(
        el(View, { style: s.itemRow, key: `${keyPrefix}-${i}` },
          el(Text, { style: s.itemBullet }, "\u2022"),
          el(Text, { style: s.itemName },
            item.quantity > 1 ? `${item.displayName} (x${item.quantity})` : item.displayName
          ),
        )
      );
      if (item.specLine) {
        elements.push(
          el(Text, { style: s.itemSpec, key: `${keyPrefix}-spec-${i}` }, item.specLine)
        );
      }
    }
    return elements;
  }

  const co = data.companyInfo;
  const terms = data.proposalTerms;

  return el(Document, null,
    el(Page, { size: "LETTER", style: s.page },

      // ── Header ──
      el(View, { style: s.header },
        el(Text, { style: s.companyName }, co.company_name),
        el(Text, { style: s.docTitle }, "SIGNED PROPOSAL"),
        el(Text, { style: s.estimateNum }, `Estimate ${data.estimateNumber}`)
      ),

      // ── Customer / Date / Tech ──
      el(View, { style: s.infoRow },
        el(View, { style: s.infoBlock },
          el(Text, { style: s.infoLabel }, "Customer"),
          el(Text, { style: s.infoValue }, data.customerName),
          data.customerAddress
            ? el(Text, { style: { ...s.infoValue, fontSize: 8, color: "#555" } }, data.customerAddress)
            : null
        ),
        el(View, { style: s.infoBlock },
          el(Text, { style: s.infoLabel }, "Date Signed"),
          el(Text, { style: s.infoValue }, fmtDate(data.signedAt)),
          el(Text, { style: { ...s.infoLabel, marginTop: 4 } }, "Technician"),
          el(Text, { style: s.infoValue }, data.technicianName)
        )
      ),

      // ── Selected Package (flat rate — no prices per item) ──
      el(Text, { style: s.sectionTitle }, `Selected Package: ${data.selectedTierName}`),
      ...itemList(data.tierItems, "tier"),

      // ── Add-ons ──
      ...(data.addonItems.length > 0
        ? [
            el(Text, { style: { ...s.sectionTitle, marginTop: 8 }, key: "addon-title" }, "Selected Add-Ons"),
            ...itemList(data.addonItems, "addon"),
          ]
        : []),

      // ── Totals ──
      el(View, { style: s.totalsBox },
        // Subtotal (only show if different from total, i.e. there's tax)
        data.taxAmount != null && data.taxAmount > 0
          ? el(View, { style: s.totalRow },
              el(Text, { style: s.totalLabel }, "Subtotal"),
              el(Text, { style: s.totalValue }, fmt(data.subtotal))
            )
          : null,
        // Tax
        data.taxAmount != null && data.taxRate != null && data.taxAmount > 0
          ? el(View, { style: s.totalRow },
              el(Text, { style: s.totalLabel }, `Tax (${(data.taxRate * 100).toFixed(2)}%)`),
              el(Text, { style: s.totalValue }, fmt(data.taxAmount))
            )
          : null,
        // Total
        el(View, { style: s.totalRow },
          el(Text, { style: { ...s.totalLabel, ...s.totalBold } }, "Total"),
          el(Text, { style: { ...s.totalValue, ...s.totalBold } }, fmt(data.totalAmount))
        ),
        // Financing
        data.financingLabel && data.financingMonthly
          ? el(View, { style: { ...s.totalRow, marginTop: 2 } },
              el(Text, { style: { ...s.totalLabel, ...s.financingText } }, data.financingLabel),
              el(Text, { style: { ...s.totalValue, ...s.financingText } }, `${fmt(data.financingMonthly)}/mo`)
            )
          : null
      ),

      // ── Payment Schedule ──
      el(View, { style: s.paymentBox },
        el(Text, { style: s.paymentTitle }, "Payment Schedule"),
        ...(data.paymentScheduleType === "large_job"
          ? [
              el(Text, { style: s.paymentText, key: "p1" }, `1. 50% deposit when scheduled: ${fmt(data.totalAmount * 0.5)}`),
              el(Text, { style: s.paymentText, key: "p2" }, `2. 25% after rough-in complete: ${fmt(data.totalAmount * 0.25)}`),
              el(Text, { style: s.paymentText, key: "p3" }, `3. 25% after install complete: ${fmt(data.totalAmount * 0.25)}`),
              el(Text, { style: s.paymentText, key: "p4" }, "4. Final $1,000 after final inspection"),
            ]
          : [
              el(Text, { style: s.paymentText, key: "p1" }, `1. 50% deposit when scheduled: ${fmt(data.totalAmount * 0.5)}`),
              el(Text, { style: s.paymentText, key: "p2" }, `2. 50% upon install complete: ${fmt(data.totalAmount * 0.5)}`),
            ])
      ),

      // ── Signature ──
      el(View, { style: s.sigSection },
        el(Text, { style: s.sigTitle }, "Customer Acceptance"),
        data.signatureDataUrl
          ? el(Image, { style: s.sigImage, src: data.signatureDataUrl })
          : null,
        el(Text, { style: s.sigName }, data.signedName),
        el(Text, { style: s.sigInfo }, `Date: ${fmtDate(data.signedAt)}`),
        el(Text, { style: { ...s.sigInfo, color: "#aaa" } }, `IP: ${data.signedIp}`)
      ),

      // ── Terms & Conditions ──
      el(View, { style: s.termsSection },
        el(Text, { style: s.termsTitle }, "Terms & Conditions"),
        el(Text, { style: s.termsText }, terms.authorization),
        el(Text, { style: s.termsText }, `Labor Warranty: ${terms.labor_warranty}`),
        el(Text, { style: s.termsText }, `Financing: ${terms.financing}`),
        el(Text, { style: s.termsText }, `Cancellation: ${terms.cancellation}`)
      ),

      // ── Footer ──
      el(Text, { style: s.footer },
        `${co.company_name} | ${co.license_state} License: ${co.license_number} | ${co.phone} | ${co.website}`
      )
    )
  );
}

// ---------- Export ----------

export async function generateProposalPdf(
  data: ProposalPdfData
): Promise<Buffer> {
  const doc = React.createElement(ProposalDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await renderToBuffer(doc as any);
}
