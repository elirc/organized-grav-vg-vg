"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);
        const payload = {
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || ""),
        };

        startTransition(async () => {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const json = await response.json();
          if (!response.ok) {
            setError(json?.error?.message || "Sign in failed");
            return;
          }

          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input className="input" type="email" name="email" required autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input className="input" type="password" name="password" required autoComplete="current-password" />
      </div>
      {error ? <p className="danger text-sm">{error}</p> : null}
      <button className="button-primary w-full" disabled={pending} type="submit">
        {pending ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
