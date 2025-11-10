import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { cancelAllActiveDownloads } from "@/hooks/useFiles";
import { cancelAllActiveUploads } from "@/hooks/useFileUpload";

export function Dashboard() {
  const { user, logout, isLoggingOut, activeDownloads } = useAuth();
  const [activeUploads, setActiveUploads] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [fileListKey, setFileListKey] = useState(0);

  const hasActiveUploads = activeUploads > 0;
  const hasActiveDownloads = activeDownloads > 0;
  const hasActiveOperations = hasActiveUploads || hasActiveDownloads;
  const totalActiveOperations = activeUploads + activeDownloads;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveOperations) {
        e.preventDefault();
        e.returnValue =
          "Operations in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasActiveOperations]);

  const handleLogout = async () => {
    if (hasActiveOperations) {
      setShowLogoutConfirm(true);
      return;
    }

    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleConfirmLogout = async () => {
    cancelAllActiveDownloads();
    cancelAllActiveUploads();
    setActiveUploads(0);
    setShowLogoutConfirm(false);
    await logout();
  };

  const handleUploadStart = () => {
    setActiveUploads((prev) => prev + 1);
  };

  const handleUploadSuccess = () => {
    setActiveUploads((prev) => Math.max(0, prev - 1));
    setFileListKey((prev) => prev + 1);
  };

  const handleUploadError = (error: Error) => {
    setActiveUploads((prev) => Math.max(0, prev - 1));
    console.error("Upload error:", error);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            File Management Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            {hasActiveOperations && (
              <div className="flex gap-2">
                {hasActiveUploads && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {activeUploads} upload{activeUploads !== 1 ? "s" : ""}
                  </span>
                )}
                {hasActiveDownloads && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {activeDownloads} download{activeDownloads !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <div className="flex-[0_0_70%]">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Files
            </h2>
            <FileList
              key={fileListKey}
              onFileListChange={() => setFileListKey((prev) => prev + 1)}
            />
          </div>

          <div className="flex-[0_0_30%]">
            <FileUpload
              onUploadStart={handleUploadStart}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        </div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Active Operations in Progress
            </h2>
            <p className="text-gray-600 mb-4">
              You have {totalActiveOperations} active operation
              {totalActiveOperations !== 1 ? "s" : ""} in progress
              {hasActiveUploads && hasActiveDownloads
                ? ` (${activeUploads} upload${
                    activeUploads !== 1 ? "s" : ""
                  }, ${activeDownloads} download${
                    activeDownloads !== 1 ? "s" : ""
                  })`
                : hasActiveUploads
                ? ` (${activeUploads} upload${activeUploads !== 1 ? "s" : ""})`
                : ` (${activeDownloads} download${
                    activeDownloads !== 1 ? "s" : ""
                  })`}
              . Logging out will cancel{" "}
              {totalActiveOperations === 1
                ? "this operation"
                : "these operations"}
              . Are you sure you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
              >
                Logout Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
