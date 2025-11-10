import React, { useState, useEffect } from "react";
import { FileCard } from "./FileCard";
import { useFiles } from "../hooks/useFiles";
import { usePagination, getPageRangeText } from "../hooks/usePagination";
import type { SortField, SortOrder } from "../types/file";
import { LoadingSpinner } from "./ProgressBar";

export interface FileListProps {
  onFileListChange?: () => void;
}

export function FileList({ onFileListChange }: FileListProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const pagination = usePagination();

  const { data, isLoading, error, refetch } = useFiles({
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: sortField,
    sortOrder: sortOrder,
  });

  useEffect(() => {
    if (data?.total !== undefined) {
      pagination.setTotalItems(data.total);
    }
  }, [data?.total, pagination]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    pagination.firstPage();
  };

  const handleFileDeleted = () => {
    refetch();
    onFileListChange?.();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading files</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-center text-gray-500"
        style={{ height: "calc(100vh - 470px)" }}
      >
        <div>
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg">No files uploaded yet</p>
          <p className="text-sm mt-2">Upload your first file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
        <span className="text-sm text-gray-600">
          {getPageRangeText(pagination.page, pagination.pageSize, data.total)}
        </span>
        <div className="flex gap-2">
          <span className="text-sm text-gray-600 mr-2">Sort by:</span>
          <SortButton
            label="Name"
            field="name"
            currentField={sortField}
            currentOrder={sortOrder}
            onClick={() => handleSortChange("name")}
          />
          <SortButton
            label="Date"
            field="date"
            currentField={sortField}
            currentOrder={sortOrder}
            onClick={() => handleSortChange("date")}
          />
          <SortButton
            label="Size"
            field="size"
            currentField={sortField}
            currentOrder={sortOrder}
            onClick={() => handleSortChange("size")}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {data.files.map((file) => (
          <FileCard key={file.id} file={file} onDeleted={handleFileDeleted} />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
          <button
            onClick={pagination.firstPage}
            disabled={!pagination.canGoPrevious}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="First page"
          >
            &laquo;
          </button>
          <button
            onClick={pagination.previousPage}
            disabled={!pagination.canGoPrevious}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            &lsaquo;
          </button>

          <span className="text-sm text-gray-600 px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={pagination.nextPage}
            disabled={!pagination.canGoNext}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            &rsaquo;
          </button>
          <button
            onClick={pagination.lastPage}
            disabled={!pagination.canGoNext}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Last page"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}

interface SortButtonProps {
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onClick: () => void;
}

function SortButton({
  label,
  field,
  currentField,
  currentOrder,
  onClick,
}: SortButtonProps) {
  const isActive = currentField === field;

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded transition-colors ${
        isActive
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
      {isActive && (
        <span className="ml-1">{currentOrder === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}
