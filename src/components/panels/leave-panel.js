"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LeavePanel({ policies, requests, employees }) {
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
        <h2 className="text-xl font-semibold">Submit Leave Request</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");

            const formData = new FormData(event.currentTarget);
            const payload = {
              employeeId: String(formData.get("employeeId") || ""),
              policyId: String(formData.get("policyId") || ""),
              startDate: new Date(String(formData.get("startDate") || "")).toISOString(),
              endDate: new Date(String(formData.get("endDate") || "")).toISOString(),
              reason: String(formData.get("reason") || ""),
            };

            startTransition(async () => {
              try {
                await submitJson("/api/leave/requests", "POST", payload);
                event.currentTarget.reset();
                router.refresh();
              } catch (submitError) {
                setError(submitError.message);
              }
            });
          }}
        >
          <select name="employeeId" className="input" required defaultValue="">
            <option value="">Employee</option>
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <select name="policyId" className="input" required defaultValue="">
            <option value="">Policy</option>
            {policies.map((policy) => (
              <option value={policy.id} key={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
          <input className="input" name="startDate" type="date" required />
          <input className="input" name="endDate" type="date" required />
          <textarea className="input md:col-span-2" name="reason" placeholder="Reason" rows={3} />
          <button className="button-primary md:col-span-2" type="submit" disabled={pending}>
            {pending ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
        {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Approval Queue</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Employee</th>
                <th className="pb-2">Dates</th>
                <th className="pb-2">Days</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-[var(--line)]">
                  <td className="py-2">{request.employee.firstName} {request.employee.lastName}</td>
                  <td className="py-2">
                    {new Date(request.startDate).toISOString().slice(0, 10)} -{" "}
                    {new Date(request.endDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2">{request.totalDays}</td>
                  <td className="py-2"><span className="tag">{request.status}</span></td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        className="button-secondary text-xs"
                        disabled={pending || request.status !== "PENDING"}
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/leave/requests/${request.id}`, "PATCH", { action: "APPROVE" });
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
                        disabled={pending || request.status !== "PENDING"}
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await submitJson(`/api/leave/requests/${request.id}`, "PATCH", { action: "REJECT" });
                              router.refresh();
                            } catch (submitError) {
                              setError(submitError.message);
                            }
                          });
                        }}
                      >
                        Reject
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
