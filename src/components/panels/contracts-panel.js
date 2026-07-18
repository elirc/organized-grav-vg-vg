"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ContractsPanel({ contracts, templates, employees, contractors }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const submitJson = async (url, method, payload) => {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
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
        <h2 className="text-xl font-semibold">Create Contract</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const formData = new FormData(event.currentTarget);
            const payload = {
              templateId: String(formData.get("templateId") || ""),
              employeeId: String(formData.get("employeeId") || "") || undefined,
              contractorId: String(formData.get("contractorId") || "") || undefined,
              effectiveDate: new Date(String(formData.get("effectiveDate") || "")).toISOString(),
            };

            startTransition(async () => {
              try {
                await submitJson("/api/contracts", "POST", payload);
                event.currentTarget.reset();
                router.refresh();
              } catch (submitError) {
                setError(submitError.message);
              }
            });
          }}
        >
          <select className="input" name="templateId" required>
            <option value="">Template</option>
            {templates.map((template) => (
              <option value={template.id} key={template.id}>
                {template.name} v{template.version}
              </option>
            ))}
          </select>
          <input name="effectiveDate" className="input" type="date" required />
          <select className="input" name="employeeId" defaultValue="">
            <option value="">Employee (optional)</option>
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <select className="input" name="contractorId" defaultValue="">
            <option value="">Contractor (optional)</option>
            {contractors.map((contractor) => (
              <option value={contractor.id} key={contractor.id}>
                {contractor.firstName} {contractor.lastName}
              </option>
            ))}
          </select>
          <button disabled={pending} className="button-primary md:col-span-2" type="submit">
            {pending ? "Creating..." : "Create Contract"}
          </button>
        </form>
        {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Contract List</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Type</th>
                <th className="pb-2">Worker</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr className="border-b border-[var(--line)]" key={contract.id}>
                  <td className="py-2">{contract.type}</td>
                  <td className="py-2">
                    {contract.employee
                      ? `${contract.employee.firstName} ${contract.employee.lastName}`
                      : contract.contractor
                        ? `${contract.contractor.firstName} ${contract.contractor.lastName}`
                        : "N/A"}
                  </td>
                  <td className="py-2"><span className="tag">{contract.status}</span></td>
                  <td className="py-2">{new Date(contract.createdAt).toISOString().slice(0, 10)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        className="button-secondary text-xs"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/contracts/${contract.id}/send`, "POST", {});
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                        type="button"
                      >
                        Send
                      </button>
                      <button
                        className="button-secondary text-xs"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/contracts/${contract.id}/sign`, "POST", {
                                signature: "typed-signature",
                                typedName: "Accepted in app",
                              });
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                        type="button"
                      >
                        Sign
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
