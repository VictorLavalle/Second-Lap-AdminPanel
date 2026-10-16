import Image from "next/image";
import { branding } from "@/data/branding";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <Image
          src={branding.logo.markLight}
          alt={`${branding.name} logo`}
          width={64}
          height={64}
          priority
        />
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">
            {branding.name}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {branding.panelTitle}
          </p>
        </div>
      </header>
      <LoginForm />
    </main>
  );
}
