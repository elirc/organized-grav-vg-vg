"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminPanel({ taxRules, templates, organizations }) {
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
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Create Tax Rule</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              const formData = new FormData(event.currentTarget);
              const payload = {
                countryCode: String(formData.get("countryCode") || ""),
                taxType: String(formData.get("taxType") || "INCOME"),
                paidBy: String(formData.get("paidBy") || "EMPLOYEE"),
                calculationType: String(formData.get("calculationType") || "FLAT_RATE"),
                brackets: [{ rate: Number(formData.get("rate") || 0) }],
                effectiveDate: new Date(String(formData.get("effectiveDate") || "")).toISOString(),
              };

              startTransition(async () => {
                try {
                  await submitJson("/api/tax-rules", "POST", payload);
                  event.currentTarget.reset();
                  router.refresh();
                } catch (submitError) {
                  setError(submitError.message);
                }
              });
            }}
          >
            <input className="input" name="countryCode" placeholder="Country Code (US)" required />
            <div className="grid gap-3 md:grid-cols-3">
              <select className="input" name="taxType">
                <option value="INCOME">Income</option>
                <option value="SOCIAL_SECURITY">Social Security</option>
                <option value="MEDICARE">Medicare</option>
                <option value="OTHER">Other</option>
              </select>
              <select className="input" name="paidBy">
                <option value="EMPLOYEE">Employee</option>
                <option value="EMPLOYER">Employer</option>
                <option value="BOTH">Both</option>
              </select>
              <select className="input" name="calculationType">
                <option value="FLAT_RATE">Flat Rate</option>
                <option value="PROGRESSIVE_BRACKET">Progressive</option>
                <option value="FLAT_AMOUNT">Flat Amount</option>
                <option value="WAGE_BASE_CAP">Wage Base Cap</option>
              </select>
            </div>
            <input className="input" type="number" step="0.0001" name="rate" placeholder="Rate (e.g. 0.1)" />
            <input className="input" type="date" name="effectiveDate" required />
            <button className="button-primary w-full" disabled={pending} type="submit">
              {pending ? "Saving..." : "Create Tax Rule"}
            </button>
          </form>
        </div>

        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Create Contract Template</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              const formData = new FormData(event.currentTarget);
              const payload = {
                name: String(formData.get("name") || ""),
                type: String(formData.get("type") || "EMPLOYMENT"),
                content: String(formData.get("content") || ""),
              };

              startTransition(async () => {
                try {
                  await submitJson("/api/contract-templates", "POST", payload);
                  event.currentTarget.reset();
                  router.refresh();
                } catch (submitError) {
                  setError(submitError.message);
                }
              });
            }}
          >
            <input className="input" name="name" placeholder="Template name" required />
            <select className="input" name="type">
              <option value="EMPLOYMENT">Employment</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="AMENDMENT">Amendment</option>
              <option value="NDA">NDA</option>
            </select>
            <textarea
              className="input"
              rows={6}
              name="content"
              defaultValue={"Agreement between {{organization.legalName}} and {{employee.fullName}}."}
            />
            <button className="button-primary w-full" disabled={pending} type="submit">
              {pending ? "Saving..." : "Create Template"}
            </button>
          </form>
        </div>
      </div>

      {error ? <p className="danger text-sm">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Tax Rules</h3>
          <div className="mt-3 space-y-2 text-sm">
            {taxRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                <span>{rule.countryCode} {rule.taxType}</span>
                <span className="tag">{rule.calculationType}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Contract Templates</h3>
          <div className="mt-3 space-y-2 text-sm">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                <span>{template.name}</span>
                <span className="tag">v{template.version}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Organizations</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Name</th>
                <th className="pb-2">HQ</th>
                <th className="pb-2">Billing Email</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id} className="border-b border-[var(--line)]">
                  <td className="py-2">{organization.name}</td>
                  <td className="py-2">{organization.headquartersCountry}</td>
                  <td className="py-2">{organization.billingEmail}</td>
                  <td className="py-2"><span className="tag">{organization.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
