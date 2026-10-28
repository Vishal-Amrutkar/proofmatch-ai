import Papa from "papaparse";

export interface ParsedTransaction {
  id: string;
  rawReference: string;
  normalizedReference: string;
  rawAmount: string;
  amountPaise: number;
  formattedAmount: string;
  date?: string;
  status?: string;
  rowNumber: number;
  rawRow: Record<string, string>;
}

export interface DetectedColumns {
  reference: string;
  amount: string;
  date?: string;
  status?: string;
}

export interface CsvParseResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalRows: number;
  transactions: ParsedTransaction[];
  detectedColumns?: DetectedColumns;
  hasDuplicateReferences: boolean;
  duplicateReferences: string[];
}

// Known header aliases per README and Phase 2 specifications
const REFERENCE_ALIASES = [
  "transaction_reference",
  "transaction reference",
  "reference",
  "reference_id",
  "reference id",
  "transaction_id",
  "transaction id",
  "txn_id",
  "txn id",
  "payment_reference",
  "payment reference",
  "payment_ref",
  "payment ref",
  "utr",
  "rrn",
  "upi_ref",
  "upi ref",
  "ref",
];

const AMOUNT_ALIASES = [
  "amount",
  "transaction_amount",
  "transaction amount",
  "paid_amount",
  "paid amount",
  "credit",
  "credited_amount",
  "credited amount",
  "credit_amount",
  "credit amount",
  "txn_amount",
  "txn amount",
  "payment_amount",
  "payment amount",
];

const DATE_ALIASES = [
  "date",
  "transaction_date",
  "transaction date",
  "payment_date",
  "payment date",
  "txn_date",
  "txn date",
];

const STATUS_ALIASES = [
  "status",
  "transaction_status",
  "transaction status",
  "payment_status",
  "payment status",
];

/**
 * Conservative reference normalization:
 * Trim whitespace, uppercase all letters, remove presentation-only spaces and hyphens.
 * Preserves original value for display.
 */
export function normalizeReference(ref: string): string {
  if (!ref) return "";
  return ref
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

/**
 * Safely parse amount into integer paise (1 unit = 100 paise)
 * Avoids JavaScript floating point representation issues.
 * Supports currency symbols (₹, $, €, £), thousands commas, and whitespace.
 * Returns null if amount is non-numeric or invalid.
 */
export function parseAmountToPaise(val: string | number): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Clean currency symbols, commas, and whitespace
  const clean = str.replace(/[₹$€£,\s]/g, "");
  // Must match optional negative sign followed by digits and optional .cents
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) {
    return null;
  }

  const [whole, decimal = ""] = clean.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const absWhole = Math.abs(parseInt(whole, 10));
  const paddedDecimal = (decimal + "00").slice(0, 2);
  const cents = parseInt(paddedDecimal, 10);

  return sign * (absWhole * 100 + cents);
}

/**
 * Format paise back to standard decimal string (e.g. 149900 -> "1499.00")
 */
