export interface FileMetadata {
  id: string;
  user_id: string;
  userId?: string;
  filename: string;
  file_size: number;
  fileSize?: number;
  storage_path: string;
  storagePath?: string;
  thumbnail_url: string | null;
  thumbnailUrl?: string | null;
  has_thumbnail: boolean;
  hasThumbnail?: boolean;
  uploaded_at: string;
  uploadedAt?: string;
}

export interface FileListResponse {
  files: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
  pageSize?: number;
  total_pages: number;
  totalPages?: number;
}

export interface FileUploadProgress {
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  status: UploadStatus;
  error?: string;
}

export type UploadStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface UploadQueueItem {
  id: string;
  file: File;
  progress: FileUploadProgress;
  abortController: AbortController;
}

export interface FileUploadResponse {
  file: FileMetadata;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  data: null;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export const MAX_FILE_SIZE = 52428800;
export const MAX_FILENAME_LENGTH = 255;
export const ALLOWED_FILENAME_PATTERN = /^[a-zA-Z0-9._\-\s()]+$/;

export const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
];

export function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  return ext ? IMAGE_EXTENSIONS.includes(`.${ext}`) : false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type SortField = "name" | "date" | "size";
export type SortOrder = "asc" | "desc";

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}
