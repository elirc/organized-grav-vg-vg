"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ContractorsPanel({ contractors }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const submitJson = async (url, method, payload) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error?.message || "Request failed");
    }
    return json.data;
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Add Contractor</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");

            const formData = new FormData(event.currentTarget);
            const payload = {
              firstName: String(formData.get("firstName") || ""),
              lastName: String(formData.get("lastName") || ""),
              email: String(formData.get("email") || ""),
              country: String(formData.get("country") || ""),
              classificationScore: Number(formData.get("classificationScore") || 0),
              classificationRisk: String(formData.get("classificationRisk") || ""),
            };

            startTransition(async () => {
              try {
                await submitJson("/api/contractors", "POST", payload);
                event.currentTarget.reset();
                router.refresh();
              } catch (submitError) {
                setError(submitError.message);
              }
            });
          }}
        >
          <input className="input" name="firstName" placeholder="First name" required />
          <input className="input" name="lastName" placeholder="Last name" required />
          <input className="input" name="email" placeholder="Email" type="email" required />
          <input className="input" name="country" placeholder="Country" required />
          <input className="input" name="classificationScore" placeholder="Classification score" type="number" />
          <input className="input" name="classificationRisk" placeholder="Risk (LOW/MEDIUM/HIGH)" />
          <button className="button-primary md:col-span-2" type="submit" disabled={pending}>
            {pending ? "Saving..." : "Create Contractor"}
          </button>
        </form>
        {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Contractor Directory</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Country</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((contractor) => (
                <tr key={contractor.id} className="border-b border-[var(--line)]">
                  <td className="py-2">{contractor.firstName} {contractor.lastName}</td>
                  <td className="py-2">{contractor.email}</td>
                  <td className="py-2">{contractor.country}</td>
                  <td className="py-2"><span className="tag">{contractor.status}</span></td>
                  <td className="py-2">
                    <button
                      className="button-secondary text-xs"
                      disabled={pending}
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await submitJson(`/api/contractors/${contractor.id}/convert`, "POST", {
                              jobTitle: "Converted Role",
                              startDate: new Date().toISOString(),
                            });
                            router.refresh();
                          } catch (submitError) {
                            setError(submitError.message);
                          }
                        });
                      }}
                    >
                      Convert to Employee
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
