"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function BillingPanel({ plans, invoices }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Pricing Plans</h2>
            <p className="text-sm text-zinc-600">Active plans available for tenant billing.</p>
          </div>
          <button
            className="button-primary"
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                setError("");
                const response = await fetch("/api/billing/invoices/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });

                const json = await response.json();
                if (!response.ok) {
                  setError(json?.error?.message || "Invoice generation failed");
                  return;
                }

                router.refresh();
              });
            }}
          >
            {pending ? "Generating..." : "Generate Monthly Invoice"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div className="panel bg-white p-4" key={plan.id}>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">{plan.description || "Standard plan"}</p>
              <p className="mt-2 text-lg font-semibold">{Number(plan.baseMonthlyMinor) / 100} {plan.currency}</p>
              <p className="text-xs text-zinc-600">
                + {Number(plan.perEmployeeMonthlyMinor) / 100} {plan.currency} per employee
              </p>
            </div>
          ))}
        </div>
        {error ? <p className="danger mt-3 text-sm">{error}</p> : null}
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Period</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Subtotal</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr className="border-b border-[var(--line)]" key={invoice.id}>
                  <td className="py-2">
                    {new Date(invoice.periodStart).toISOString().slice(0, 10)} -{" "}
                    {new Date(invoice.periodEnd).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2"><span className="tag">{invoice.status}</span></td>
                  <td className="py-2">{Number(invoice.subtotalMinor) / 100}</td>
                  <td className="py-2">{Number(invoice.totalMinor) / 100}</td>
                  <td className="py-2">{new Date(invoice.dueDate).toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
