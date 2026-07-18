import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({ user, children }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 md:px-6">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 md:grid-cols-[260px_1fr]">
        <aside className="panel p-4">
          <Link href="/dashboard" className="mb-4 block border-b border-[var(--line)] pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Velocity Grid</p>
            <h1 className="mt-1 text-xl font-semibold">EOR Console</h1>
          </Link>
          <AppNav />
          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <p className="text-xs text-zinc-600">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
