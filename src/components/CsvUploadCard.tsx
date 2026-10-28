"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { formatFileSize, isValidCsvFile } from "../lib/utils";
import { parseTransactionCsv, CsvParseResult } from "../lib/csvParser";

interface CsvUploadCardProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  onParsedResultChange?: (result: CsvParseResult | null) => void;
}

export function CsvUploadCard({
  file,
  onFileSelect,
  error,
  onErrorChange,
  onParsedResultChange,
}: CsvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<CsvParseResult | null>(null);

  const processFile = useCallback(
    async (selectedFile: File) => {
      setIsParsing(true);
      try {
        const result = await parseTransactionCsv(selectedFile);
        setIsParsing(false);
        setParsedData(result);
        if (onParsedResultChange) onParsedResultChange(result);

        if (!result.isValid && result.errors.length > 0) {
          if (onErrorChange) {
            onErrorChange(result.errors[0]);
          }
        } else {
          if (onErrorChange) onErrorChange(null);
        }
      } catch (err) {
        setIsParsing(false);
        const errMsg = err instanceof Error ? err.message : "Failed to parse CSV";
        if (onErrorChange) onErrorChange(errMsg);
      }
    },
    [onErrorChange, onParsedResultChange]
  );

  // If file is passed externally or cleared externally, respond appropriately
  useEffect(() => {
    let active = true;
    if (file && !parsedData) {
      parseTransactionCsv(file).then((res) => {
        if (!active) return;
        setParsedData(res);
        if (onParsedResultChange) onParsedResultChange(res);
      });
    }
    return () => {
      active = false;
    };
  }, [file, parsedData, onParsedResultChange]);

  const activeParsedData = file ? parsedData : null;

  const handleFile = (selectedFile: File) => {
    if (!isValidCsvFile(selectedFile)) {
      if (onErrorChange) {
        onErrorChange(
          `"${selectedFile.name}" is not a CSV file. Please upload a file with a .csv extension.`
        );
      }
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      if (onErrorChange) {
        onErrorChange(
          `"${selectedFile.name}" exceeds 10MB (${formatFileSize(
            selectedFile.size
          )}). Please provide a smaller CSV file.`
        );
      }
      return;
    }

    if (onErrorChange) onErrorChange(null);
    setParsedData(null);
    if (onParsedResultChange) onParsedResultChange(null);
    onFileSelect(selectedFile);
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setParsedData(null);
    if (onParsedResultChange) onParsedResultChange(null);
    if (onErrorChange) onErrorChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleTriggerInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Transaction CSV
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
            Seller Statement
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Upload exported bank or seller transaction statement (.csv format).
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Upload Transaction CSV"
        />

        {!file ? (
          <div
            onClick={handleTriggerInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTriggerInput();
              }
            }}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isDragging
                ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <div className="mx-auto w-11 h-11 rounded-full bg-blue-50/90 flex items-center justify-center text-blue-600 mb-3 border border-blue-100">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {isDragging ? "Drop CSV file to upload" : "Click to select or drag and drop"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Requires columns: <strong className="font-semibold text-slate-700">reference</strong> &amp; <strong className="font-semibold text-slate-700">amount</strong>
            </p>
            <button
              type="button"
              className="press-scale mt-3.5 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200"
            >
              Choose CSV File
            </button>
          </div>
        ) : (
          <div className="border border-slate-200/90 rounded-lg p-4 bg-slate-50/80 space-y-3.5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isParsing ? (
                    <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Parsing CSV...
                    </span>
                  ) : activeParsedData?.isValid ? (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {activeParsedData.totalRows} Records Parsed
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Invalid CSV
                    </span>
                  )}
                  {activeParsedData?.hasDuplicateReferences && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Duplicates Detected
                    </span>
                  )}
                </div>
                <p
                  className="text-xs sm:text-sm font-semibold text-slate-900 truncate mt-1"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {formatFileSize(file.size)} • Comma-separated values
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleTriggerInput}
                    className="press-scale text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-2.5 py-1 rounded shadow-2xs"
                  >
                    Replace CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="press-scale text-xs font-semibold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded shadow-2xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Column Detection Summary */}
            {activeParsedData?.detectedColumns && (
              <div className="bg-white rounded-md p-2.5 border border-slate-200 text-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Detected Column Mapping
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400">Ref: </span>
                    <span className="text-slate-900 font-semibold">
                      {activeParsedData.detectedColumns.reference}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Amount: </span>
                    <span className="text-slate-900 font-semibold">
                      {activeParsedData.detectedColumns.amount}
                    </span>
                  </div>
                  {activeParsedData.detectedColumns.date && (
                    <div>
                      <span className="text-slate-400">Date: </span>
                      <span className="text-slate-700 font-medium">
                        {activeParsedData.detectedColumns.date}
                      </span>
                    </div>
                  )}
                  {activeParsedData.detectedColumns.status && (
                    <div>
                      <span className="text-slate-400">Status: </span>
                      <span className="text-slate-700 font-medium">
                        {activeParsedData.detectedColumns.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview of first few rows */}
            {activeParsedData && activeParsedData.isValid && activeParsedData.transactions.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>
                    Data Preview (first {Math.min(activeParsedData.transactions.length, 5)} of {activeParsedData.totalRows} rows)
                  </span>
                  <span className="text-emerald-700 font-semibold">Ready for Matching</span>
                </div>
                <div className="overflow-x-auto rounded border border-slate-200 bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-1 px-2">#</th>
                        <th className="py-1 px-2">Reference</th>
                        <th className="py-1 px-2 text-right">Amount</th>
                        <th className="py-1 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {activeParsedData.transactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-1 px-2 text-slate-400">{tx.rowNumber}</td>
                          <td className="py-1 px-2 font-medium text-slate-800 truncate max-w-[130px]">
                            {tx.rawReference}
                          </td>
                          <td className="py-1 px-2 text-right font-medium text-slate-900">
                            ₹{tx.formattedAmount}
                          </td>
                          <td className="py-1 px-2 text-slate-500">
                            {tx.date || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Validation errors when invalid */}
            {activeParsedData && !activeParsedData.isValid && activeParsedData.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-semibold text-rose-900">CSV Validation Errors:</p>
                {activeParsedData.errors.map((err, eIdx) => (
                  <p key={eIdx} className="leading-relaxed">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {/* Warnings if any */}
            {activeParsedData?.warnings && activeParsedData.warnings.length > 0 && (
              <div className="p-2.5 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 space-y-1">
                {activeParsedData.warnings.map((warning, wIdx) => (
                  <p key={wIdx} className="leading-tight">
                    • {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600"
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
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Required input</span>
        <span
          className={
            activeParsedData?.isValid
              ? "text-emerald-700 font-semibold"
              : file
              ? "text-rose-600 font-semibold"
              : "text-slate-400"
          }
        >
          {activeParsedData?.isValid
            ? `✓ ${activeParsedData.totalRows} Rows Loaded`
            : file
            ? "Validation Failed"
            : "Pending upload"}
        </span>
      </div>
    </div>
  );
}
