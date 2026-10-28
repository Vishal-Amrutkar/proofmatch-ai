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

interface AmountCandidate {
  raw: string;
  paise: number;
  formatted: string;
  line: string;
  score: number;
  hasCurrencySymbol: boolean;
  hasPaymentKeyword: boolean;
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
 * Extracts all amount candidates with scoring based on currency symbols,
 * payment keywords, and formatting contexts.
 * Never strips leading digits from comma-separated amounts.
 */
function extractAndScoreAmounts(lines: string[]): {
  amount: string;
  amountConfidence: "high" | "low" | "missing";
  amountPaise: number | null;
  amountSource?: string;
} {
  const candidatesByPaise = new Map<number, AmountCandidate>();

  // Regex to match currency-prefixed amounts (handles ₹, Rs, INR, $, €, £)
  // [0-9]{1,3}(?:,[0-9]{2,3})* correctly supports Indian (lakhs) and international comma grouping
  const CURRENCY_PREFIX_REGEX = /(?:[₹$€£]|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;

  // Regex to match amounts preceded by payment keywords
  const LABELED_AMOUNT_REGEX = /(?:total\s*amount|paid\s*amount|amount\s*paid|payment\s*amount|total|paid|amount|sent|transferred|credited|debited)\s*[:₹\s]*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;

  // Regex to match standalone numeric values with lookbehind/lookahead to prevent stripping leading digits
  const STANDALONE_NUMBER_REGEX = /(?<![\d,])([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)(?![\d,])/g;

  lines.forEach((line) => {
    const isExplicitFinalTotal = /\b(total\s*paid|amount\s*paid|paid\s*amount|grand\s*total|final\s*amount|net\s*amount)\b/i.test(line);
    const isGeneralPayment = /\b(total|paid|amount|sent|transferred|credited|debited)\b/i.test(line);
    const isLineItem = /\b(subtotal|sub-total|fee|tax|gst|charge|conv|delivery|discount|balance)\b/i.test(line);

    // 1. Currency-prefixed matches
    let match: RegExpExecArray | null;
    while ((match = CURRENCY_PREFIX_REGEX.exec(line)) !== null) {
      const rawNum = match[1];
      const paise = parseAmountToPaise(rawNum);
      if (paise !== null && paise > 0) {
        let score = 90;
        if (isExplicitFinalTotal) score += 40;
        else if (isGeneralPayment && !isLineItem) score += 25;
        if (isLineItem) score -= 45;
        if (line.trim().replace(/[₹$€£,\s]/g, "") === rawNum.replace(/[,\s]/g, "")) {
          // The line is essentially just the currency amount (dominant header)
          score += 30;
        }

        const existing = candidatesByPaise.get(paise);
        if (!existing || score > existing.score) {
          candidatesByPaise.set(paise, {
            raw: rawNum,
            paise,
            formatted: formatPaise(paise),
            line,
            score,
            hasCurrencySymbol: true,
            hasPaymentKeyword: isGeneralPayment,
          });
        }
      }
    }

    // 2. Keyword-labeled matches
    while ((match = LABELED_AMOUNT_REGEX.exec(line)) !== null) {
      const rawNum = match[1];
      const paise = parseAmountToPaise(rawNum);
      if (paise !== null && paise > 0) {
        let score = 80;
        const hasCurrency = /[₹$€£]|Rs|INR/i.test(line);
        if (hasCurrency) score += 20;
        if (isExplicitFinalTotal) score += 30;
        if (isLineItem) score -= 45;

        const existing = candidatesByPaise.get(paise);
        if (!existing || score > existing.score) {
          candidatesByPaise.set(paise, {
            raw: rawNum,
            paise,
            formatted: formatPaise(paise),
            line,
            score,
            hasCurrencySymbol: hasCurrency,
            hasPaymentKeyword: true,
          });
        }
      }
    }

    // 3. Standalone number matches (e.g. when OCR drops the ₹ glyph)
    while ((match = STANDALONE_NUMBER_REGEX.exec(line)) !== null) {
      const rawNum = match[1];
      // Skip integers with 10+ digits (likely reference/phone) or 4 digits (likely year)
      if (!rawNum.includes(".") && (rawNum.length >= 10 || rawNum.length === 4)) {
        continue;
      }
      // Skip numbers adjacent to date slashes or hyphens (e.g. 28/10/2026)
      const idx = match.index;
      if (idx > 0 && (line[idx - 1] === "/" || line[idx - 1] === "-")) continue;
      if (
        idx + rawNum.length < line.length &&
        (line[idx + rawNum.length] === "/" || line[idx + rawNum.length] === "-")
      ) {
        continue;
      }

      const paise = parseAmountToPaise(rawNum);
      if (paise !== null && paise > 0) {
        // Standalone numbers require a decimal point to qualify as an amount
        if (rawNum.includes(".")) {
          let score = 45;
          if (line.trim() === rawNum) score += 30; // Entire line is the amount
          if (isExplicitFinalTotal) score += 35;
          else if (isGeneralPayment && !isLineItem) score += 20;
          if (isLineItem) score -= 45;

          const existing = candidatesByPaise.get(paise);
          if (!existing || score > existing.score) {
            candidatesByPaise.set(paise, {
              raw: rawNum,
              paise,
              formatted: formatPaise(paise),
              line,
              score,
              hasCurrencySymbol: false,
              hasPaymentKeyword: isGeneralPayment,
            });
          }
        }
      }
    }
  });

  const candidates = Array.from(candidatesByPaise.values()).sort(
    (a, b) => b.score - a.score
  );

  if (candidates.length === 0) {
    return {
      amount: "",
      amountConfidence: "missing",
      amountPaise: null,
      amountSource: undefined,
    };
  }

  const top = candidates[0];

  // Disambiguation: Check if multiple distinct plausible amounts exist
  const competingCandidates = candidates.filter(
    (c) => c.paise !== top.paise && c.score >= 60 && Math.abs(top.score - c.score) <= 25
  );

  if (competingCandidates.length > 0) {
    // Multiple plausible amounts detected -> mark for manual review!
    const listStr = candidates
      .slice(0, 3)
      .map((c) => `₹${c.formatted}`)
      .join(", ");
    return {
      amount: top.formatted,
      amountConfidence: "low",
      amountPaise: top.paise,
      amountSource: `Multiple candidate amounts detected in screenshot (${listStr}). Please verify and edit if needed.`,
    };
  }

  if (top.score >= 75) {
    return {
      amount: top.formatted,
      amountConfidence: "high",
      amountPaise: top.paise,
      amountSource: `Matched payment amount ₹${top.formatted} in: "${top.line}"`,
    };
  }

  // Moderate score (e.g. standalone number without explicit currency symbol)
  return {
    amount: top.formatted,
    amountConfidence: "low",
    amountPaise: top.paise,
    amountSource: `Extracted candidate amount ₹${top.formatted} from: "${top.line}" (Review recommended)`,
  };
}

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

  // 2. Payment Amount Extraction (Refined)
  const amountResult = extractAndScoreAmounts(lines);

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
    amount: amountResult.amount,
    amountConfidence: amountResult.amountConfidence,
    amountPaise: amountResult.amountPaise,
    amountSource: amountResult.amountSource,
    date: extractedDate,
    dateConfidence: dateConfidence,
    dateSource: dateSource,
    rawText,
  };
}
