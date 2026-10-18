"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readErrorRef, withErrorRef } from "@/lib/errorRef";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

const GENERIC_ERROR = "No se pudieron cargar los datos. Inténtalo de nuevo.";

// Fetches a BFF admin resource and tracks loading/error/ready state. On 401 the
// session is gone, so it redirects to /login rather than surfacing an error.
export function useAdminResource<T>(path: string): {
  state: ResourceState<T>;
  reload: (options?: { silent?: boolean }) => void;
} {
  const router = useRouter();
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });
  const activeRef = useRef(true);

  // Performs the fetch and updates state in async continuations only (never
  // synchronously), so it is safe to invoke from an effect. In silent mode
  // (used by background polling) it does not surface loading/error states: it
  // only swaps in fresh data on success, leaving the current view untouched on
  // a transient failure so the table never flickers or blanks out.
  const load = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(path, { credentials: "same-origin" });
        if (!activeRef.current) {
          return;
        }
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          if (silent) {
            return;
          }
          // Unexpected (5xx) responses carry a correlation ref; append it so
          // the user can quote it when reporting the failure. 4xx have no ref.
          const body = await response.json().catch(() => null);
          setState({
            status: "error",
            message: withErrorRef(GENERIC_ERROR, readErrorRef(body)),
          });
          return;
        }
        const data = (await response.json()) as T;
        if (activeRef.current) {
          setState({ status: "ready", data });
        }
      } catch {
        if (!silent && activeRef.current) {
          setState({ status: "error", message: GENERIC_ERROR });
        }
      }
    },
    [path, router],
  );

  const reload = useCallback(
    (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setState({ status: "loading" });
      }
      void load(options?.silent);
    },
    [load],
  );

  useEffect(() => {
    activeRef.current = true;
    // Fetch-on-mount synchronizes component state with an external system (the
    // BFF). All setState calls in load() happen in async continuations after an
    // awaited fetch, not synchronously, so cascading renders do not occur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  return { state, reload };
}
