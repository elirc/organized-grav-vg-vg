"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
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
          organizationName: String(formData.get("organizationName") || ""),
          legalName: String(formData.get("legalName") || ""),
          headquartersCountry: String(formData.get("headquartersCountry") || ""),
          billingEmail: String(formData.get("billingEmail") || ""),
          firstName: String(formData.get("firstName") || ""),
          lastName: String(formData.get("lastName") || ""),
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || ""),
        };

        startTransition(async () => {
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const json = await response.json();
          if (!response.ok) {
            setError(json?.error?.message || "Sign up failed");
            return;
          }

          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Organization Name</label>
          <input className="input" type="text" name="organizationName" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Legal Name</label>
          <input className="input" type="text" name="legalName" required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">HQ Country</label>
          <input className="input" type="text" name="headquartersCountry" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Billing Email</label>
          <input className="input" type="email" name="billingEmail" required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">First Name</label>
          <input className="input" type="text" name="firstName" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Last Name</label>
          <input className="input" type="text" name="lastName" required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Account Email</label>
          <input className="input" type="email" name="email" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input className="input" type="password" name="password" required minLength={10} />
        </div>
      </div>
      {error ? <p className="danger text-sm">{error}</p> : null}
      <button className="button-primary w-full" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}
