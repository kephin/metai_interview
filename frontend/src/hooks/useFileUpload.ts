import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  FileUploadProgress,
  FileUploadResponse,
  UploadStatus,
} from "../types/file";
import { validateFile } from "../lib/validators";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Global registry to track active upload cancel functions
const activeUploadCancelFunctions = new Map<string, () => void>();

let uploadIdCounter = 0;

export interface UseFileUploadOptions {
  onSuccess?: (response: FileUploadResponse) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: FileUploadProgress) => void;
}

export interface UseFileUploadReturn {
  upload: (file: File) => Promise<FileUploadResponse>;
  progress: FileUploadProgress | null;
  uploading: boolean;
  error: string | null;
  cancel: () => void;
}

export function useFileUpload(
  options: UseFileUploadOptions = {}
): UseFileUploadReturn {
  const [progress, setProgress] = useState<FileUploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setUploading(false);
      setError("Upload cancelled");
      setProgress(null);

      if (uploadIdRef.current) {
        activeUploadCancelFunctions.delete(uploadIdRef.current);
        uploadIdRef.current = null;
      }
    }
  }, []);

  const upload = useCallback(
    async (file: File): Promise<FileUploadResponse> => {
      const uploadId = `upload-${++uploadIdCounter}`;
      uploadIdRef.current = uploadId;

      setUploading(true);
      setError(null);
      setProgress({
        filename: file.name,
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: "uploading" as UploadStatus,
      });

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        const errorMsg = validation.error || "File validation failed";
        setError(errorMsg);
        setUploading(false);
        activeUploadCancelFunctions.delete(uploadId);
        uploadIdRef.current = null;
        options.onError?.(new Error(errorMsg));
        throw new Error(errorMsg);
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Register this upload's cancel function
        activeUploadCancelFunctions.set(uploadId, cancel);

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            const progressData: FileUploadProgress = {
              filename: file.name,
              loaded: e.loaded,
              total: e.total,
              percentage,
              status: "uploading" as UploadStatus,
            };
            setProgress(progressData);
            options.onProgress?.(progressData);
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response: FileUploadResponse = JSON.parse(xhr.responseText);

              // Update progress to completed
              setProgress({
                filename: file.name,
                loaded: file.size,
                total: file.size,
                percentage: 100,
                status: "completed" as UploadStatus,
              });

              queryClient.invalidateQueries({ queryKey: ["files"] });
              setUploading(false);

              activeUploadCancelFunctions.delete(uploadId);
              uploadIdRef.current = null;

              options.onSuccess?.(response);
              resolve(response);
            } catch {
              const errorMsg = "Failed to parse server response";
              setError(errorMsg);
              setUploading(false);
              setProgress({
                filename: file.name,
                loaded: file.size,
                total: file.size,
                percentage: 100,
                status: "failed" as UploadStatus,
                error: errorMsg,
              });

              activeUploadCancelFunctions.delete(uploadId);
              uploadIdRef.current = null;

              const err = new Error(errorMsg);
              options.onError?.(err);
              reject(err);
            }
          } else {
            let errorMsg = `Upload failed with status ${xhr.status}`;

            const errorResponse = JSON.parse(xhr.responseText);
            errorMsg =
              errorResponse.detail?.message || errorResponse.detail || errorMsg;

            setError(errorMsg);
            setUploading(false);
            setProgress({
              filename: file.name,
              loaded: 0,
              total: file.size,
              percentage: 0,
              status: "failed" as UploadStatus,
              error: errorMsg,
            });

            activeUploadCancelFunctions.delete(uploadId);
            uploadIdRef.current = null;

            const err = new Error(errorMsg);
            options.onError?.(err);
            reject(err);
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          const errorMsg = "Network error during upload";
          setError(errorMsg);
          setUploading(false);
          setProgress({
            filename: file.name,
            loaded: 0,
            total: file.size,
            percentage: 0,
            status: "failed" as UploadStatus,
            error: errorMsg,
          });

          activeUploadCancelFunctions.delete(uploadId);
          uploadIdRef.current = null;

          const err = new Error(errorMsg);
          options.onError?.(err);
          reject(err);
        });

        // Handle abort
        xhr.addEventListener("abort", () => {
          const errorMsg = "Upload cancelled";
          setError(errorMsg);
          setUploading(false);
          setProgress(null);

          activeUploadCancelFunctions.delete(uploadId);
          uploadIdRef.current = null;

          const err = new Error(errorMsg);
          options.onError?.(err);
          reject(err);
        });

        // Prepare and send request
        const formData = new FormData();
        formData.append("file", file);

        // Get auth token from Supabase session
        const getTokenAndSend = async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          xhr.open("POST", `${API_URL}/files/upload`);
          if (session?.access_token) {
            xhr.setRequestHeader(
              "Authorization",
              `Bearer ${session.access_token}`
            );
          }
          xhr.send(formData);
        };

        getTokenAndSend();
      });
    },
    [options, queryClient]
  );

  return {
    upload,
    progress,
    uploading,
    error,
    cancel,
  };
}

export function cancelAllActiveUploads() {
  activeUploadCancelFunctions.forEach((cancelFn) => {
    cancelFn();
  });
  activeUploadCancelFunctions.clear();
}
