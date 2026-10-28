import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofMatch AI — Payment Verification Dashboard",
  description:
    "Reconciliation tool comparing payment screenshots with seller-provided transaction CSV records.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
