import { useEffect, useState } from "react";
import {
  useTokenGradient as useTokenGradientQuery,
  useUpdateTokenGradient,
} from "@/services/api/local/tokens";
import { TokenGradientService } from "@/utils/token-gradient";
import type { GradientColors } from "@/utils/image-palette";

interface UseTokenGradientOptions {
  opacity?: number;
  fallbackColor?: string;
  enabled?: boolean;
  forceRefresh?: boolean;
}

interface UseTokenGradientReturn {
  gradientColors: GradientColors | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook for managing token gradient colors with database caching
 *
 * This hook will:
 * 1. First check if gradient colors exist in the database
 * 2. If found and not expired, return cached colors
 * 3. If not found or expired, extract colors from the token image
 * 4. Save extracted colors to database for future use
 * 5. Return the gradient colors with loading state
 */
export function useTokenGradient(
  mint: string,
  imageUrl: string,
  options: UseTokenGradientOptions = {},
): UseTokenGradientReturn {
  const {
    opacity = 0.6,
    fallbackColor = "#6366f1",
    enabled = true,
    forceRefresh = false,
  } = options;

  const [gradientColors, setGradientColors] = useState<GradientColors | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Database hooks
  const { data: cachedGradient, refetch: refetchCache } = useTokenGradientQuery(
    mint,
    {
      enabled: enabled && !!mint,
    },
  );
  const updateGradientMutation = useUpdateTokenGradient();

  const extractAndCacheColors = async () => {
    if (!mint || !imageUrl || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const colors = await TokenGradientService.extractAndCache(
        mint,
        imageUrl,
        updateGradientMutation,
        { opacity, fallbackColor },
      );

      setGradientColors(colors);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err
          : new Error("Failed to extract gradient colors");
      setError(errorMessage);

      // Set fallback colors on error
      setGradientColors({
        primary: `rgba(99, 102, 241, ${opacity * 0.6})`,
        secondary: `rgba(99, 102, 241, ${opacity * 0.35})`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    if (forceRefresh || !cachedGradient) {
      extractAndCacheColors();
    } else {
      refetchCache();
    }
  };

  useEffect(() => {
    if (!enabled || !mint) {
      setIsLoading(false);
      return;
    }

    // If we have cached gradient and not forcing refresh, use it
    if (cachedGradient && !forceRefresh) {
      setGradientColors(cachedGradient);
      setIsLoading(false);
      return;
    }

    // If no cached gradient or forcing refresh, extract new colors
    if (!cachedGradient || forceRefresh) {
      extractAndCacheColors();
      return;
    }
  }, [mint, imageUrl, enabled, forceRefresh, cachedGradient]);

  return {
    gradientColors,
    isLoading,
    error,
    refetch,
  };
}
