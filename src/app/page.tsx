import { branding } from "@/data/branding";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
        {branding.name}
      </h1>
      <p className="text-sm text-[var(--color-muted)]">{branding.panelTitle}</p>
    </main>
  );
}
