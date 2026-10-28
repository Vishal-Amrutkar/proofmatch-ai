"use client";

import React, { useState } from "react";
import { ExtractedCandidateFields, OcrJobProgress } from "../lib/ocrExtractor";

interface OcrReviewPanelProps {
  file: File | null;
  extractedFields: ExtractedCandidateFields | null;
  editedReference: string;
  editedAmount: string;
  editedDate: string;
  onReferenceChange: (val: string) => void;
  onAmountChange: (val: string) => void;
  onDateChange: (val: string) => void;
  isOcrRunning: boolean;
  ocrProgress: OcrJobProgress | null;
  ocrError: string | null;
  onRunOcr: () => void;
  onResetOcr?: () => void;
}

export function OcrReviewPanel({
  file,
  extractedFields,
  editedReference,
  editedAmount,
  editedDate,
  onReferenceChange,
  onAmountChange,
  onDateChange,
  isOcrRunning,
  ocrProgress,
  ocrError,
  onRunOcr,
}: OcrReviewPanelProps) {
  const [isRawTextExpanded, setIsRawTextExpanded] = useState(false);

  if (!file) {
    return null;
  }

  const hasExtracted = extractedFields !== null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      {/* Header and Extract Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Screenshot Text Extraction (Local OCR)
            </h3>
            {hasExtracted && !isOcrRunning && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Ready for Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Processes locally in your browser with Tesseract.js. OCR may misread characters, so please verify candidate values.
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled={isOcrRunning}
            onClick={onRunOcr}
            className={`press-scale w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-2xs transition-colors ${
              isOcrRunning
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
            }`}
          >
            {isOcrRunning ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Extracting Text...</span>
              </>
            ) : hasExtracted ? (
              <>
                <svg
                  className="w-4 h-4 text-blue-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                <span>Re-Extract Text</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-blue-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Extract Payment Details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar during OCR */}
      {isOcrRunning && (
        <div className="p-4 rounded-lg bg-blue-50/80 border border-blue-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
            <span>{ocrProgress?.status || "Running local OCR..."}</span>
            <span className="font-mono">
              {Math.round((ocrProgress?.progress || 0) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${Math.max(5, Math.round((ocrProgress?.progress || 0) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-blue-700/80">
            Note: First run downloads the ~4MB English traineddata file to browser cache; subsequent runs are instant and work offline.
          </p>
        </div>
      )}

      {/* OCR Error Display */}
      {ocrError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="space-y-1 flex-1">
            <p className="font-semibold text-rose-900">OCR Recognition Failed</p>
            <p className="leading-relaxed">{ocrError}</p>
            <button
              type="button"
              onClick={onRunOcr}
              className="mt-1 text-xs font-semibold text-rose-700 underline hover:text-rose-900"
            >
              Click here to retry
            </button>
          </div>
        </div>
      )}

      {/* Extracted Fields Form */}
      {hasExtracted && !isOcrRunning && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reference Candidate Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ocr-reference"
                  className="text-xs font-bold text-slate-800"
                >
                  Transaction Reference / UTR
                </label>
                {extractedFields.referenceConfidence === "high" ? (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Extracted
                  </span>
                ) : extractedFields.referenceConfidence === "low" ? (
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Review Required
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Not Found
                  </span>
                )}
              </div>
              <input
                id="ocr-reference"
                type="text"
                value={editedReference}
                onChange={(e) => onReferenceChange(e.target.value)}
                placeholder="e.g. UTR998877665544"
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                {extractedFields.referenceSource ||
                  "Check screenshot for UTR, Txn ID, or Ref No."}
              </p>
            </div>

            {/* Amount Candidate Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ocr-amount"
                  className="text-xs font-bold text-slate-800"
                >
                  Payment Amount (₹)
                </label>
                {extractedFields.amountConfidence === "high" ? (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Extracted
                  </span>
                ) : extractedFields.amountConfidence === "low" ? (
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Review Required
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Not Found
                  </span>
                )}
              </div>
              <input
                id="ocr-amount"
                type="text"
                value={editedAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="e.g. 1499.00"
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                {extractedFields.amountSource ||
                  "Enter the verified amount shown on the receipt."}
              </p>
            </div>

            {/* Date Candidate Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ocr-date"
                  className="text-xs font-bold text-slate-800"
                >
                  Payment Date (Optional)
                </label>
                {extractedFields.dateConfidence === "high" ? (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Extracted
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Optional
                  </span>
                )}
              </div>
              <input
                id="ocr-date"
                type="text"
                value={editedDate}
                onChange={(e) => onDateChange(e.target.value)}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                {extractedFields.dateSource ||
                  "Date is optional for reconciliation."}
              </p>
            </div>
          </div>

          {/* Collapsible Raw Recognized Text Panel */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRawTextExpanded(!isRawTextExpanded)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isRawTextExpanded ? "rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>
                {isRawTextExpanded
                  ? "Hide full recognized OCR text"
                  : "View full recognized OCR text"}
              </span>
            </button>

            {isRawTextExpanded && (
              <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {extractedFields.rawText || "(No text detected in screenshot)"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

