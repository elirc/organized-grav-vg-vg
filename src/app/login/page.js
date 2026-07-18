import Link from "next/link";
import { redirectIfAuthenticated } from "@/lib/page-auth";
import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <div className="panel w-full space-y-5 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Sign In</h1>
          <p className="text-sm text-zinc-600">Access your EOR operations workspace.</p>
        </div>
        <LoginForm />
        <p className="text-sm text-zinc-600">
          New organization?{" "}
          <Link href="/signup" className="font-semibold text-[var(--accent)]">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
