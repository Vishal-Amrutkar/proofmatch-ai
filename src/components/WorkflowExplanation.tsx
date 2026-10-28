import React from "react";

export function WorkflowExplanation() {
  const steps = [
    {
      number: "1",
      title: "Upload Proof",
      description: "Customer payment screenshot (PNG, JPG, or JPEG format).",
    },
    {
      number: "2",
      title: "Provide Seller CSV",
      description: "Transaction records exported from your seller statement.",
    },
    {
      number: "3",
      title: "Verify Locally",
      description: "Deterministic matching checks reference, amount, and date in-browser.",
    },
  ];

  return (
    <section aria-labelledby="workflow-heading" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 id="workflow-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Reconciliation Workflow
        </h2>
        <span className="text-[11px] text-slate-400 font-medium">Deterministic rules · No LLM guessing</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50/70 border border-slate-200/60"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
              {step.number}
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
