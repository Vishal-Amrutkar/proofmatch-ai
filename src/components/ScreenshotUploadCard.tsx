"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { formatFileSize, isValidImageFile } from "../lib/utils";

interface ScreenshotUploadCardProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
}

export function ScreenshotUploadCard({
  file,
  onFileSelect,
  error,
  onErrorChange,
}: ScreenshotUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (selectedFile: File) => {
    if (!isValidImageFile(selectedFile)) {
      if (onErrorChange) {
        onErrorChange(
          `"${selectedFile.name}" is not a supported image. Please upload a PNG, JPG, or JPEG file.`
        );
      }
      return;
    }

    // 10MB limit check
    if (selectedFile.size > 10 * 1024 * 1024) {
      if (onErrorChange) {
        onErrorChange(
          `"${selectedFile.name}" exceeds the 10MB limit (${formatFileSize(
            selectedFile.size
          )}). Please choose a smaller image.`
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
              Payment Screenshot
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Image File
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Upload customer&apos;s payment confirmation or receipt screenshot.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Upload Payment Screenshot"
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
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-800">
              Click to select or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Accepted formats: <strong className="font-medium text-slate-700">PNG, JPG, JPEG</strong> (max 10MB)
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Choose Screenshot
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <div className="flex items-start gap-4">
              {previewUrl && (
                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-slate-200 border border-slate-200 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Payment screenshot preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Selected
                  </span>
                </div>
                <p
                  className="text-sm font-medium text-slate-900 truncate mt-1"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatFileSize(file.size)} • {file.type || "image file"}
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
