"use client";

import React, { useRef, useState } from "react";
import { formatFileSize, isValidCsvFile } from "../lib/utils";

interface CsvUploadCardProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
}

export function CsvUploadCard({
  file,
  onFileSelect,
  error,
  onErrorChange,
}: CsvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selectedFile: File) => {
    if (!isValidCsvFile(selectedFile)) {
      if (onErrorChange) {
        onErrorChange(
          `"${selectedFile.name}" is not a CSV file. Please upload a file with a .csv extension.`
        );
      }
      return;
    }

    // 10MB limit check
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
    onFileSelect(selectedFile);
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
    // reset input value so re-selecting same file triggers change
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (onErrorChange) onErrorChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleTriggerInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-base font-semibold text-slate-900">
              Transaction CSV
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            CSV File
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Upload your seller transaction statement export (.csv format).
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
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
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
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-800">
              Click to select or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Accepted format: <strong className="font-medium text-slate-700">CSV (.csv)</strong> with reference &amp; amount columns
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Choose CSV File
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    CSV Ready
                  </span>
                </div>
                <p
                  className="text-sm font-medium text-slate-900 truncate mt-1"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatFileSize(file.size)} • Comma-separated values
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleTriggerInput}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-2xs transition-colors"
                  >
                    Replace File
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 px-2.5 py-1 rounded shadow-2xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
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
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Required for comparison</span>
        <span className={file ? "text-emerald-600 font-medium" : "text-slate-400"}>
          {file ? "✓ Attached" : "Not uploaded"}
        </span>
      </div>
    </div>
  );
}
