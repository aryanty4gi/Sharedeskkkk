import { describe, it, expect } from "vitest";
import { validateFileUpload, sanitizeFileName } from "@/lib/security/file-validation";

describe("File Validation Utilities", () => {
  it("should accept valid document files", () => {
    const file = new File(["dummy content"], "report.pdf", { type: "application/pdf" });
    const result = validateFileUpload(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject dangerous executable extensions", () => {
    const dangerousFiles = ["malware.exe", "script.sh", "payload.php", "batch.bat", "macro.vbs"];

    dangerousFiles.forEach((filename) => {
      const file = new File(["echo test"], filename, { type: "application/octet-stream" });
      const result = validateFileUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("prohibited for upload");
    });
  });

  it("should enforce maximum file size limits", () => {
    // 51 MB dummy file
    const largeFile = new File([new ArrayBuffer(51 * 1024 * 1024)], "large.pdf", {
      type: "application/pdf",
    });
    const result = validateFileUpload(largeFile, { maxSizeBytes: 50 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds maximum allowed limit");
  });

  it("should enforce image-only restriction when required", () => {
    const textFile = new File(["hello"], "avatar.txt", { type: "text/plain" });
    const result = validateFileUpload(textFile, { requireImage: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid image format");

    const imageFile = new File(["pngdata"], "avatar.png", { type: "image/png" });
    const imageResult = validateFileUpload(imageFile, { requireImage: true });
    expect(imageResult.valid).toBe(true);
  });
});

describe("Filename Sanitization Utility", () => {
  it("should remove directory traversal sequences and special characters", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Windows\\System32\\cmd.exe")).toBe("cmd.exe");
    expect(sanitizeFileName("my file (1) & version #2.pdf")).toBe("my_file_1_version_2.pdf");
  });
});
