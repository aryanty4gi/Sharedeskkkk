/**
 * Enterprise File Upload Validation Utility
 * Enforces file size limits, MIME type validation, path sanitization, and rejection of dangerous executable extensions.
 */

const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "vbs",
  "php",
  "dll",
  "ps1",
  "scr",
  "com",
  "pif",
  "application",
  "gadget",
  "msi",
  "msp",
  "hta",
  "cpl",
  "msc",
  "jar",
  "js",
  "jse",
  "ws",
  "wsf",
  "wsc",
  "wsh",
]);

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimePrefixes?: string[];
  requireImage?: boolean;
}

export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {},
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  // 1. Extension Check
  const filename = file.name || "";
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Security Error: File type .${ext} is prohibited for upload.`,
    };
  }

  // 2. File Size Limit Check
  const maxBytes = options.maxSizeBytes ?? 50 * 1024 * 1024; // Default 50 MB
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds maximum allowed limit of ${maxMb} MB.`,
    };
  }

  // 3. Image-only requirement (e.g. for avatars)
  if (options.requireImage) {
    if (!file.type.startsWith("image/")) {
      return {
        valid: false,
        error: "Invalid image format. Only standard image files (PNG, JPG, WebP) are allowed.",
      };
    }
  }

  // 4. Allowed MIME prefixes check (if specified)
  if (options.allowedMimePrefixes && options.allowedMimePrefixes.length > 0) {
    const isAllowed = options.allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix));
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type || ext}" is not supported.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes file names to prevent directory traversal or path manipulation
 */
export function sanitizeFileName(name: string): string {
  const baseName = name.replace(/^.*[\\/]/, ""); // strip path separators
  return baseName.replace(/[^\w.-]+/g, "_");
}
