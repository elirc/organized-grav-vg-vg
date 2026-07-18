import Link from "next/link";
import { redirectIfAuthenticated } from "@/lib/page-auth";
import { SignupForm } from "@/components/forms/signup-form";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
      <div className="panel w-full space-y-5 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Create Organization</h1>
          <p className="text-sm text-zinc-600">
            Set up your tenant and start managing global employment workflows.
          </p>
        </div>
        <SignupForm />
        <p className="text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
