import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../utils/api";

// Custom hook for managing API calls with caching
export const useApiCache = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    dependencies = [],
    enabled = true,
    onSuccess,
    onError,
    method = "GET",
    requestData = null,
  } = options;

  // Memoize the dependencies to prevent unnecessary re-renders
  const memoizedDependencies = useMemo(() => dependencies, [dependencies]);

  // Memoize callbacks to prevent unnecessary re-renders
  const memoizedOnSuccess = useCallback(
    (data) => {
      if (onSuccess) {
        onSuccess(data);
      }
    },
    [onSuccess]
  );

  const memoizedOnError = useCallback(
    (err) => {
      if (onError) {
        onError(err);
      }
    },
    [onError]
  );

  const fetchData = useCallback(async () => {
    if (!enabled || !url) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let response;

      switch (method.toUpperCase()) {
        case "GET":
          response = await api.getWithCache(url);
          break;
        case "POST":
          response = await api.postWithDedup(url, requestData);
          break;
        case "PUT":
          response = await api.putWithDedup(url, requestData);
          break;
        case "DELETE":
          response = await api.deleteWithDedup(url);
          break;
        default:
          response = await api.getWithCache(url);
      }

      if (response?.data) {
        setData(response.data);
        memoizedOnSuccess(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error(`Error fetching ${url}:`, err);
      }
      const errorMessage = api.handleError(err);
      setError(errorMessage);
      memoizedOnError(err);
    } finally {
      setLoading(false);
    }
  }, [
    url,
    enabled,
    method,
    requestData,
    memoizedOnSuccess,
    memoizedOnError,
    memoizedDependencies,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    // Clear cache for this specific URL before refetching
    if (url) {
      api.clearCache(url);
    }
    fetchData();
  }, [fetchData, url]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};

// Hook specifically for user data
export const useUserData = (userId, enabled = true) => {
  const history = useApiCache(`/api/user/history?userId=${userId}`, {
    dependencies: [userId],
    enabled: enabled && !!userId,
  });

  const statistics = useApiCache(`/api/user/statistics?userId=${userId}`, {
    dependencies: [userId],
    enabled: enabled && !!userId,
  });

  const profile = useApiCache(`/api/user/profile?userId=${userId}`, {
    dependencies: [userId],
    enabled: enabled && !!userId,
  });

  return {
    history: {
      data: history.data?.interviewSessions || [],
      loading: history.loading,
      error: history.error,
      refetch: history.refetch,
    },
    statistics: {
      data: statistics.data?.statistics || {
        totalInterviews: 0,
        totalQuestions: 0,
        averageScore: 0,
        averageDurationMinutes: 0,
      },
      loading: statistics.loading,
      error: statistics.error,
      refetch: statistics.refetch,
    },
    profile: {
      data: profile.data?.user || null,
      loading: profile.loading,
      error: profile.error,
      refetch: profile.refetch,
    },
    loading: history.loading || statistics.loading || profile.loading,
    error: history.error || statistics.error || profile.error,
    refetch: () => {
      history.refetch();
      statistics.refetch();
      profile.refetch();
    },
  };
};

// Hook for resumes
export const useResumes = (enabled = true) => {
  return useApiCache("/api/resume", {
    enabled,
    onSuccess: (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Resumes fetched successfully:", data);
      }
    },
  });
};

// Hook for interview positions
export const useInterviewPositions = (enabled = true) => {
  return useApiCache("/api/interview/positions", {
    enabled,
    onSuccess: (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Interview positions fetched successfully:", data);
      }
    },
  });
};

// Hook for server health
export const useServerHealth = (enabled = true) => {
  return useApiCache("/api/health", {
    enabled,
    onSuccess: (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Server health check successful:", data);
      }
    },
  });
};
