import { createWorker, Worker } from "tesseract.js";
import { OcrJobProgress, ExtractedCandidateFields, extractCandidateFields } from "./ocrExtractor";

export interface OcrServiceOptions {
  onProgress?: (progress: OcrJobProgress) => void;
  signal?: AbortSignal;
}

/**
 * Executes client-side OCR on an image file using Tesseract.js.
 * Manages worker lifecycle, reports progress, and cleanly terminates workers.
 */
export async function runClientOcr(
  imageSource: File | Blob | string,
  options?: OcrServiceOptions
): Promise<ExtractedCandidateFields> {
  let worker: Worker | null = null;
  const signal = options?.signal;

  if (signal?.aborted) {
    throw new Error("OCR job was cancelled before starting.");
  }

  const handleAbort = async () => {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // worker cleanup
      }
      worker = null;
    }
  };

  if (signal) {
    signal.addEventListener("abort", handleAbort, { once: true });
  }

  try {
    options?.onProgress?.({
      status: "Initializing Tesseract OCR engine...",
      progress: 0.05,
      stage: "init",
    });

    worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (signal?.aborted) return;

        let stage: OcrJobProgress["stage"] = "recognizing";
        let displayStatus = m.status;

        if (m.status === "loading tesseract core") {
          stage = "loading-core";
          displayStatus = "Loading WebAssembly OCR engine...";
        } else if (m.status === "loading language traineddata") {
          stage = "loading-lang";
          displayStatus = "Downloading / caching English OCR model...";
        } else if (m.status === "initializing api") {
          stage = "init";
          displayStatus = "Initializing OCR parameters...";
        } else if (m.status === "recognizing text") {
          stage = "recognizing";
          const percent = Math.round((m.progress || 0) * 100);
          displayStatus = `Reading screenshot text (${percent}%)...`;
        }

        options?.onProgress?.({
          status: displayStatus,
          progress: typeof m.progress === "number" ? m.progress : 0.5,
          stage,
        });
      },
    });

    if (signal?.aborted) {
      throw new Error("OCR job was cancelled.");
    }

    options?.onProgress?.({
      status: "Processing image with OCR...",
      progress: 0.6,
      stage: "recognizing",
    });

    const ret = await worker.recognize(imageSource);

    if (signal?.aborted) {
      throw new Error("OCR job was cancelled.");
    }

    const rawText = ret.data.text || "";
    const extracted = extractCandidateFields(rawText);

    options?.onProgress?.({
      status: "Text extraction complete",
      progress: 1.0,
      stage: "completed",
    });

    return extracted;
  } catch (err) {
    if (signal?.aborted) {
      throw new Error("OCR job was cancelled.");
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `OCR recognition failed: ${message}. (Note: Tesseract.js loads the English traineddata model on initial run; ensure internet connectivity is available for model download.)`
    );
  } finally {
    if (signal) {
      signal.removeEventListener("abort", handleAbort);
    }
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // worker termination
      }
      worker = null;
    }
  }
}
