import assert from "node:assert";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Compile TypeScript files for testing
const distDir = path.resolve(process.cwd(), ".dist-test");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

execSync(
  `npx tsc --outDir "${distDir}" --module commonjs --target es2020 --moduleResolution node --esModuleInterop src/lib/ocrExtractor.ts src/lib/csvParser.ts`,
  { stdio: "inherit" }
);

const { extractCandidateFields } = require(path.join(distDir, "ocrExtractor.js"));

console.log("\n=======================================================");
console.log("RUNNING OCR EXTRACTION REGRESSION TEST SUITE");
console.log("=======================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// 1. Required user regression cases
const REQUIRED_AMOUNTS = [
  { input: "Payment receipt\n₹799.00\nCompleted", expected: "799.00", paise: 79900, conf: "high" },
  { input: "Payment receipt\n₹499.00\nCompleted", expected: "499.00", paise: 49900, conf: "high" },
  { input: "Payment receipt\n₹1,499.00\nCompleted", expected: "1499.00", paise: 149900, conf: "high" },
  { input: "Payment receipt\n₹3,499.00\nCompleted", expected: "3499.00", paise: 349900, conf: "high" },
  { input: "Payment receipt\n₹12,500.50\nCompleted", expected: "12500.50", paise: 1250050, conf: "high" },
];

for (const tc of REQUIRED_AMOUNTS) {
  runTest(`Extracts currency amount ${tc.expected} with high confidence`, () => {
    const res = extractCandidateFields(tc.input);
    assert.strictEqual(res.amount, tc.expected, `Amount mismatch for ${tc.input}`);
    assert.strictEqual(res.amountConfidence, tc.conf, `Confidence mismatch for ${tc.input}`);
    assert.strictEqual(res.amountPaise, tc.paise, `Paise mismatch for ${tc.input}`);
  });
}

// 2. Currency amounts without explicit decimal cents
const INTEGER_CURRENCY_CASES = [
  { input: "Total: ₹799", expected: "799.00", paise: 79900 },
  { input: "Total: ₹499", expected: "499.00", paise: 49900 },
  { input: "Total: ₹1,499", expected: "1499.00", paise: 149900 },
  { input: "Total: ₹3,499", expected: "3499.00", paise: 349900 },
  { input: "Total: ₹12,500", expected: "12500.00", paise: 1250000 },
];

for (const tc of INTEGER_CURRENCY_CASES) {
  runTest(`Extracts integer currency amount ${tc.input} as ${tc.expected}`, () => {
    const res = extractCandidateFields(tc.input);
    assert.strictEqual(res.amount, tc.expected);
    assert.strictEqual(res.amountPaise, tc.paise);
  });
}

// 3. Plain amounts without commas (must never truncate 4+ digit plain numbers)
const PLAIN_NUMBER_CASES = [
  { input: "Paid ₹1499.00", expected: "1499.00", paise: 149900 },
  { input: "Paid ₹3499.00", expected: "3499.00", paise: 349900 },
  { input: "Paid ₹12500.50", expected: "12500.50", paise: 1250050 },
];

for (const tc of PLAIN_NUMBER_CASES) {
  runTest(`Never truncates 4+ digit plain numbers without commas (${tc.input})`, () => {
    const res = extractCandidateFields(tc.input);
    assert.strictEqual(res.amount, tc.expected);
  });
}

// 4. Exact raw OCR output from Real Screenshot 1 (showing ₹499.00 visually, OCR produced 3499.00)
const RAW_SCREENSHOT_1 = `10:24 all F ® 78%
Payment Successful
08 Oct 2026, 10:24 AM
3499.00
Paid to
Amit Kumar ©
amit.kumar@upi
Transaction ID UPI283746512930 [0
Reference No. TXN1001
Date & Time 08 Oct 2026, 10:24 AM
Payment Method UPI
Bank State Bank of India (0)
2 a ied of
umn`;

runTest("Real Screenshot 1 (₹499 receipt): extracts candidate 3499.00 and marks low confidence for review", () => {
  const res = extractCandidateFields(RAW_SCREENSHOT_1);
  assert.strictEqual(res.reference, "UPI283746512930");
  assert.strictEqual(res.referenceConfidence, "high");
  assert.strictEqual(res.date, "2026-10-08");
  assert.strictEqual(res.amount, "3499.00");
  assert.strictEqual(res.amountConfidence, "low", "Must be marked low confidence for user review");
  assert.ok(
    res.amountSource?.includes("Review recommended"),
    "Source text must explain review recommendation"
  );
});

// 5. Exact raw OCR output from Real Screenshot 3 (showing ₹799.00 visually, OCR produced 3799.00)
const RAW_SCREENSHOT_3 = `4:37 all © @) 62%
Payment Successful
27 Oct 2026, 04:37 PM
3799.00

Paid to

Zomato Limited @

payments@zomato
Transaction ID UPI374965827301 (0)
Reference No. ZMT1234567890
Date & Time 27 Oct 2026, 04:37 PM
Payment Method Google Pay (UPI)
Bank HDFC Bank {=}`;

runTest("Real Screenshot 3 (₹799 receipt): extracts candidate 3799.00 and marks low confidence for review", () => {
  const res = extractCandidateFields(RAW_SCREENSHOT_3);
  assert.strictEqual(res.reference, "UPI374965827301");
  assert.strictEqual(res.referenceConfidence, "high");
  assert.strictEqual(res.date, "2026-10-27");
  assert.strictEqual(res.amount, "3799.00");
  assert.strictEqual(res.amountConfidence, "low", "Must be marked low confidence for user review");
  assert.ok(
    res.amountSource?.includes("Review recommended"),
    "Source text must explain review recommendation"
  );
});

// 6. Exact raw OCR output from Real Screenshot 2 (showing ₹1,499.00 visually, OCR produced 1,499.00)
const RAW_SCREENSHOT_2 = `10:28 oll © 8
¢ :
Payment Successful
1,499.00
Paid to

Amazon Seller Services

merchant@amazon
Transaction ID UPI1928374562301
Date & Time 28 Oct 2026, 10:26 AM
Payment Method HDFC Bank - UPI
Reference No. RRN778899556677
Status Success
View Details Share Save Get Help`;

runTest("Real Screenshot 2 (₹1,499 receipt): extracts candidate 1499.00 with low confidence (unlabelled)", () => {
  const res = extractCandidateFields(RAW_SCREENSHOT_2);
  assert.strictEqual(res.reference, "UPI1928374562301");
  assert.strictEqual(res.referenceConfidence, "high");
  assert.strictEqual(res.date, "2026-10-28");
  assert.strictEqual(res.amount, "1499.00");
  assert.strictEqual(res.amountConfidence, "low", "Standalone number must be marked low confidence");
});

// 7. Test safety: never prepends digits, never reconstructs amounts from transaction IDs
runTest("Safety: does not take amount digits from transaction references", () => {
  const text = `Payment Confirmed
Ref: TXN37990012
Date: 28 Oct 2026`;
  const res = extractCandidateFields(text);
  assert.strictEqual(res.amount, "");
  assert.strictEqual(res.amountConfidence, "missing");
});

console.log(`\n=======================================================`);
console.log(`ALL ${passed}/${total} REGRESSION TESTS PASSED SUCCESSFULLY!`);
console.log(`=======================================================\n`);

try {
  fs.rmSync(distDir, { recursive: true, force: true });
} catch {
  // cleanup
}
