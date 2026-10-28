import React from "react";

export function Navigation() {
  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs ring-1 ring-slate-900/10">
            <svg
              className="w-5 h-5 text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                ProofMatch AI
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Screenshot-to-CSV reconciliation for sellers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span>Client-Side Processing</span>
          </div>
          <span className="hidden md:inline-block text-slate-300">|</span>
          <span className="hidden md:inline-block text-slate-500 font-medium">
            Zero Server Uploads
          </span>
        </div>
      </div>
    </header>
  );
}
