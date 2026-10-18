"use client";

// Discreet banner shown when a background poll detected new data but the view
// is filtered or past the first page, so we don't move the list under the user.
// Clicking refreshes on demand.
export function RefreshNotice({
  onRefresh,
}: Readonly<{ onRefresh: () => void }>) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-accent)] bg-[var(--color-canvas)] px-4 py-2 text-sm"
    >
      <span className="text-[var(--color-ink)]">Hay cambios nuevos</span>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-md bg-[var(--color-accent)] px-3 py-1 font-medium text-white hover:bg-[var(--color-accent-soft)]"
      >
        Actualizar
      </button>
    </div>
  );
}
