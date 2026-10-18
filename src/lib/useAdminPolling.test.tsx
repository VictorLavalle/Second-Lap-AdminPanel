import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { resolveAdminPollMs, useAdminPolling } from "./useAdminPolling";

function Probe({
  onTick,
  paused,
  intervalMs,
}: Readonly<{ onTick: () => void; paused?: boolean; intervalMs?: number }>) {
  useAdminPolling(onTick, { paused, intervalMs });
  return null;
}

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => value,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("resolveAdminPollMs", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to 15s", () => {
    expect(resolveAdminPollMs()).toBe(15000);
  });

  it("clamps to a 5s floor", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_POLL_SECONDS", "1");
    expect(resolveAdminPollMs()).toBe(5000);
  });

  it("honors a valid larger value", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_POLL_SECONDS", "30");
    expect(resolveAdminPollMs()).toBe(30000);
  });
});

describe("useAdminPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ticks on each interval while visible", () => {
    const onTick = vi.fn();
    render(<Probe onTick={onTick} intervalMs={1000} />);

    expect(onTick).not.toHaveBeenCalled(); // no immediate tick on mount
    vi.advanceTimersByTime(3000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("does not tick while hidden and resumes (with an immediate tick) when visible", () => {
    const onTick = vi.fn();
    render(<Probe onTick={onTick} intervalMs={1000} />);

    setVisibility("hidden");
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();

    setVisibility("visible");
    expect(onTick).toHaveBeenCalledTimes(1); // immediate tick on resume
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("does not tick while paused", () => {
    const onTick = vi.fn();
    render(<Probe onTick={onTick} intervalMs={1000} paused />);
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();
  });
});
