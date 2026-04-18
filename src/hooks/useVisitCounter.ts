"use client";

import { useState, useEffect } from "react";
import { incrementVisitCounter } from "@/services/visitCounterService";

/**
 * Hook to manage the visit counter.
 * Increments the counter on component mount and returns the current count.
 */
export function useVisitCounter() {
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateCounter = async () => {
      const result = await incrementVisitCounter();
      if (result) {
        setVisitCount(result.count);
      }
      setIsLoading(false);
    };

    updateCounter();
  }, []);

  return { visitCount, isLoading };
}
