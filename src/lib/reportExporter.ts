import Papa from "papaparse";
import { MatchResult } from "./matcher";

/**
 * Generates and triggers browser download of the reconciliation report as a CSV file.
 * Kept entirely client-side using Blob and object URLs.
 */
export function downloadReconciliationReport(result: MatchResult): void {
  const rows: Record<string, string>[] = [
    {
      "Reconciliation Status": result.status,
      "Explanation / Reason": result.reason,
      "Screenshot Reference": result.screenshotReference,
      "Normalized Reference": result.normalizedScreenshotReference,
      "Screenshot Amount": result.screenshotAmount,
      "Screenshot Date": result.screenshotDate || "",
      "Matched CSV Row": result.matchedTransaction?.rowNumber ? String(result.matchedTransaction.rowNumber) : "",
      "Matched CSV Reference": result.matchedTransaction?.rawReference || "",
      "Matched CSV Amount": result.matchedTransaction?.formattedAmount || "",
      "Matched CSV Date": result.matchedTransaction?.date || "",
      "Matched CSV Status": result.matchedTransaction?.status || "",
      "Date Note": result.dateMismatchNote || "",
      "Reconciliation Timestamp": result.timestamp,
      "Safety Disclaimer": result.safetyNotice,
    },
  ];

  // If there are candidate rows (e.g. for duplicates or amount suggestions), include them
  if (result.candidateTransactions.length > 1) {
    result.candidateTransactions.forEach((cand, idx) => {
      rows.push({
        "Reconciliation Status": `Candidate #${idx + 1} (${result.status})`,
        "Explanation / Reason": `Candidate record from CSV row #${cand.rowNumber}`,
        "Screenshot Reference": result.screenshotReference,
        "Normalized Reference": result.normalizedScreenshotReference,
        "Screenshot Amount": result.screenshotAmount,
        "Screenshot Date": result.screenshotDate || "",
        "Matched CSV Row": String(cand.rowNumber),
        "Matched CSV Reference": cand.rawReference,
        "Matched CSV Amount": cand.formattedAmount,
        "Matched CSV Date": cand.date || "",
        "Matched CSV Status": cand.status || "",
        "Date Note": "",
        "Reconciliation Timestamp": result.timestamp,
        "Safety Disclaimer": result.safetyNotice,
      });
    });
  }

  const csvContent = Papa.unparse(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const cleanRef = result.normalizedScreenshotReference || "report";
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `proofmatch-report-${cleanRef}-${dateStr}.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
