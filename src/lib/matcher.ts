import {
  ParsedTransaction,
  normalizeReference,
  parseAmountToPaise,
  formatPaise,
} from "./csvParser";

export type MatchStatus =
  | "MATCHED TO CSV"
  | "AMOUNT MISMATCH"
  | "DUPLICATE REFERENCE"
  | "REFERENCE NOT FOUND"
  | "AMBIGUOUS — REVIEW REQUIRED"
  | "OCR NEEDS REVIEW";

export interface MatchInput {
  reference: string;
  amount: string;
  date?: string;
  referenceConfidence?: "high" | "low" | "missing";
  amountConfidence?: "high" | "low" | "missing";
}

export interface MatchResult {
  status: MatchStatus;
  statusType: "success" | "warning" | "error" | "info";
  headline: string;
  reason: string;

  // Screenshot input details
  screenshotReference: string;
  normalizedScreenshotReference: string;
  screenshotAmount: string;
  screenshotAmountPaise: number | null;
  screenshotDate?: string;

  // Matched and candidate rows
  matchedTransaction?: ParsedTransaction;
  candidateTransactions: ParsedTransaction[];

  // Field-level comparison
  dateMismatchNote?: string;
  comparisonDetails: {
    referenceMatch: boolean;
    amountMatch: boolean;
    dateMatch?: boolean;
    screenshot: {
      reference: string;
      amount: string;
      date?: string;
    };
    csv?: {
      reference: string;
      amount: string;
      date?: string;
      status?: string;
      rowNumber: number;
    };
  };

  timestamp: string;
  safetyNotice: string;
}

export const SAFETY_DISCLAIMER =
  "This tool compares a screenshot with the CSV you provide. A match is not proof that money reached your account. Confirm the credit in your trusted bank or payment app.";

/**
 * Pure, deterministic reconciliation engine.
 * Never uses an LLM; compares references using conservative normalization
 * and amounts using exact integer paise representations.
 */
