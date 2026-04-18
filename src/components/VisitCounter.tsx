"use client";

import { useEffect, useRef, useState } from "react";
import { useVisitCounter } from "@/hooks/useVisitCounter";

const SECRET_SEQUENCE = "vis";

export function VisitCounter() {
  const { visitCount, isLoading } = useVisitCounter();
  const [visible, setVisible] = useState(false);
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (!/^[a-zA-Z]$/.test(e.key)) return;

      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-SECRET_SEQUENCE.length);

      if (bufferRef.current === SECRET_SEQUENCE) {
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 10000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

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
