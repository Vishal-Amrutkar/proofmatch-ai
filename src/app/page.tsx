"use client";

import React, { useState, useRef, useCallback } from "react";
import { Navigation } from "../components/Navigation";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { WorkflowExplanation } from "../components/WorkflowExplanation";
import { ScreenshotUploadCard } from "../components/ScreenshotUploadCard";
import { CsvUploadCard } from "../components/CsvUploadCard";
import { OcrReviewPanel } from "../components/OcrReviewPanel";
import { ReconciliationResultCard } from "../components/ReconciliationResultCard";
import { CsvParseResult } from "../lib/csvParser";
import { ExtractedCandidateFields, OcrJobProgress } from "../lib/ocrExtractor";
import { runClientOcr } from "../lib/tesseractService";
import { reconcileScreenshotWithCsv, MatchResult } from "../lib/matcher";

export default function Home() {
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<CsvParseResult | null>(null);

  // OCR Extraction State
  const [extractedOcrFields, setExtractedOcrFields] = useState<ExtractedCandidateFields | null>(null);
  const [editedReference, setEditedReference] = useState("");
  const [editedAmount, setEditedAmount] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [isReferenceUserReviewed, setIsReferenceUserReviewed] = useState(false);
  const [isAmountUserReviewed, setIsAmountUserReviewed] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrJobProgress | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const ocrAbortControllerRef = useRef<AbortController | null>(null);

  const [reconciliationResult, setReconciliationResult] = useState<MatchResult | null>(null);

  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [globalValidationMessage, setGlobalValidationMessage] = useState<{
    type: "error" | "info";
    title: string;
    text: string;
  } | null>(null);

  const clearOcrState = useCallback(() => {
    if (ocrAbortControllerRef.current) {
      ocrAbortControllerRef.current.abort();
      ocrAbortControllerRef.current = null;
    }
    setIsOcrRunning(false);
    setOcrProgress(null);
    setOcrError(null);
    setExtractedOcrFields(null);
    setEditedReference("");
    setEditedAmount("");
    setEditedDate("");
    setIsReferenceUserReviewed(false);
    setIsAmountUserReviewed(false);
  }, []);

  const handleReferenceChange = (val: string) => {
    setIsReferenceUserReviewed(true);
    setEditedReference(val);
    if (reconciliationResult) setReconciliationResult(null);
  };

  const handleAmountChange = (val: string) => {
    setIsAmountUserReviewed(true);
    setEditedAmount(val);
    if (reconciliationResult) setReconciliationResult(null);
  };

  const handleScreenshotChange = (file: File | null) => {
    // Prevent stale OCR results from previous file
    clearOcrState();
    setScreenshotFile(file);
    if (globalValidationMessage) setGlobalValidationMessage(null);
    if (reconciliationResult) setReconciliationResult(null);
  };

  const handleCsvChange = (file: File | null) => {
    setCsvFile(file);
    if (!file) setParsedCsv(null);
    if (globalValidationMessage) setGlobalValidationMessage(null);
    if (reconciliationResult) setReconciliationResult(null);
  };

  const handleRunOcr = async () => {
    if (!screenshotFile) return;

    if (ocrAbortControllerRef.current) {
      ocrAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    ocrAbortControllerRef.current = controller;

    setIsOcrRunning(true);
    setOcrError(null);
    setOcrProgress({
      status: "Starting local OCR engine...",
      progress: 0.05,
      stage: "init",
    });

    try {
      const extracted = await runClientOcr(screenshotFile, {
        signal: controller.signal,
        onProgress: (prog) => {
          setOcrProgress(prog);
        },
      });

      if (!controller.signal.aborted) {
        setIsOcrRunning(false);
        setExtractedOcrFields(extracted);
        setEditedReference(extracted.reference);
        setEditedAmount(extracted.amount);
        setEditedDate(extracted.date);
        setIsReferenceUserReviewed(false);
        setIsAmountUserReviewed(false);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setIsOcrRunning(false);
        const msg = err instanceof Error ? err.message : String(err);
        setOcrError(msg);
      }
    }
  };

  const handleAnalyzeClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenshotFile && !csvFile) {
      setGlobalValidationMessage({
        type: "error",
        title: "Both Inputs Required",
        text: "Please upload both a payment screenshot and a transaction CSV before starting analysis.",
      });
      return;
    }

    if (!screenshotFile) {
      setGlobalValidationMessage({
        type: "error",
        title: "Payment Screenshot Missing",
        text: "Please attach a customer payment screenshot (PNG, JPG, or JPEG) to verify.",
      });
      return;
    }

    if (!csvFile) {
      setGlobalValidationMessage({
        type: "error",
        title: "Transaction CSV Missing",
        text: "Please attach your seller transaction CSV statement to match records against.",
      });
      return;
    }

    if (!parsedCsv || !parsedCsv.isValid) {
      setGlobalValidationMessage({
        type: "error",
        title: "Invalid CSV Records",
        text:
          parsedCsv?.errors[0] ||
          "The uploaded CSV could not be parsed. Check that it contains required reference and amount columns.",
      });
      return;
    }

    // Check if OCR has been run or fields reviewed
    if (!extractedOcrFields && !editedReference && !editedAmount) {
      setGlobalValidationMessage({
        type: "error",
        title: "Screenshot Details Needed",
        text: "Please click 'Extract Payment Details' above to extract and verify the transaction reference and amount from the screenshot.",
      });
      return;
    }

    if (!editedReference.trim()) {
      setGlobalValidationMessage({
        type: "error",
        title: "Transaction Reference Required",
        text: "Please review and enter the transaction reference (UTR / ID) from the screenshot.",
      });
      return;
    }

    if (!editedAmount.trim()) {
      setGlobalValidationMessage({
        type: "error",
        title: "Payment Amount Required",
        text: "Please review and enter the payment amount from the screenshot.",
      });
      return;
    }

    // Determine effective confidence: if user has edited/confirmed the field, consider it verified
    const effectiveRefConfidence =
      isReferenceUserReviewed || (extractedOcrFields && editedReference.trim() !== extractedOcrFields.reference.trim())
        ? "high"
        : extractedOcrFields?.referenceConfidence || "high";

    const effectiveAmountConfidence =
      isAmountUserReviewed || (extractedOcrFields && editedAmount.trim() !== extractedOcrFields.amount.trim())
        ? "high"
        : extractedOcrFields?.amountConfidence || "high";

    // Run deterministic reconciliation
    const match = reconcileScreenshotWithCsv(
      {
        reference: editedReference.trim(),
        amount: editedAmount.trim(),
        date: editedDate.trim() || undefined,
        referenceConfidence: effectiveRefConfidence,
        amountConfidence: effectiveAmountConfidence,
      },
      parsedCsv.transactions
    );

    setReconciliationResult(match);
    setGlobalValidationMessage(null);
  };

  const handleReset = () => {
    clearOcrState();
    setScreenshotFile(null);
    setCsvFile(null);
    setParsedCsv(null);
    setScreenshotError(null);
    setCsvError(null);
    setGlobalValidationMessage(null);
    setReconciliationResult(null);
  };

  const isReady = Boolean(
    screenshotFile &&
      csvFile &&
      parsedCsv?.isValid &&
      editedReference.trim() &&
      editedAmount.trim()
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Heading & Introduction */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-100">
            Reconciliation Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify a Payment
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed font-normal">
            Compare customer payment screenshots against your own transaction records to verify reference IDs, transaction amounts, and dates with deterministic transparency.
          </p>
        </div>

        {/* Safety & Privacy Notice Banner */}
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
              onParsedResultChange={setParsedCsv}
            />
          </div>

          {/* OCR Review and Field Correction Panel (Phase 3) */}
          <OcrReviewPanel
            file={screenshotFile}
            extractedFields={extractedOcrFields}
            editedReference={editedReference}
            editedAmount={editedAmount}
            editedDate={editedDate}
            onReferenceChange={handleReferenceChange}
            onAmountChange={handleAmountChange}
            onDateChange={setEditedDate}
            isOcrRunning={isOcrRunning}
            ocrProgress={ocrProgress}
            ocrError={ocrError}
            onRunOcr={handleRunOcr}
          />

          {/* Validation Feedback Banner */}
          {globalValidationMessage && (
            <div
              role="alert"
              className={`rounded-xl p-4 sm:p-5 border text-sm flex items-start gap-3.5 shadow-2xs ${
                globalValidationMessage.type === "error"
                  ? "bg-rose-50/90 border-rose-200 text-rose-900"
                  : "bg-blue-50/90 border-blue-200 text-blue-950"
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              )}
              <div className="space-y-1">
                <p className="font-bold tracking-tight">
                  {globalValidationMessage.title}
                </p>
                <p className="leading-relaxed font-normal">
                  {globalValidationMessage.text}
                </p>
                {globalValidationMessage.type === "info" && (
                  <p className="text-xs text-blue-800/80 pt-1 font-medium">
                    Limitation reminder: Matching seller records does not independently verify settlement in your bank account. No fabricated results or simulated confirmations are shown.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="text-xs text-slate-500 text-center sm:text-left font-medium">
              {isReady ? (
                <span className="text-emerald-800 font-semibold flex items-center gap-1.5 justify-center sm:justify-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  Verified candidate fields and {parsedCsv?.totalRows} CSV records ready.
                </span>
              ) : (
                <span>
                  Attach screenshot, run OCR review, and provide valid CSV to reconcile.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {(screenshotFile || csvFile || globalValidationMessage || reconciliationResult) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="press-scale w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs"
                >
                  Reset All
                </button>
              )}
              <button
                type="submit"
                className="press-scale w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-xs flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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

        {/* Reconciliation Result Panel (Phases 4 & 5) */}
        {reconciliationResult && (
          <section id="reconciliation-result" aria-label="Reconciliation Result">
            <ReconciliationResultCard
              result={reconciliationResult}
              onReset={handleReset}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-semibold text-slate-700">
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
