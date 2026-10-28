"use client";

import React, { useState } from "react";
import { Navigation } from "../components/Navigation";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { WorkflowExplanation } from "../components/WorkflowExplanation";
import { ScreenshotUploadCard } from "../components/ScreenshotUploadCard";
import { CsvUploadCard } from "../components/CsvUploadCard";

export default function Home() {
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [globalValidationMessage, setGlobalValidationMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const handleScreenshotChange = (file: File | null) => {
    setScreenshotFile(file);
    if (globalValidationMessage) setGlobalValidationMessage(null);
  };

  const handleCsvChange = (file: File | null) => {
    setCsvFile(file);
    if (globalValidationMessage) setGlobalValidationMessage(null);
  };

  const handleAnalyzeClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenshotFile && !csvFile) {
      setGlobalValidationMessage({
        type: "error",
        text: "Both files are required. Please upload a payment screenshot and your transaction CSV before proceeding.",
      });
      return;
    }

    if (!screenshotFile) {
      setGlobalValidationMessage({
        type: "error",
        text: "Payment screenshot is missing. Please upload a screenshot (PNG, JPG, or JPEG) to compare.",
      });
      return;
    }

    if (!csvFile) {
      setGlobalValidationMessage({
        type: "error",
        text: "Transaction CSV is missing. Please upload your seller transaction records file (.csv).",
      });
      return;
    }

    // Both files are present and validated for Phase 1
    setGlobalValidationMessage({
      type: "info",
      text: "Input files successfully validated! In the upcoming phase, local in-browser OCR (Tesseract.js) and deterministic CSV comparison rules will execute here.",
    });
  };

  const handleReset = () => {
    setScreenshotFile(null);
    setCsvFile(null);
    setScreenshotError(null);
    setCsvError(null);
    setGlobalValidationMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Heading & Introduction */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            Reconciliation Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify a Payment
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Compare customer payment screenshots against your own transaction records to verify reference IDs, transaction amounts, and dates with deterministic transparency.
          </p>
        </div>

        {/* Safety & Privacy Banner */}
        <DisclaimerBanner />

        {/* Workflow Overview */}
        <WorkflowExplanation />

        {/* Upload Cards Grid */}
        <form onSubmit={handleAnalyzeClick} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScreenshotUploadCard
              file={screenshotFile}
              onFileSelect={handleScreenshotChange}
              error={screenshotError}
              onErrorChange={setScreenshotError}
            />

            <CsvUploadCard
              file={csvFile}
              onFileSelect={handleCsvChange}
              error={csvError}
              onErrorChange={setCsvError}
            />
          </div>

          {/* Validation Banner */}
          {globalValidationMessage && (
            <div
              className={`rounded-xl p-4 sm:p-5 border text-sm flex items-start gap-3 ${
                globalValidationMessage.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              {globalValidationMessage.type === "error" ? (
                <svg
                  className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {globalValidationMessage.type === "error"
                    ? "Input Validation Error"
                    : "Phase 1 Validation Passed"}
                </p>
                <p className="leading-relaxed">
                  {globalValidationMessage.text}
                </p>
                {globalValidationMessage.type === "info" && (
                  <p className="text-xs text-blue-700/80 pt-1">
                    Note: To maintain truthfulness and prevent false claims, no artificial matching or fabricated results are generated before actual OCR and CSV parsers are linked.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              {screenshotFile && csvFile ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Both required files attached. Ready to analyze.
                </span>
              ) : (
                <span>
                  Attach both a payment screenshot and a transaction CSV to enable reconciliation.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {(screenshotFile || csvFile || globalValidationMessage) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                >
                  Reset
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="w-4 h-4 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Analyze Payment</span>
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-medium text-slate-700">
            ProofMatch AI — Client-Side Payment Reconciliation
          </p>
          <p>
            Reconciliation against seller-provided records only. Does not constitute independent bank settlement confirmation.
          </p>
        </div>
      </footer>
    </div>
  );
}
