import { useState, useEffect, useRef } from "react";
import {
  type FileMetadata,
  formatFileSize,
  formatDate,
  isImageFile,
} from "@/types/file";
import { useDeleteFile, useDownloadFile } from "@/hooks/useFiles";
import { LoadingSpinner } from "./ProgressBar";
import { FileIcon, DownloadIcon, TrashIcon } from "./Icons";

export interface FileCardProps {
  file: FileMetadata;
  onDeleted?: () => void;
}

export function FileCard({ file, onDeleted }: FileCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [shouldLoadThumbnail, setShouldLoadThumbnail] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const deleteFile = useDeleteFile();
  const downloadFile = useDownloadFile();

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadThumbnail(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, []);

  const handleDelete = async () => {
    try {
      await deleteFile.mutateAsync(file.id);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch {
      setShowDeleteConfirm(false);
    }
  };

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await downloadFile.mutateAsync(file.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download file. Please try again.";
      setDownloadError(errorMessage);
    }
  };

  const showImage = isImageFile(file.filename);

  return (
    <>
      <div
        ref={cardRef}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
            {showImage &&
            file.thumbnail_url &&
            shouldLoadThumbnail &&
            !thumbnailError ? (
              <img
                src={file.thumbnail_url}
                alt={file.filename}
                className="w-full h-full object-cover rounded"
                loading="lazy"
                onError={() => setThumbnailError(true)}
              />
            ) : showImage &&
              (file.has_thumbnail === false || thumbnailError) ? (
              <FileIcon type="image" />
            ) : (
              <FileIcon type={getFileType(file.filename)} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-medium text-gray-900 truncate"
              title={file.filename}
            >
              {file.filename}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatFileSize(file.file_size)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(file.uploaded_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloadFile.isPending}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
              title="Download file"
            >
              {downloadFile.isPending ? (
                <LoadingSpinner size={20} />
              ) : (
                <DownloadIcon />
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteFile.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Delete file"
            >
              {deleteFile.isPending ? (
                <LoadingSpinner size={20} />
              ) : (
                <TrashIcon />
              )}
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-red-800 flex-1">{downloadError}</p>
              <button
                onClick={handleDownload}
                className="text-sm font-medium text-red-600 hover:text-red-700 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Delete File
            </h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{file.filename}"? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                disabled={deleteFile.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                disabled={deleteFile.isPending}
              >
                {deleteFile.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getFileType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) {
    return "image";
  }
  if (["pdf"].includes(ext)) {
    return "pdf";
  }
  if (["doc", "docx"].includes(ext)) {
    return "document";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return "archive";
  }
  if (["mp4", "avi", "mkv", "mov"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "flac", "aac"].includes(ext)) {
    return "audio";
  }

  return "file";
}
