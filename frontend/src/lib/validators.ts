import {
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH,
  ALLOWED_FILENAME_PATTERN,
} from "@/types/file";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(file: File): ValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      error: "Cannot upload empty file",
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

export function validateFilename(filename: string): ValidationResult {
  if (!filename || !filename.trim()) {
    return {
      valid: false,
      error: "Filename cannot be empty",
    };
  }
  if (filename.length > MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: `Filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`,
    };
  }
  if (filename.includes("..")) {
    return {
      valid: false,
      error: "Filename cannot contain path traversal sequences (..)",
    };
  }
  const invalidChars = /[<>"'`\n\r\t\0/\\]/;
  if (invalidChars.test(filename)) {
    return {
      valid: false,
      error:
        "Filename contains invalid characters (<, >, \", ', `, /, \\, newline, tab, null)",
    };
  }
  if (!ALLOWED_FILENAME_PATTERN.test(filename)) {
    return {
      valid: false,
      error:
        "Filename can only contain letters, numbers, dots, underscores, hyphens, spaces, and parentheses",
    };
  }

  return { valid: true };
}

export function validateFile(file: File): ValidationResult {
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.valid) {
    return filenameValidation;
  }

  return { valid: true };
}