export function formatPaise(paise: number): string {
  const isNegative = paise < 0;
  const abs = Math.abs(paise);
  const units = Math.floor(abs / 100);
  const cents = (abs % 100).toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${units}.${cents}`;
}

export function normalizeHeaderName(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-_]+/g, "_");
}

function findMatchingHeader(
  headers: string[],
  aliases: string[]
): string | undefined {
  for (const rawHeader of headers) {
    const normalized = normalizeHeaderName(rawHeader);
    const compact = normalized.replace(/_/g, "");
    for (const alias of aliases) {
      const normAlias = normalizeHeaderName(alias);
      const compactAlias = normAlias.replace(/_/g, "");
      if (normalized === normAlias || compact === compactAlias) {
        return rawHeader;
      }
    }
  }
  return undefined;
}

async function getCsvText(input: string | File): Promise<string> {
  if (typeof input === "string") return input;
  if (typeof input.text === "function") {
    return await input.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsText(input);
  });
}

/**
 * Parses and validates CSV string content or File in the browser using Papa Parse.
 * Conforms strictly to README section 6 and Phase 2 requirements.
 */
export async function parseTransactionCsvContent(
  input: string | File
): Promise<CsvParseResult> {
  let text = "";
  try {
    text = await getCsvText(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      errors: [`Failed to read CSV input: ${msg}`],
      warnings: [],
      totalRows: 0,
      transactions: [],
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  // Handle completely empty input
  if (!text || !text.trim()) {
    return {
      isValid: false,
      errors: [
        "The uploaded CSV is empty. Please provide a CSV file containing transaction headers and data.",
      ],
      warnings: [],
      totalRows: 0,
      transactions: [],
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  // Check for general parsing errors from Papa Parse
  if (results.errors && results.errors.length > 0) {
    const criticalErrors = results.errors.filter(
      (e) => e.type === "Quotes" || e.code === "UndetectableDelimiter"
    );
    if (criticalErrors.length > 0) {
      return {
        isValid: false,
        errors: [
          `Malformed CSV: ${criticalErrors.map((e) => e.message).join(", ")}`,
        ],
        warnings: [],
        totalRows: 0,
        transactions: [],
        hasDuplicateReferences: false,
        duplicateReferences: [],
      };
    }
  }

  const headers = (results.meta.fields || []).map((h) => h.trim()).filter(Boolean);
  if (headers.length === 0) {
    return {
      isValid: false,
      errors: [
        "The uploaded CSV contains no header row. Please provide a CSV with column headers.",
      ],
      warnings: [],
      totalRows: 0,
      transactions: [],
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  // Identify required columns
  const refCol = findMatchingHeader(headers, REFERENCE_ALIASES);
  const amountCol = findMatchingHeader(headers, AMOUNT_ALIASES);
  const dateCol = findMatchingHeader(headers, DATE_ALIASES);
  const statusCol = findMatchingHeader(headers, STATUS_ALIASES);

  const missingRequired: string[] = [];
  if (!refCol) {
    missingRequired.push(
      "Transaction Reference (e.g. 'reference', 'reference_id', 'transaction_id', 'txn_id', 'transaction reference', 'payment reference', 'utr', 'rrn')"
    );
  }
  if (!amountCol) {
    missingRequired.push(
      "Amount (e.g. 'amount', 'transaction_amount', 'paid_amount', 'credit', 'credited amount', 'transaction amount')"
    );
  }

  if (missingRequired.length > 0) {
    return {
      isValid: false,
      errors: [
        `Missing required column(s): ${missingRequired.join("; ")}. Detected columns: [${headers.join(", ")}].`,
      ],
      warnings: [],
      totalRows: 0,
      transactions: [],
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  const rawRows = results.data;
  if (rawRows.length === 0) {
    return {
      isValid: false,
      errors: [
        "The CSV file contains column headers but zero transaction rows.",
      ],
      warnings: [],
      totalRows: 0,
      transactions: [],
      detectedColumns: {
        reference: refCol!,
        amount: amountCol!,
        date: dateCol,
        status: statusCol,
      },
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  const transactions: ParsedTransaction[] = [];
  const referenceCounts: Record<string, number> = {};
  const warnings: string[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const rawRef = (row[refCol!] ?? "").trim();
    const rawAmt = (row[amountCol!] ?? "").trim();
    const rawDate = dateCol ? (row[dateCol] ?? "").trim() : undefined;
    const rawStatus = statusCol ? (row[statusCol] ?? "").trim() : undefined;

    // Skip completely empty row entries
    if (!rawRef && !rawAmt) {
      return;
    }

    if (!rawRef) {
      warnings.push(
        `Row ${rowNumber}: Empty reference value. Row was excluded from reconciliation.`
      );
      return;
    }

    const paise = parseAmountToPaise(rawAmt);
    if (paise === null) {
      warnings.push(
        `Row ${rowNumber}: Invalid amount "${rawAmt}". Row was excluded.`
      );
      return;
    }

    const normalizedRef = normalizeReference(rawRef);
    referenceCounts[normalizedRef] = (referenceCounts[normalizedRef] || 0) + 1;

    transactions.push({
      id: `row-${rowNumber}-${normalizedRef}`,
      rawReference: rawRef,
      normalizedReference: normalizedRef,
      rawAmount: rawAmt,
      amountPaise: paise,
      formattedAmount: formatPaise(paise),
      date: rawDate,
      status: rawStatus,
      rowNumber,
      rawRow: row,
    });
  });

  if (transactions.length === 0) {
    return {
      isValid: false,
      errors: [
        "No usable transaction rows found. All rows either lacked a reference ID or contained invalid amounts.",
      ],
      warnings,
      totalRows: 0,
      transactions: [],
      detectedColumns: {
        reference: refCol!,
        amount: amountCol!,
        date: dateCol,
        status: statusCol,
      },
      hasDuplicateReferences: false,
      duplicateReferences: [],
    };
  }

  // Identify duplicate references in CSV
  const duplicateReferences = Object.keys(referenceCounts).filter(
    (ref) => referenceCounts[ref] > 1
  );
  const hasDuplicateReferences = duplicateReferences.length > 0;

  if (hasDuplicateReferences) {
    warnings.push(
      `Notice: ${duplicateReferences.length} duplicate reference ID(s) detected in CSV (${duplicateReferences
        .slice(0, 3)
        .join(", ")}${duplicateReferences.length > 3 ? "..." : ""}). Deterministic rules will flag duplicates for manual review.`
    );
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    totalRows: transactions.length,
    transactions,
    detectedColumns: {
      reference: refCol!,
      amount: amountCol!,
      date: dateCol,
      status: statusCol,
    },
    hasDuplicateReferences,
    duplicateReferences,
  };
}

export async function parseTransactionCsv(file: File): Promise<CsvParseResult> {
  return parseTransactionCsvContent(file);
}
