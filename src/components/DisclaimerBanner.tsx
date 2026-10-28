import React from "react";

export function DisclaimerBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 text-slate-800">
      <div className="flex items-start gap-3.5">
        <div className="flex-shrink-0 mt-0.5 text-amber-600">
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
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-amber-950">
            Important Safety & Verification Notice
          </p>
          <p className="text-amber-900 leading-relaxed">
            <strong>This tool compares a screenshot with the CSV you provide. A match is not proof that money reached your account. Confirm the credit in your trusted bank or payment app.</strong>
          </p>
          <div className="pt-1.5 flex items-center gap-2 text-xs text-amber-800">
            <svg
              className="w-4 h-4 text-emerald-600 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              <strong>Privacy guarantee:</strong> File processing and OCR run locally in your browser. No images or financial records are uploaded to any server.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
