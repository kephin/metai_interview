import React, { useState, useRef, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useCheckDuplicateFilename } from "@/hooks/useFiles";
import { ProgressBar } from "./ProgressBar";
import { type FileMetadata, MAX_FILE_SIZE } from "@/types/file";
import { validateFile } from "@/lib/validators";

export interface FileUploadProps {
  onUploadStart?: () => void;
  onUploadSuccess?: (file: FileMetadata) => void;
  onUploadError?: (error: Error) => void;
}

export function FileUpload({
  onUploadStart,
  onUploadSuccess,
  onUploadError,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<FileMetadata | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkDuplicate = useCheckDuplicateFilename();

  const { upload, progress, uploading, error, cancel } = useFileUpload({
    onSuccess: (response) => {
      setSelectedFile(null);
      setValidationError(null);
      onUploadSuccess?.(response.file);
    },
    onError: (err) => {
      onUploadError?.(err);
    },
  });

  const handleFileSelect = async (file: File) => {
    setValidationError(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || "File validation failed");
      return;
    }

    setSelectedFile(file);

    // Check for duplicates
    try {
      const existing = await checkDuplicate.mutateAsync(file.name);
      if (existing) {
        setDuplicateFile(existing);
        setShowDuplicateDialog(true);
      } else {
        onUploadStart?.();
        await upload(file);
      }
    } catch {
      // If duplicate check fails, proceed with upload anyway
      onUploadStart?.();
      await upload(file);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!selectedFile) return;

    setShowDuplicateDialog(false);
    setDuplicateFile(null);
    onUploadStart?.();
    await upload(selectedFile);
  };

  const handleCancelOverwrite = () => {
    setShowDuplicateDialog(false);
    setDuplicateFile(null);
    setSelectedFile(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]); // Single file upload for now
    }
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRetry = async () => {
    if (selectedFile) {
      setValidationError(null);
      await handleFileSelect(selectedFile);
    }
  };

  const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-lg p-6"
        style={{ height: "calc(100vh - 132px)" }}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload File
        </h2>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          style={{ padding: "10rem 2rem" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />

          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Uploading {selectedFile?.name}...
              </p>
              {progress && (
                <ProgressBar
                  percentage={progress.percentage}
                  showText
                  animated
                  className="max-w-xs mx-auto"
                />
              )}
              <button
                onClick={cancel}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Cancel Upload
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your file here, or
              </p>
              <button
                onClick={handleBrowseClick}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Browse Files
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Maximum file size: {maxSizeMB}MB
              </p>
            </>
          )}
        </div>

        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{validationError}</p>
            {selectedFile && (
              <button
                onClick={handleRetry}
                className="text-sm text-red-600 hover:text-red-700 underline mt-2"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {error && !uploading && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-red-600 hover:text-red-700 underline mt-2"
            >
              Retry Upload
            </button>
          </div>
        )}
      </div>

      {showDuplicateDialog && duplicateFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              File Already Exists
            </h2>
            <p className="text-gray-600 mb-4">
              A file named "{duplicateFile.filename}" already exists. Do you
              want to overwrite it?
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Existing file:</span>
              </p>
              <p className="text-gray-600 mt-1">
                Size: {(duplicateFile.file_size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-gray-600">
                Uploaded: {new Date(duplicateFile.uploaded_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelOverwrite}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
