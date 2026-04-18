"use client";
// src/components/ui/ComponentCard.tsx
// Generic, reusable card component for catalog items (panels, batteries, inverters…).
// Replaces the 5 copy-pasted card-render functions that existed in Phase4.

import React from "react";

export type CardAccent = "orange" | "green" | "blue" | "yellow" | "purple";

export interface SpecItem {
  label: string;
  value: React.ReactNode;
}

export interface ComponentCardProps {
  // Identity
  id: string;
  title: string;

  // Main metric shown prominently (e.g. "400 W" / "5 kWh" / "5 kW")
  metric: string;
  metricSub?: string; // e.g. "útiles" or "AC nominal"

  // Spec rows shown below the metric
  specs: SpecItem[];

  // Footer line (e.g. "×4 paneles necesarios")
  footer?: React.ReactNode;

  // State
  isSelected: boolean;
  isRecommended?: boolean;
  /** Show a red "insufficient power" overlay */
  isInsufficient?: boolean;

  // Color theme
  accent?: CardAccent;

  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const ACCENT: Record<
  CardAccent,
  {
    selectedBorder: string;
    selectedBg: string;
    hoverBorder: string;
    checkBg: string;
    metricText: string;
    footerText: string;
  }
> = {
  orange: {
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50 dark:bg-orange-900/20",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700",
    checkBg: "bg-orange-500",
    metricText: "text-orange-600 dark:text-orange-400",
    footerText: "text-orange-600 dark:text-orange-400",
  },
  green: {
    selectedBorder: "border-green-500",
    selectedBg: "bg-green-50 dark:bg-green-900/20",
    hoverBorder: "hover:border-green-300 dark:hover:border-green-700",
    checkBg: "bg-green-500",
    metricText: "text-green-600 dark:text-green-400",
    footerText: "text-green-600 dark:text-green-400",
  },
  blue: {
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50 dark:bg-blue-900/20",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    checkBg: "bg-blue-500",
    metricText: "text-blue-600 dark:text-blue-400",
    footerText: "text-blue-600 dark:text-blue-400",
  },
  yellow: {
    selectedBorder: "border-yellow-500",
    selectedBg: "bg-yellow-50 dark:bg-yellow-900/20",
    hoverBorder: "hover:border-yellow-300 dark:hover:border-yellow-700",
    checkBg: "bg-yellow-500",
    metricText: "text-yellow-600 dark:text-yellow-400",
    footerText: "text-yellow-600 dark:text-yellow-400",
  },
  purple: {
    selectedBorder: "border-purple-500",
    selectedBg: "bg-purple-50 dark:bg-purple-900/20",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    checkBg: "bg-purple-500",
    metricText: "text-purple-600 dark:text-purple-400",
    footerText: "text-purple-600 dark:text-purple-400",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  metric,
  metricSub,
  specs,
  footer,
  isSelected,
  isRecommended = false,
  isInsufficient = false,
  accent = "blue",
  onClick,
}) => {
  const c = ACCENT[accent];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={[
        "relative cursor-pointer rounded-xl border-2 p-4 transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        isSelected
          ? `${c.selectedBorder} ${c.selectedBg} shadow-md`
          : `border-gray-200 dark:border-gray-700 ${c.hoverBorder}`,
        isInsufficient ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isSelected}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <span className="absolute -top-2.5 -right-2.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 leading-tight">
          Rec.
        </span>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div
          className={`absolute top-2 left-2 w-4 h-4 rounded-full ${c.checkBg} flex items-center justify-center`}
        >
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 6l3 3 5-5"
            />
          </svg>
        </div>
      )}

      {/* Title */}
      <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 leading-snug pr-2">
        {title}
      </p>

      {/* Main metric */}
      <div className={`text-2xl font-bold ${c.metricText} mb-2 leading-none`}>
        {metric}
        {metricSub && (
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
            {metricSub}
          </span>
        )}
      </div>

      {/* Spec rows */}
      <div className="space-y-[3px]">
        {specs.map((s, i) => (
          <div
            key={i}
            className="flex justify-between text-xs py-[2px] border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <span className="text-gray-500 dark:text-gray-400">{s.label}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 text-right ml-2">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {footer && (
        <div
          className={`mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-center text-xs ${
            isSelected ? c.footerText : "text-gray-500 dark:text-gray-400"
          } font-medium`}
        >
          {footer}
        </div>
      )}

      {/* Insufficient overlay */}
      {isInsufficient && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-red-500 font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-red-200">
            ⚠ Potencia insuficiente
          </span>
        </div>
      )}
    </div>
  );
};

export default ComponentCard;
