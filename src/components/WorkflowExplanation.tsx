import React from "react";

export function WorkflowExplanation() {
  const steps = [
    {
      number: "1",
      title: "Upload Screenshot",
      description: "Provide the customer payment screenshot (PNG, JPG, or JPEG).",
    },
    {
      number: "2",
      title: "Provide Seller CSV",
      description: "Upload your transaction statement containing reference numbers & amounts.",
    },
    {
      number: "3",
      title: "Reconcile Locally",
      description: "Details are extracted and compared deterministically right inside your browser.",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        How Verification Works
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-100"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
              {step.number}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
