/**
 * Format bytes into readable human-friendly units (B, KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const VALID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
export const VALID_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export function isValidImageFile(file: File): boolean {
  if (VALID_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const name = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function isValidCsvFile(file: File): boolean {
  if (
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "text/plain" ||
    file.type === ""
  ) {
    return file.name.toLowerCase().endsWith(".csv");
  }
  return file.name.toLowerCase().endsWith(".csv");
}
