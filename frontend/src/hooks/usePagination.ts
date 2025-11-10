import { useState, useCallback } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setTotalItems: (total: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export interface UsePaginationReturn
  extends PaginationState,
    PaginationActions {}

export function usePagination(
  initialPageSize: number = 6
): UsePaginationReturn {
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const setPage = useCallback(
    (newPage: number) => {
      const boundedPage = Math.max(1, Math.min(newPage, totalPages));
      setPageState(boundedPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPageState(page + 1);
    }
  }, [page, totalPages]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPageState(page - 1);
    }
  }, [page]);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const canGoNext = page < totalPages;

  const canGoPrevious = page > 1;

  return {
    // State
    page,
    pageSize,
    totalItems,
    totalPages,
    // Actions
    setPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setTotalItems,
    canGoNext,
    canGoPrevious,
  };
}

export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function getPageRangeText(
  page: number,
  pageSize: number,
  totalItems: number
): string {
  if (totalItems === 0) {
    return "No items";
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return `${start}-${end} of ${totalItems} items`;
}
