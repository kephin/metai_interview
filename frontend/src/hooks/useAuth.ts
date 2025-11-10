import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type {
  AuthResponse,
  CurrentUserResponse,
  LogoutResponse,
  LoginRequest,
  SignupRequest,
  User,
} from "@/types/auth";
import { QUERY_STALE_TIMES } from "@/lib/queryClient";

const AUTH_QUERY_KEY = ["auth", "currentUser"];

// Global state for active operations tracking
let globalActiveDownloads = 0;
const globalDownloadListeners: Array<() => void> = [];

async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return null;
    }

    const response = await apiClient.get<CurrentUserResponse>("/auth/me");
    if (response.success && response.data) {
      return response.data;
    }

    return null;
  } catch {
    return null;
  }
}

async function signup(credentials: SignupRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/signup",
    credentials
  );

  if (response.success && response.data) {
    const { error } = await supabase.auth.setSession({
      access_token: response.data.access_token,
      refresh_token: response.data.access_token, // Use access_token as refresh_token for MVP
    });

    if (error) {
      console.error("Failed to set session:", error);
      throw new Error("Failed to establish session");
    }
  }

  return response;
}

async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/login",
    credentials
  );

  if (response.success && response.data) {
    const { error } = await supabase.auth.setSession({
      access_token: response.data.access_token,
      refresh_token: response.data.access_token, // Use access_token as refresh_token for MVP
    });

    if (error) {
      console.error("[useAuth] Failed to set session:", error);
      throw new Error("Failed to establish session");
    }
    await supabase.auth.getSession();
  } else {
    console.error("[useAuth] Login failed:", response.error);
  }

  return response;
}

async function logout(): Promise<LogoutResponse> {
  const response = await apiClient.post<LogoutResponse>("/auth/logout");

  await supabase.auth.signOut();

  return response;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeDownloads, setActiveDownloads] = useState(0);

  const {
    data: user,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: QUERY_STALE_TIMES.auth,
    retry: false, // Don't retry on auth failures
  });

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: async (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(AUTH_QUERY_KEY, data.data.user);
        await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        navigate("/dashboard");
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(AUTH_QUERY_KEY, data.data.user);
        await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        navigate("/dashboard");
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      navigate("/login");
    },
  });

  // Subscribe to global download state changes
  const notifyDownloadChange = useCallback(() => {
    setActiveDownloads(globalActiveDownloads);
  }, []);
  globalDownloadListeners.push(notifyDownloadChange);

  return {
    // User data
    user,
    isLoading,
    isAuthenticated: !!user,
    // Mutations
    signup: signupMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    // Mutation states
    isSigningUp: signupMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    // Error handling
    signupError: signupMutation.error,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
    queryError,
    // Active operations tracking
    activeDownloads,
  };
}

export function incrementActiveDownloads() {
  globalActiveDownloads++;
  globalDownloadListeners.forEach((listener) => listener());
}

export function decrementActiveDownloads() {
  globalActiveDownloads = Math.max(0, globalActiveDownloads - 1);
  globalDownloadListeners.forEach((listener) => listener());
}
