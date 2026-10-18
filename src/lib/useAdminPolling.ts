"use client";

import { useEffect, useRef } from "react";

const DEFAULT_SECONDS = 15;
const MIN_SECONDS = 5;

// Resolves the poll interval from NEXT_PUBLIC_ADMIN_POLL_SECONDS (default 15s),
// clamped to a floor of 5s so a misconfigured value can't hammer the BFF. The
// admin polls faster than the storefront (60s) because the seller needs to see
// changes first.
export function resolveAdminPollMs(): number {
  const raw = Number(process.env.NEXT_PUBLIC_ADMIN_POLL_SECONDS);
  const seconds = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SECONDS;
  return Math.max(seconds, MIN_SECONDS) * 1000;
}

// Calls `onTick` on an interval, but ONLY while the tab is visible and not
// paused. Pauses (clears the timer) when the tab is hidden or `paused` is true,
// and resumes — with an immediate tick — when it becomes visible/unpaused
// again. Keeps a ref to the latest callback so changing it doesn't reset the
// timer. No network work happens in the background.
export function useAdminPolling(
  onTick: () => void,
  options?: { intervalMs?: number; paused?: boolean },
): void {
  const intervalMs = options?.intervalMs ?? resolveAdminPollMs();
  const paused = options?.paused ?? false;
  const onTickRef = useRef(onTick);

  // Keep the ref pointed at the latest callback without resetting the interval.
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (paused) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | undefined;

    function start() {
      if (timer === undefined) {
        timer = setInterval(() => onTickRef.current(), intervalMs);
      }
    }
    function stop() {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    }

    function sync() {
      if (document.visibilityState === "visible") {
        onTickRef.current();
        start();
      } else {
        stop();
      }
    }

    document.addEventListener("visibilitychange", sync);
    // Start only if currently visible; do not tick on initial mount (the
    // caller already loaded data), so just start the timer when visible.
    if (document.visibilityState === "visible") {
      start();
    }

    return () => {
      document.removeEventListener("visibilitychange", sync);
      stop();
    };
  }, [intervalMs, paused]);
}
