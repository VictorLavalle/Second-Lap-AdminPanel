"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { branding } from "@/data/branding";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
      <div className="flex items-center gap-3">
        <Image
          src={branding.logo.markLight}
          alt=""
          width={32}
          height={32}
          priority
        />
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {branding.name}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {branding.panelTitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-[var(--color-line)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-canvas)]"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
