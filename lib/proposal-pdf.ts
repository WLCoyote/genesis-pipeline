/**
 * Proposal PDF generation via @react-pdf/renderer
 *
 * Generates a clean, print-friendly signed proposal PDF.
 * White background, dark text, Genesis branding.
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
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#0a2540",
    paddingBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#e65100",
    marginTop: 4,
  },
  estimateNum: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colName: { flex: 3 },
  colSpec: { flex: 3 },
  colQty: { flex: 0.5, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 9,
    color: "#333",
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
    width: 120,
    textAlign: "right",
    marginRight: 12,
  },
  totalValue: {
    fontSize: 10,
    width: 80,
    textAlign: "right",
  },
  totalBold: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
  },
  paymentSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#0a2540",
  },
  paymentText: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  signatureSection: {
    marginTop: 24,
    borderTopWidth: 2,
    borderTopColor: "#0a2540",
    paddingTop: 12,
  },
  signatureTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0a2540",
    marginBottom: 10,
  },
  signatureImage: {
    width: 200,
    height: 60,
    marginBottom: 6,
  },
  signatureInfo: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 8,
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
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.companyName }, "Genesis Heating, Cooling & Refrigeration"),
        React.createElement(Text, { style: styles.docTitle }, "SIGNED PROPOSAL"),
        React.createElement(Text, { style: styles.estimateNum }, `Estimate ${data.estimateNumber}`)
      ),

      // Customer / Date / Technician info
      React.createElement(
        View,
        { style: styles.infoRow },
        React.createElement(
          View,
          { style: styles.infoBlock },
          React.createElement(Text, { style: styles.infoLabel }, "Customer"),
          React.createElement(Text, { style: styles.infoValue }, data.customerName),
          data.customerAddress
            ? React.createElement(Text, { style: { ...styles.infoValue, fontSize: 9, color: "#555" } }, data.customerAddress)
            : null
        ),
        React.createElement(
          View,
          { style: styles.infoBlock },
          React.createElement(Text, { style: styles.infoLabel }, "Date Signed"),
          React.createElement(Text, { style: styles.infoValue }, fmtDate(data.signedAt)),
          React.createElement(Text, { style: { ...styles.infoLabel, marginTop: 6 } }, "Technician"),
          React.createElement(Text, { style: styles.infoValue }, data.technicianName)
        )
      ),

      // Selected Package
      React.createElement(Text, { style: styles.sectionTitle }, `Selected Package: ${data.selectedTierName}`),
      // Table header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: { ...styles.headerText, ...styles.colName } }, "Item"),
        React.createElement(Text, { style: { ...styles.headerText, ...styles.colSpec } }, "Description"),
        React.createElement(Text, { style: { ...styles.headerText, ...styles.colQty } }, "Qty"),
        React.createElement(Text, { style: { ...styles.headerText, ...styles.colPrice } }, "Price"),
        React.createElement(Text, { style: { ...styles.headerText, ...styles.colTotal } }, "Total")
      ),
      // Table rows
      ...data.tierItems.map((item, i) =>
        React.createElement(
          View,
          { style: styles.tableRow, key: `tier-${i}` },
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colName } }, item.displayName),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colSpec } }, item.specLine || ""),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colQty } }, String(item.quantity)),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colPrice } }, fmt(item.unitPrice)),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colTotal } }, fmt(item.lineTotal))
        )
      ),

      // Add-ons (if any)
      ...(data.addonItems.length > 0
        ? [
            React.createElement(Text, { style: styles.sectionTitle, key: "addon-title" }, "Selected Add-Ons"),
            React.createElement(
              View,
              { style: styles.tableHeader, key: "addon-header" },
              React.createElement(Text, { style: { ...styles.headerText, ...styles.colName } }, "Item"),
              React.createElement(Text, { style: { ...styles.headerText, ...styles.colSpec } }, "Description"),
              React.createElement(Text, { style: { ...styles.headerText, ...styles.colQty } }, "Qty"),
              React.createElement(Text, { style: { ...styles.headerText, ...styles.colPrice } }, "Price"),
              React.createElement(Text, { style: { ...styles.headerText, ...styles.colTotal } }, "Total")
            ),
            ...data.addonItems.map((item, i) =>
              React.createElement(
                View,
                { style: styles.tableRow, key: `addon-${i}` },
                React.createElement(Text, { style: { ...styles.cellText, ...styles.colName } }, item.displayName),
                React.createElement(Text, { style: { ...styles.cellText, ...styles.colSpec } }, item.specLine || ""),
                React.createElement(Text, { style: { ...styles.cellText, ...styles.colQty } }, String(item.quantity)),
                React.createElement(Text, { style: { ...styles.cellText, ...styles.colPrice } }, fmt(item.unitPrice)),
                React.createElement(Text, { style: { ...styles.cellText, ...styles.colTotal } }, fmt(item.lineTotal))
              )
            ),
          ]
        : []),

      // Totals
      React.createElement(
        View,
        { style: styles.totalsSection },
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, "Subtotal"),
          React.createElement(Text, { style: styles.totalValue }, fmt(data.subtotal))
        ),
        data.taxAmount != null && data.taxRate != null
          ? React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(
                Text,
                { style: styles.totalLabel },
                `Tax (${(data.taxRate * 100).toFixed(2)}%)`
              ),
              React.createElement(Text, { style: styles.totalValue }, fmt(data.taxAmount))
            )
          : null,
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: { ...styles.totalLabel, ...styles.totalBold } }, "Total"),
          React.createElement(Text, { style: { ...styles.totalValue, ...styles.totalBold } }, fmt(data.totalAmount))
        ),
        data.financingLabel && data.financingMonthly
          ? React.createElement(
              View,
              { style: { ...styles.totalRow, marginTop: 4 } },
              React.createElement(
                Text,
                { style: { ...styles.totalLabel, color: "#e65100" } },
                `${data.financingLabel}`
              ),
              React.createElement(
                Text,
                { style: { ...styles.totalValue, color: "#e65100" } },
                `${fmt(data.financingMonthly)}/mo`
              )
            )
          : null
      ),

      // Payment schedule
      React.createElement(
        View,
        { style: styles.paymentSection },
        React.createElement(Text, { style: styles.paymentTitle }, "Payment Schedule"),
        ...(data.paymentScheduleType === "large_job"
          ? [
              React.createElement(Text, { style: styles.paymentText, key: "p1" }, `1. 50% deposit when scheduled: ${fmt(data.totalAmount * 0.5)}`),
              React.createElement(Text, { style: styles.paymentText, key: "p2" }, `2. 25% after rough-in complete: ${fmt(data.totalAmount * 0.25)}`),
              React.createElement(Text, { style: styles.paymentText, key: "p3" }, `3. 25% after install complete: ${fmt(data.totalAmount * 0.25)}`),
              React.createElement(Text, { style: styles.paymentText, key: "p4" }, `4. Final $1,000 after final inspection`),
            ]
          : [
              React.createElement(Text, { style: styles.paymentText, key: "p1" }, `1. 50% deposit when scheduled: ${fmt(data.totalAmount * 0.5)}`),
              React.createElement(Text, { style: styles.paymentText, key: "p2" }, `2. 50% upon install complete: ${fmt(data.totalAmount * 0.5)}`),
            ])
      ),

      // Signature block
      React.createElement(
        View,
        { style: styles.signatureSection },
        React.createElement(Text, { style: styles.signatureTitle }, "Customer Acceptance"),
        data.signatureDataUrl
          ? React.createElement(Image, { style: styles.signatureImage, src: data.signatureDataUrl })
          : null,
        React.createElement(Text, { style: styles.signatureInfo }, `Signed by: ${data.signedName}`),
        React.createElement(Text, { style: styles.signatureInfo }, `Date: ${fmtDate(data.signedAt)}`),
        React.createElement(Text, { style: { ...styles.signatureInfo, color: "#aaa" } }, `IP: ${data.signedIp}`)
      ),

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        "Genesis Heating, Cooling & Refrigeration | WA License: GENESR*788QL | (360) 805-1234 | genesishvacr.com\n" +
          "All work includes standard manufacturer warranty. Financing provided by Synchrony Bank, subject to credit approval.\n" +
          "Prices valid for 60 days from proposal date."
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
