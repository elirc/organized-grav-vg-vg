import { NextResponse } from "next/server";
import { getRequestUser, requireAuth, requirePermission } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { parseCsv } from "@/lib/csv";
import { importEmployeesFromCsvRows } from "@/services/employee.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    requireAuth(user);
    requirePermission(user, "employees.create");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.text !== "function") {
      throw new AppError(400, "CSV file is required as form field `file`.");
    }

    const text = await file.text();
    const { rows } = parseCsv(text);

    if (rows.length === 0) {
      throw new AppError(400, "CSV file has no importable rows.");
    }

    const result = await importEmployeesFromCsvRows(
      user,
      rows,
      requestMetaFromHeaders(request),
    );

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
