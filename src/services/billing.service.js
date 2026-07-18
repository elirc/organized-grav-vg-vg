import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import { resolveOrganizationId } from "@/services/context";
import { writeAuditLog } from "@/lib/audit";

export async function listPricingPlans() {
  return db.pricingPlan.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      baseMonthlyMinor: "asc",
    },
  });
}

export async function listInvoices(user, organizationId = null) {
  const resolvedOrganizationId = resolveOrganizationId(user, organizationId);

  return db.clientInvoice.findMany({
    where: {
      organizationId: resolvedOrganizationId,
    },
    include: {
      plan: true,
    },
    orderBy: {
      issueDate: "desc",
    },
  });
}

export async function generateMonthlyInvoice(user, payload = {}, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  const invoiceDate = payload.invoiceDate ? new Date(payload.invoiceDate) : new Date();
  const periodStart = startOfMonth(subMonths(invoiceDate, 1));
  const periodEnd = endOfMonth(subMonths(invoiceDate, 1));

  const [employees, payrollRuns, activePlan, organization] = await Promise.all([
    db.employee.count({
      where: {
        organizationId,
        status: {
          in: ["ACTIVE", "ON_LEAVE"],
        },
      },
    }),
    db.payrollRun.findMany({
      where: {
        organizationId,
        periodStart: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
    db.pricingPlan.findFirst({ where: { isActive: true } }),
    db.organization.findUnique({ where: { id: organizationId } }),
  ]);

  const baseMinor = BigInt(activePlan?.baseMonthlyMinor || 0);
  const perEmployeeMinor = BigInt(activePlan?.perEmployeeMonthlyMinor || 0) * BigInt(employees);
  const payrollServiceFeeMinor = payrollRuns.reduce(
    (sum, run) => sum + BigInt(run.totalEmployerCostMinor || 0) / BigInt(100),
    BigInt(0),
  );

  const subtotalMinor = baseMinor + perEmployeeMinor + payrollServiceFeeMinor;
  const taxMinor = BigInt(0);
  const totalMinor = subtotalMinor + taxMinor;

  return db.$transaction(async (tx) => {
    const invoice = await tx.clientInvoice.create({
      data: {
        organizationId,
        planId: activePlan?.id || null,
        periodStart,
        periodEnd,
        issueDate: invoiceDate,
        dueDate: new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: "SENT",
        currency: organization?.defaultCurrency || "USD",
        subtotalMinor,
        taxMinor,
        totalMinor,
        lineItems: [
          { label: "Base platform fee", amountMinor: baseMinor.toString() },
          { label: `Per employee fee (${employees})`, amountMinor: perEmployeeMinor.toString() },
          {
            label: "Payroll service fee",
            amountMinor: payrollServiceFeeMinor.toString(),
          },
        ],
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "billing.invoice.generated",
      resourceType: "ClientInvoice",
      resourceId: invoice.id,
      changes: {
        subtotalMinor: subtotalMinor.toString(),
        totalMinor: totalMinor.toString(),
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return invoice;
  });
}
