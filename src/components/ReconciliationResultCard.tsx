"use client";

import React from "react";
import { MatchResult } from "../lib/matcher";
import { downloadReconciliationReport } from "../lib/reportExporter";

interface ReconciliationResultCardProps {
  result: MatchResult;
  onReset: () => void;
}

export function ReconciliationResultCard({
  result,
  onReset,
}: ReconciliationResultCardProps) {
  const isMatch = result.status === "MATCHED TO CSV";
  const isMismatch = result.status === "AMOUNT MISMATCH";
  const isDuplicate = result.status === "DUPLICATE REFERENCE";
  const isNotFound = result.status === "REFERENCE NOT FOUND";

  const getStatusBadgeClass = () => {
    switch (result.statusType) {
      case "success":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "warning":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "error":
        return "bg-rose-50 text-rose-800 border-rose-300";
      default:
        return "bg-blue-50 text-blue-800 border-blue-300";
    }
  };

  const handleDownload = () => {
    downloadReconciliationReport(result);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Reconciliation Result
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {result.headline}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border tracking-wide ${getStatusBadgeClass()}`}
          >
            {isMatch ? (
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : isNotFound ? (
              <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            <span>{result.status}</span>
          </span>
        </div>
      </div>

      {/* Plain English Reason */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-sm text-slate-800 space-y-1.5">
        <p className="font-semibold text-slate-900">Summary Evidence</p>
        <p className="leading-relaxed font-normal">{result.reason}</p>
        {result.dateMismatchNote && (
          <p className="text-xs text-amber-800 font-medium bg-amber-50/80 border border-amber-200/70 p-2 rounded mt-2">
            ⚠️ {result.dateMismatchNote}
          </p>
        )}
      </div>

      {/* Field Comparison Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Compared Values
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Screenshot Column */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-200/80 pb-1.5 flex items-center justify-between">
              <span>Customer Payment Screenshot</span>
              <span className="text-[10px] text-slate-500 font-normal">Source Image</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Reference / UTR:</span>
                <span className="font-mono font-bold text-slate-900">
                  {result.screenshotReference || "—"}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{result.screenshotAmount || "—"}
                </span>
              </div>
              {result.screenshotDate && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-mono text-slate-700">{result.screenshotDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Matched CSV Column */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-200/80 pb-1.5 flex items-center justify-between">
              <span>Seller CSV Statement</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {result.matchedTransaction
                  ? `Row #${result.matchedTransaction.rowNumber}`
                  : "No Direct Match"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {result.matchedTransaction?.rawReference || "—"}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Amount:</span>
                <span
                  className={`font-mono font-bold ${
                    result.matchedTransaction
                      ? result.comparisonDetails.amountMatch
                        ? "text-emerald-700"
                        : "text-rose-700"
                      : "text-slate-900"
                  }`}
                >
                  {result.matchedTransaction
                    ? `₹${result.matchedTransaction.formattedAmount}`
                    : "—"}
                </span>
              </div>
              {result.matchedTransaction?.date && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-mono text-slate-700">
                    {result.matchedTransaction.date}
                  </span>
                </div>
              )}
              {result.matchedTransaction?.status && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Statement Status:</span>
                  <span className="font-medium text-slate-800">
                    {result.matchedTransaction.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Rows Table (Duplicates or Amount Suggestions) */}
      {result.candidateTransactions.length > 0 && !isMatch && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isDuplicate
                ? "All Matching Duplicate Records"
                : isMismatch
                ? "CSV Record with Matching Reference"
                : "Candidate Records Sharing Amount (Suggestions Only)"}
            </h3>
            <span className="text-[11px] text-slate-500">
              {result.candidateTransactions.length} row(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">CSV Row #</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {result.candidateTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-600">
                      Row #{tx.rowNumber}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{tx.rawReference}</td>
                    <td className="py-2 px-3 text-slate-800">₹{tx.formattedAmount}</td>
                    <td className="py-2 px-3 text-slate-600">{tx.date || "—"}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{tx.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mandatory Safety Notice Banner */}
      <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
        <svg
          className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="leading-relaxed">
          <span className="font-bold">Important Limitation: </span>
          {result.safetyNotice}
        </p>
      </div>

      {/* Actions: Download CSV Report & Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="press-scale w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs"
        >
          Reset Reconciliation
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="press-scale w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download CSV Report</span>
        </button>
      </div>
    </div>
  );
}

