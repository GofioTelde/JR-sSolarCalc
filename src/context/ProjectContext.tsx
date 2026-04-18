"use client";
// src/context/ProjectContext.tsx
// Single source of truth for all project state.
// Wraps storageService so every component stays in sync without
// multiple independent localStorage reads.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { storageService, type ProjectData } from "@/services/storageService";

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

interface ProjectContextValue {
  /** The full project data, derived from localStorage on mount and kept in sync. */
  data: ProjectData;

  /** Patch the project data. Partial deep-merge at top level — nested objects are also merged. */
  update: (patch: Partial<ProjectData>) => void;

  /** Wipe all project data and reset to empty. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "INIT"; payload: ProjectData }
  | { type: "UPDATE"; payload: Partial<ProjectData> }
  | { type: "RESET" };

function reducer(state: ProjectData, action: Action): ProjectData {
  switch (action.type) {
    case "INIT":
      return action.payload;
    case "UPDATE": {
      const next = { ...state };
      for (const key of Object.keys(action.payload) as (keyof ProjectData)[]) {
        const sv = action.payload[key];
        const tv = state[key];
        if (
          sv !== null &&
          typeof sv === "object" &&
          !Array.isArray(sv) &&
          tv !== null &&
          typeof tv === "object" &&
          !Array.isArray(tv)
        ) {
          // @ts-expect-error — dynamic deep merge
          next[key] = { ...tv, ...sv };
        } else if (sv !== undefined) {
          // @ts-expect-error — dynamic assignment
          next[key] = sv;
        }
      }
      return next;
    }
    case "RESET":
      return {};
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, {});

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    dispatch({ type: "INIT", payload: storageService.getProjectData() });
  }, []);

  const update = useCallback((patch: Partial<ProjectData>) => {
    dispatch({ type: "UPDATE", payload: patch });
    storageService.saveProjectData(patch);
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    storageService.clearProjectData();
  }, []);

  const value = useMemo(() => ({ data, update, reset }), [data, update, reset]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used inside <ProjectProvider>");
  }
  return ctx;
}
