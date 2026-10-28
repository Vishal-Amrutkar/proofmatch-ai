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

// Known header aliases per README specification
const REFERENCE_ALIASES = [
  "transaction_reference",
  "transactionreference",
  "reference",
  "ref",
  "utr",
  "upi_ref",
  "upiref",
  "transaction_id",
  "transactionid",
  "txn_id",
  "txnid",
];

const AMOUNT_ALIASES = [
  "amount",
  "transaction_amount",
  "transactionamount",
  "paid_amount",
  "paidamount",
  "txn_amount",
];

const DATE_ALIASES = [
  "date",
  "transaction_date",
  "transactiondate",
  "payment_date",
  "paymentdate",
  "txn_date",
];

const STATUS_ALIASES = ["status", "transaction_status", "payment_status"];

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
 * Safely parse amount into integer paise (1 Rupee = 100 paise)
 * Avoids JavaScript floating point representation issues.
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

function normalizeHeaderName(header: string): string {
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

/**
 * Parses and validates CSV content in the browser using Papa Parse.
 * Conforms strictly to README section 6.
 */
export async function parseTransactionCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      complete: (results) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for general parsing errors from Papa Parse
        if (results.errors && results.errors.length > 0) {
          const criticalErrors = results.errors.filter(
            (e) => e.type === "Quotes" || e.code === "UndetectableDelimiter"
          );
          if (criticalErrors.length > 0) {
            resolve({
              isValid: false,
              errors: [
                `Malformed CSV: ${criticalErrors
                  .map((e) => e.message)
                  .join(", ")}`,
              ],
              warnings: [],
              totalRows: 0,
              transactions: [],
              hasDuplicateReferences: false,
              duplicateReferences: [],
            });
            return;
          }
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          resolve({
            isValid: false,
            errors: [
              "The uploaded CSV is empty or has no header row. Please provide a CSV with column headers.",
            ],
            warnings: [],
            totalRows: 0,
            transactions: [],
            hasDuplicateReferences: false,
            duplicateReferences: [],
          });
          return;
        }

        // Identify required columns
        const refCol = findMatchingHeader(headers, REFERENCE_ALIASES);
        const amountCol = findMatchingHeader(headers, AMOUNT_ALIASES);
        const dateCol = findMatchingHeader(headers, DATE_ALIASES);
        const statusCol = findMatchingHeader(headers, STATUS_ALIASES);

        const missingRequired: string[] = [];
        if (!refCol) {
          missingRequired.push(
            "Transaction Reference (expected one of: 'transaction_reference', 'reference', 'utr', 'upi_ref', 'transaction_id', 'ref')"
          );
        }
        if (!amountCol) {
          missingRequired.push(
            "Amount (expected one of: 'amount', 'transaction_amount', 'paid_amount')"
          );
        }

        if (missingRequired.length > 0) {
          resolve({
            isValid: false,
            errors: [
              `Missing required column(s): ${missingRequired.join("; ")}. Detected columns: [${headers.join(", ")}].`,
            ],
            warnings: [],
            totalRows: 0,
            transactions: [],
            hasDuplicateReferences: false,
            duplicateReferences: [],
          });
          return;
        }

        const rawRows = results.data;
        if (rawRows.length === 0) {
          resolve({
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
          });
          return;
        }

        const transactions: ParsedTransaction[] = [];
        const referenceCounts: Record<string, number> = {};
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
          resolve({
            isValid: false,
            errors: [
              "No valid transaction rows could be parsed. Check that rows contain non-empty reference IDs and valid numeric amounts.",
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
          });
          return;
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

        resolve({
          isValid: true,
          errors,
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
        });
      },
      error: (err) => {
        resolve({
          isValid: false,
          errors: [`Failed to read CSV file: ${err.message}`],
          warnings: [],
          totalRows: 0,
          transactions: [],
          hasDuplicateReferences: false,
          duplicateReferences: [],
        });
      },
    });
  });
}
