import { parseAmountToPaise, formatPaise } from "./csvParser";

export interface ExtractedCandidateFields {
  reference: string;
  referenceConfidence: "high" | "low" | "missing";
  referenceSource?: string;

  amount: string;
  amountConfidence: "high" | "low" | "missing";
  amountPaise: number | null;
  amountSource?: string;

  date: string;
  dateConfidence: "high" | "low" | "missing";
  dateSource?: string;

  rawText: string;
}

export interface OcrJobProgress {
  status: string;
  progress: number; // 0 to 1
  stage: "init" | "loading-core" | "loading-lang" | "recognizing" | "completed" | "error";
}

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

/**
 * Conservative, explainable heuristics for extracting payment candidate fields from OCR text.
 * Avoids aggressive guessing; preserves uncertainty.
 */
export function extractCandidateFields(rawText: string): ExtractedCandidateFields {
  if (!rawText || !rawText.trim()) {
    return {
      reference: "",
      referenceConfidence: "missing",
      amount: "",
      amountConfidence: "missing",
      amountPaise: null,
      date: "",
      dateConfidence: "missing",
      rawText: "",
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Reference Extraction Heuristics
  let extractedRef = "";
  let refConfidence: "high" | "low" | "missing" = "missing";
  let refSource: string | undefined = undefined;

  // Pattern A: Labeled reference keywords (UPI Ref, UTR, Txn ID, Transaction ID, RRN)
  const labeledRefRegex = /(?:UPI(?:\s*(?:Ref|Reference|Transaction))?(?:\s*(?:No\.?|ID|Id|Num))?|UTR|RRN|Txn(?:\s*(?:ID|Id|No\.?))?|Transaction\s*(?:ID|Id|Reference|Ref)|Ref(?:\s*(?:No\.?|ID|Id))?)\s*[:#-]?\s*([A-Za-z0-9_-]{6,35})/i;

  for (const line of lines) {
    const match = line.match(labeledRefRegex);
    if (match && match[1]) {
      const candidate = match[1].replace(/[\.,:;]+$/, "").trim();
      // Avoid false positive labels
      if (!/^(SUCCESS|FAILED|COMPLETED|PENDING|PAYMENT|AMOUNT)$/i.test(candidate)) {
        extractedRef = candidate;
        refConfidence = "high";
        refSource = `Matched labeled reference in line: "${line}"`;
        break;
      }
    }
  }

  // Pattern B: Look for standalone 12-digit numeric UTR / RRN if not found
  if (!extractedRef) {
    const twelveDigitRegex = /\b([0-9]{12})\b/;
    for (const line of lines) {
      const match = line.match(twelveDigitRegex);
      if (match && match[1]) {
        extractedRef = match[1];
        refConfidence = "low";
        refSource = `Found unlabelled 12-digit candidate in line: "${line}" (Review recommended)`;
        break;
      }
    }
  }

  // Pattern C: Common alphanumeric transaction prefix pattern (e.g. TXN100200300, UTR998877665544)
  if (!extractedRef) {
    const prefixedRefRegex = /\b((?:UTR|TXN|UPI|REF|PAY)[A-Za-z0-9]{6,25})\b/i;
    for (const line of lines) {
      const match = line.match(prefixedRefRegex);
      if (match && match[1]) {
        extractedRef = match[1];
        refConfidence = "high";
        refSource = `Matched standard transaction identifier format in line: "${line}"`;
        break;
      }
    }
  }

  // 2. Payment Amount Extraction Heuristics
  let extractedAmount = "";
  let amountConfidence: "high" | "low" | "missing" = "missing";
  let amountPaise: number | null = null;
  let amountSource: string | undefined = undefined;

  // Pattern A: Currency symbol prefixed amount (₹, Rs., INR, $, €)
  const currencyAmountRegex = /(?:₹|Rs\.?|INR|\$|€|£)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;

  for (const line of lines) {
    const match = line.match(currencyAmountRegex);
    if (match && match[1]) {
      const parsed = parseAmountToPaise(match[1]);
      if (parsed !== null && parsed > 0) {
        extractedAmount = formatPaise(parsed);
        amountPaise = parsed;
        amountConfidence = "high";
        amountSource = `Matched currency amount in line: "${line}"`;
        break;
      }
    }
  }

  // Pattern B: Labeled amount keywords (Paid, Amount, Total, Sent, Transferred)
  if (!extractedAmount) {
    const labeledAmountRegex = /(?:Paid|Amount|Total|Sent|Transferred|Payment\s*Amount)\s*[:₹\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
    for (const line of lines) {
      const match = line.match(labeledAmountRegex);
      if (match && match[1]) {
        const parsed = parseAmountToPaise(match[1]);
        if (parsed !== null && parsed > 0) {
          extractedAmount = formatPaise(parsed);
          amountPaise = parsed;
          amountConfidence = "high";
          amountSource = `Matched labeled amount in line: "${line}"`;
          break;
        }
      }
    }
  }

  // Pattern C: Decimal number with 2 decimal places if lines mention payment context
  if (!extractedAmount) {
    const decimalAmountRegex = /\b([0-9]{1,5}\.[0-9]{2})\b/;
    for (const line of lines) {
      const match = line.match(decimalAmountRegex);
      if (match && match[1]) {
        const parsed = parseAmountToPaise(match[1]);
        if (parsed !== null && parsed > 0) {
          extractedAmount = formatPaise(parsed);
          amountPaise = parsed;
          amountConfidence = "low";
          amountSource = `Found decimal number candidate in line: "${line}" (Review recommended)`;
          break;
        }
      }
    }
  }

  // 3. Date Extraction Heuristics
  let extractedDate = "";
  let dateConfidence: "high" | "low" | "missing" = "missing";
  let dateSource: string | undefined = undefined;

  // Pattern A: DD Mon YYYY (e.g. 28 Oct 2026, 28 October 2026)
  const ddMonYyyyRegex = /\b(0?[1-9]|[12][0-9]|3[01])\s+([A-Za-z]{3,9})[,\s]+((?:19|20)\d\d)\b/i;
  for (const line of lines) {
    const match = line.match(ddMonYyyyRegex);
    if (match) {
      const day = match[1].padStart(2, "0");
      const monthStr = match[2].toLowerCase();
      const month = MONTH_MAP[monthStr];
      const year = match[3];
      if (month) {
        extractedDate = `${year}-${month}-${day}`;
        dateConfidence = "high";
        dateSource = `Matched verbal date in line: "${line}"`;
        break;
      }
    }
  }

  // Pattern B: YYYY-MM-DD
  if (!extractedDate) {
    const isoDateRegex = /\b((?:19|20)\d\d)[/\-.](0?[1-9]|1[012])[/\-.](0?[1-9]|[12][0-9]|3[01])\b/;
    for (const line of lines) {
      const match = line.match(isoDateRegex);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, "0");
        const day = match[3].padStart(2, "0");
        extractedDate = `${year}-${month}-${day}`;
        dateConfidence = "high";
        dateSource = `Matched ISO date in line: "${line}"`;
        break;
      }
    }
  }

  // Pattern C: DD/MM/YYYY or DD-MM-YYYY
  if (!extractedDate) {
    const ddmmyyyyRegex = /\b(0?[1-9]|[12][0-9]|3[01])[/\-.](0?[1-9]|1[012])[/\-.]((?:19|20)\d\d)\b/;
    for (const line of lines) {
      const match = line.match(ddmmyyyyRegex);
      if (match) {
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        const year = match[3];
        extractedDate = `${year}-${month}-${day}`;
        dateConfidence = "high";
        dateSource = `Matched standard numeric date in line: "${line}"`;
        break;
      }
    }
  }

  return {
    reference: extractedRef,
    referenceConfidence: refConfidence,
    referenceSource: refSource,
    amount: extractedAmount,
    amountConfidence: amountConfidence,
    amountPaise: amountPaise,
    amountSource: amountSource,
    date: extractedDate,
    dateConfidence: dateConfidence,
    dateSource: dateSource,
    rawText,
  };
}
