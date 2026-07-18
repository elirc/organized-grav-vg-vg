"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PayrollPanel({ runs }) {
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
        <h2 className="text-xl font-semibold">Create Payroll Run</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");

            const formData = new FormData(event.currentTarget);
            const payload = {
              periodStart: new Date(String(formData.get("periodStart"))).toISOString(),
              periodEnd: new Date(String(formData.get("periodEnd"))).toISOString(),
              payDate: new Date(String(formData.get("payDate"))).toISOString(),
              currency: String(formData.get("currency") || "USD"),
            };

            startTransition(async () => {
              try {
                await submitJson("/api/payroll", "POST", payload);
                event.currentTarget.reset();
                router.refresh();
              } catch (submitError) {
                setError(submitError.message);
              }
            });
          }}
        >
          <input className="input" type="date" name="periodStart" required />
          <input className="input" type="date" name="periodEnd" required />
          <input className="input" type="date" name="payDate" required />
          <input className="input" name="currency" defaultValue="USD" />
          <button disabled={pending} className="button-primary md:col-span-4" type="submit">
            {pending ? "Creating..." : "Create Run"}
          </button>
        </form>
        {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Payroll Runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Period</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Gross</th>
                <th className="pb-2">Net</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-[var(--line)]">
                  <td className="py-2">
                    {new Date(run.periodStart).toISOString().slice(0, 10)} -{" "}
                    {new Date(run.periodEnd).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2"><span className="tag">{run.status}</span></td>
                  <td className="py-2">{Number(run.totalGrossMinor || 0) / 100}</td>
                  <td className="py-2">{Number(run.totalNetMinor || 0) / 100}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        className="button-secondary text-xs"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/payroll/${run.id}/calculate`, "POST", {});
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                      >
                        Calculate
                      </button>
                      <button
                        className="button-secondary text-xs"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/payroll/${run.id}/approve`, "POST", {});
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="button-secondary text-xs"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/payroll/${run.id}/process`, "POST", {});
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                      >
                        Process
                      </button>
                    </div>
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