export function reconcileScreenshotWithCsv(
  input: MatchInput,
  transactions: ParsedTransaction[]
): MatchResult {
  const timestamp = new Date().toISOString();
  const rawRef = (input.reference || "").trim();
  const rawAmount = (input.amount || "").trim();
  const rawDate = (input.date || "").trim();

  const normalizedRef = normalizeReference(rawRef);
  const screenshotPaise = parseAmountToPaise(rawAmount);

  // 1. OCR / Input Incomplete: Essential fields missing or invalid
  if (!rawRef || screenshotPaise === null || screenshotPaise <= 0) {
    let reason = "Essential transaction fields could not be verified from screenshot.";
    if (!rawRef && (screenshotPaise === null || screenshotPaise <= 0)) {
      reason = "Both transaction reference (UTR/ID) and payment amount are required for reconciliation.";
    } else if (!rawRef) {
      reason = "Transaction reference ID is missing. Enter the reference number from the screenshot to continue.";
    } else {
      reason = `Payment amount "${rawAmount}" is invalid. Please enter a valid currency amount (e.g. 799.00).`;
    }

    return {
      status: "OCR NEEDS REVIEW",
      statusType: "warning",
      headline: "Screenshot Fields Require Review",
      reason,
      screenshotReference: rawRef,
      normalizedScreenshotReference: normalizedRef,
      screenshotAmount: rawAmount,
      screenshotAmountPaise: screenshotPaise,
      screenshotDate: rawDate || undefined,
      candidateTransactions: [],
      comparisonDetails: {
        referenceMatch: false,
        amountMatch: false,
        screenshot: {
          reference: rawRef || "(missing)",
          amount: rawAmount || "(missing)",
          date: rawDate || undefined,
        },
      },
      timestamp,
      safetyNotice: SAFETY_DISCLAIMER,
    };
  }

  // 2. OCR Confidence Safety Guard:
  // If essential fields have low confidence or require review, never mark as MATCHED TO CSV.
  // Return OCR NEEDS REVIEW for low-confidence amount or AMBIGUOUS — REVIEW REQUIRED for low-confidence reference.

  // 2A. Low-confidence amount requires verification
  if (input.amountConfidence === "low") {
    const referenceMatches = transactions.filter(
      (t) => t.normalizedReference === normalizedRef
    );
    const amountSuggestions = transactions.filter(
      (t) => t.amountPaise === screenshotPaise
    );
    const candidates = referenceMatches.length > 0 ? referenceMatches : amountSuggestions.slice(0, 5);

    return {
      status: "OCR NEEDS REVIEW",
      statusType: "warning",
      headline: "Payment Amount Requires Verification",
      reason: `The payment amount (₹${formatPaise(screenshotPaise)}) was extracted with low confidence (unverified OCR candidate). Review and confirm the amount shown on the screenshot before reconciling.`,
      screenshotReference: rawRef,
      normalizedScreenshotReference: normalizedRef,
      screenshotAmount: formatPaise(screenshotPaise),
      screenshotAmountPaise: screenshotPaise,
      screenshotDate: rawDate || undefined,
      candidateTransactions: candidates,
      matchedTransaction: referenceMatches.length === 1 ? referenceMatches[0] : undefined,
      comparisonDetails: {
        referenceMatch: referenceMatches.length > 0,
        amountMatch: false,
        screenshot: {
          reference: rawRef,
          amount: formatPaise(screenshotPaise),
          date: rawDate || undefined,
        },
        csv: referenceMatches.length === 1 ? {
          reference: referenceMatches[0].rawReference,
          amount: referenceMatches[0].formattedAmount,
          date: referenceMatches[0].date,
          status: referenceMatches[0].status,
          rowNumber: referenceMatches[0].rowNumber,
        } : undefined,
      },
      timestamp,
      safetyNotice: SAFETY_DISCLAIMER,
    };
  }

  // 2B. Missing or low-confidence reference requires review
  if (input.referenceConfidence === "missing" || input.referenceConfidence === "low") {
    const referenceMatches = transactions.filter(
      (t) => t.normalizedReference === normalizedRef
    );
    const amountSuggestions = transactions.filter(
      (t) => t.amountPaise === screenshotPaise
    );
    const candidates = referenceMatches.length > 0 ? referenceMatches : amountSuggestions.slice(0, 5);

    return {
      status: "AMBIGUOUS — REVIEW REQUIRED",
      statusType: "warning",
      headline: "Uncertain Transaction Reference — Review Required",
      reason: "The transaction reference was extracted with low confidence or uncertainty. Review and confirm the reference ID from the screenshot before reconciling.",
      screenshotReference: rawRef,
      normalizedScreenshotReference: normalizedRef,
      screenshotAmount: formatPaise(screenshotPaise),
      screenshotAmountPaise: screenshotPaise,
      screenshotDate: rawDate || undefined,
      candidateTransactions: candidates,
      matchedTransaction: referenceMatches.length === 1 ? referenceMatches[0] : undefined,
      comparisonDetails: {
        referenceMatch: referenceMatches.length > 0,
        amountMatch: referenceMatches.length > 0 && referenceMatches[0].amountPaise === screenshotPaise,
        screenshot: {
          reference: rawRef,
          amount: formatPaise(screenshotPaise),
          date: rawDate || undefined,
        },
        csv: referenceMatches.length === 1 ? {
          reference: referenceMatches[0].rawReference,
          amount: referenceMatches[0].formattedAmount,
          date: referenceMatches[0].date,
          status: referenceMatches[0].status,
          rowNumber: referenceMatches[0].rowNumber,
        } : undefined,
      },
      timestamp,
      safetyNotice: SAFETY_DISCLAIMER,
    };
  }

  // 3. Search CSV transactions for matching normalized reference
  const referenceMatches = transactions.filter(
    (t) => t.normalizedReference === normalizedRef
  );

  // 4. DUPLICATE REFERENCE: More than one row shares the reference
  if (referenceMatches.length > 1) {
    return {
      status: "DUPLICATE REFERENCE",
      statusType: "warning",
      headline: "Multiple CSV Records Share This Reference",
      reason: `More than one CSV row (${referenceMatches.length} rows) contains normalized reference "${normalizedRef}". Review all candidate records below; no single row can be safely confirmed.`,
      screenshotReference: rawRef,
      normalizedScreenshotReference: normalizedRef,
      screenshotAmount: formatPaise(screenshotPaise),
      screenshotAmountPaise: screenshotPaise,
      screenshotDate: rawDate || undefined,
      candidateTransactions: referenceMatches,
      comparisonDetails: {
        referenceMatch: true,
        amountMatch: referenceMatches.some((r) => r.amountPaise === screenshotPaise),
        screenshot: {
          reference: rawRef,
          amount: formatPaise(screenshotPaise),
          date: rawDate || undefined,
        },
      },
      timestamp,
      safetyNotice: SAFETY_DISCLAIMER,
    };
  }

  // 5. Unique Reference Match found in CSV
  if (referenceMatches.length === 1) {
    const matched = referenceMatches[0];
    const amountMatches = matched.amountPaise === screenshotPaise;

    // Check optional dates if present in both screenshot and CSV
    let dateMismatchNote: string | undefined = undefined;
    let dateMatch: boolean | undefined = undefined;
    if (rawDate && matched.date) {
      dateMatch = rawDate === matched.date;
      if (!dateMatch) {
        dateMismatchNote = `Date difference flagged: screenshot has "${rawDate}", while CSV statement records "${matched.date}".`;
      }
    }

    if (amountMatches) {
      // 5A. MATCHED TO CSV
      let reason = `Reference "${normalizedRef}" and payment amount ₹${formatPaise(screenshotPaise)} match CSV row #${matched.rowNumber}.`;
      if (dateMismatchNote) {
        reason += ` ${dateMismatchNote}`;
      }

      return {
        status: "MATCHED TO CSV",
        statusType: "success",
        headline: "Transaction Reconciled to CSV Statement",
        reason,
        screenshotReference: rawRef,
        normalizedScreenshotReference: normalizedRef,
        screenshotAmount: formatPaise(screenshotPaise),
        screenshotAmountPaise: screenshotPaise,
        screenshotDate: rawDate || undefined,
        matchedTransaction: matched,
        candidateTransactions: [matched],
        dateMismatchNote,
        comparisonDetails: {
          referenceMatch: true,
          amountMatch: true,
          dateMatch,
          screenshot: {
            reference: rawRef,
            amount: formatPaise(screenshotPaise),
            date: rawDate || undefined,
          },
          csv: {
            reference: matched.rawReference,
            amount: matched.formattedAmount,
            date: matched.date,
            status: matched.status,
            rowNumber: matched.rowNumber,
          },
        },
        timestamp,
        safetyNotice: SAFETY_DISCLAIMER,
      };
    } else {
      // 5B. AMOUNT MISMATCH
      const reason = `Reference "${normalizedRef}" matches CSV row #${matched.rowNumber}, but the amounts differ. Screenshot shows ₹${formatPaise(screenshotPaise)}, while CSV statement records ₹${matched.formattedAmount}.`;

      return {
        status: "AMOUNT MISMATCH",
        statusType: "warning",
        headline: "Reference Found, But Amount Differs",
        reason,
        screenshotReference: rawRef,
        normalizedScreenshotReference: normalizedRef,
        screenshotAmount: formatPaise(screenshotPaise),
        screenshotAmountPaise: screenshotPaise,
        screenshotDate: rawDate || undefined,
        matchedTransaction: matched,
        candidateTransactions: [matched],
        comparisonDetails: {
          referenceMatch: true,
          amountMatch: false,
          dateMatch,
          screenshot: {
            reference: rawRef,
            amount: formatPaise(screenshotPaise),
            date: rawDate || undefined,
          },
          csv: {
            reference: matched.rawReference,
            amount: matched.formattedAmount,
            date: matched.date,
            status: matched.status,
            rowNumber: matched.rowNumber,
          },
        },
        timestamp,
        safetyNotice: SAFETY_DISCLAIMER,
      };
    }
  }

  // 6. REFERENCE NOT FOUND in CSV
  // Check if any rows share the same amount (for helpful suggestions, never as confirmed match)
  const amountSuggestions = transactions.filter(
    (t) => t.amountPaise === screenshotPaise
  );

  let reason = `Reference "${normalizedRef}" does not exist in the uploaded CSV statement.`;
  if (amountSuggestions.length > 0) {
    reason += ` Found ${amountSuggestions.length} record(s) sharing amount ₹${formatPaise(screenshotPaise)} under different references (shown below as suggestions only — not confirmed matches).`;
  }

  return {
    status: "REFERENCE NOT FOUND",
    statusType: "error",
    headline: "Transaction Reference Not Found in CSV",
    reason,
    screenshotReference: rawRef,
    normalizedScreenshotReference: normalizedRef,
    screenshotAmount: formatPaise(screenshotPaise),
    screenshotAmountPaise: screenshotPaise,
    screenshotDate: rawDate || undefined,
    candidateTransactions: amountSuggestions.slice(0, 5),
    comparisonDetails: {
      referenceMatch: false,
      amountMatch: amountSuggestions.length > 0,
      screenshot: {
        reference: rawRef,
        amount: formatPaise(screenshotPaise),
        date: rawDate || undefined,
      },
    },
    timestamp,
    safetyNotice: SAFETY_DISCLAIMER,
  };
}

