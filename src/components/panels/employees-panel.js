"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildEmployeeCsvTemplate, mapEmployeeCsvRow, parseCsv } from "@/lib/csv";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  personalEmail: "",
  employmentCountry: "",
  jobTitle: "",
  department: "",
  startDate: "",
  compensationAmount: "",
  compensationCurrency: "USD",
  payFrequency: "MONTHLY",
};

function createPayloadFromForm(form) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    personalEmail: form.personalEmail,
    employmentCountry: form.employmentCountry,
    jobTitle: form.jobTitle,
    department: form.department,
    startDate: new Date(form.startDate).toISOString(),
    compensationAmount: form.compensationAmount ? Number(form.compensationAmount) : 0,
    compensationCurrency: form.compensationCurrency || "USD",
    payFrequency: form.payFrequency || "MONTHLY",
  };
}

export function EmployeesPanel({ employees }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [csvMessage, setCsvMessage] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const readCsvRowsFromFile = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      throw new Error("Select a CSV file first.");
    }

    const text = await file.text();
    const parsed = parseCsv(text);

    if (!parsed.rows.length) {
      throw new Error("CSV has no data rows.");
    }

    return parsed.rows;
  };

  const downloadTemplate = () => {
    const csv = buildEmployeeCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "employee-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Add Employee</h2>
          <button className="button-secondary text-sm" type="button" onClick={downloadTemplate}>
            Download CSV Template
          </button>
        </div>

        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");

            startTransition(async () => {
              const response = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayloadFromForm(form)),
              });
              const json = await response.json();
              if (!response.ok) {
                setError(json?.error?.message || "Failed to create employee");
                return;
              }

              setForm(EMPTY_FORM);
              setImportSummary(null);
              router.refresh();
            });
          }}
        >
          <input
            name="firstName"
            className="input"
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => setField("firstName", event.target.value)}
            required
          />
          <input
            name="lastName"
            className="input"
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            required
          />
          <input
            name="personalEmail"
            className="input"
            placeholder="Personal email"
            type="email"
            value={form.personalEmail}
            onChange={(event) => setField("personalEmail", event.target.value)}
            required
          />
          <input
            name="employmentCountry"
            className="input"
            placeholder="Employment country (US)"
            value={form.employmentCountry}
            onChange={(event) => setField("employmentCountry", event.target.value)}
            required
          />
          <input
            name="jobTitle"
            className="input"
            placeholder="Job title"
            value={form.jobTitle}
            onChange={(event) => setField("jobTitle", event.target.value)}
            required
          />
          <input
            name="department"
            className="input"
            placeholder="Department"
            value={form.department}
            onChange={(event) => setField("department", event.target.value)}
          />
          <input
            name="startDate"
            className="input"
            type="date"
            value={form.startDate}
            onChange={(event) => setField("startDate", event.target.value)}
            required
          />
          <input
            name="compensationAmount"
            className="input"
            type="number"
            step="0.01"
            placeholder="Salary amount"
            value={form.compensationAmount}
            onChange={(event) => setField("compensationAmount", event.target.value)}
          />
          <input
            name="compensationCurrency"
            className="input"
            placeholder="Currency (USD)"
            value={form.compensationCurrency}
            onChange={(event) => setField("compensationCurrency", event.target.value)}
          />
          <select
            name="payFrequency"
            className="input"
            value={form.payFrequency}
            onChange={(event) => setField("payFrequency", event.target.value)}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="SEMI_MONTHLY">Semi-Monthly</option>
            <option value="BI_WEEKLY">Bi-Weekly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
          <button disabled={pending} type="submit" className="button-primary md:col-span-2">
            {pending ? "Saving..." : "Create Employee"}
          </button>
        </form>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-lg font-semibold">CSV Automation</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Upload a CSV to autofill the form from the first row or import all rows in bulk.
          </p>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="input md:max-w-sm"
            />
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                setCsvMessage("");
                setImportSummary(null);
                setError("");

                try {
                  const rows = await readCsvRowsFromFile();
                  const firstRow = mapEmployeeCsvRow(rows[0]);
                  setForm((current) => ({
                    ...current,
                    ...firstRow,
                    compensationAmount:
                      firstRow.compensationAmount === null
                        ? current.compensationAmount
                        : String(firstRow.compensationAmount),
                  }));
                  setCsvMessage("Form autofilled from first CSV row.");
                } catch (autofillError) {
                  setError(autofillError.message);
                }
              }}
            >
              Autofill Form
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  setCsvMessage("");
                  setImportSummary(null);
                  setError("");

                  try {
                    const file = fileInputRef.current?.files?.[0];
                    if (!file) {
                      throw new Error("Select a CSV file first.");
                    }

                    const upload = new FormData();
                    upload.append("file", file);

                    const response = await fetch("/api/employees/import-csv", {
                      method: "POST",
                      body: upload,
                    });
                    const json = await response.json();

                    if (!response.ok) {
                      throw new Error(json?.error?.message || "CSV import failed.");
                    }

                    setImportSummary(json.data);
                    setCsvMessage(
                      `Imported ${json.data.createdCount}/${json.data.totalRows} rows.`,
                    );
                    router.refresh();
                  } catch (importError) {
                    setError(importError.message);
                  }
                });
              }}
            >
              {pending ? "Importing..." : "Import CSV Rows"}
            </button>
          </div>

          {csvMessage ? <p className="mt-2 text-sm text-emerald-700">{csvMessage}</p> : null}
          {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
          {importSummary ? (
            <div className="mt-3 panel bg-white p-3 text-sm">
              <p>
                Created: {importSummary.createdCount} / {importSummary.totalRows}
              </p>
              {importSummary.failedCount > 0 ? (
                <div className="mt-2 space-y-1">
                  {importSummary.results
                    .filter((item) => item.status === "failed")
                    .slice(0, 10)
                    .map((item) => (
                      <p key={`row-${item.rowNumber}`} className="danger">
                        Row {item.rowNumber}: {item.errors.join(" ")}
                      </p>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Employee Directory</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Country</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-[var(--line)]">
                  <td className="py-2">
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="py-2">{employee.personalEmail}</td>
                  <td className="py-2">{employee.employmentCountry}</td>
                  <td className="py-2">{employee.jobTitle}</td>
                  <td className="py-2">
                    <span className="tag">{employee.status}</span>
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
