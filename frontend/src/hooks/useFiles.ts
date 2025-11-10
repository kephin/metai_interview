import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  FileListResponse,
  FileMetadata,
  SortField,
  SortOrder,
} from "@/types/file";
import { apiClient } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export interface UseFilesOptions {
  page?: number;
  pageSize?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export function useFiles(options: UseFilesOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "date",
    sortOrder = "desc",
  } = options;

  return useQuery({
    queryKey: ["files", page, pageSize, sortBy, sortOrder],
    queryFn: async (): Promise<FileListResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await apiClient.get<FileListResponse>(
        `/files?${params.toString()}`
      );
      return response;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      await apiClient.delete(`/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/files/${fileId}/download`, {
        method: "GET",
        headers: {
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      console.error("Error downloading file:", error);
      throw error;
    },
  });
}

export function useCheckDuplicateFilename() {
  return useMutation({
    mutationFn: async (filename: string): Promise<FileMetadata | null> => {
      try {
        const response = await apiClient.get<FileListResponse>(
          "/files?page=1&page_size=1000"
        );

        const existingFile = response.files.find(
          (f) => f.filename.toLowerCase() === filename.toLowerCase()
        );

        return existingFile || null;
      } catch (error) {
        console.error("Error checking duplicate filename:", error);
        return null;
      }
    },
  });
}

export function useFileById(fileId: string) {
  return useQuery({
    queryKey: ["file", fileId],
    queryFn: async (): Promise<FileMetadata> => {
      const response = await apiClient.get<FileMetadata>(`/files/${fileId}`);
      return response;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
