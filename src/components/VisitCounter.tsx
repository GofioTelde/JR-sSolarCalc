"use client";

import { useVisitCounter } from "@/hooks/useVisitCounter";

export function VisitCounter() {
  const { visitCount, isLoading } = useVisitCounter();

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        👀 Cargando visitas...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span>👀</span>
      <span>
        {visitCount !== null ? (
          <>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {visitCount.toLocaleString()}
            </span>
            <span> {visitCount === 1 ? "visita" : "visitas"}</span>
          </>
        ) : (
          "No disponible"
        )}
      </span>
    </div>
  );
}
