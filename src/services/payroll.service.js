import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toMinorUnits } from "@/lib/money";
import { writeAuditLog } from "@/lib/audit";
import { publishDomainEvent } from "@/lib/events";
import { resolveOrganizationId } from "@/services/context";
import { createNotification } from "@/services/notification.service";

function asBigInt(value) {
  return BigInt(value || 0);
}

function toMajor(minor) {
  return Number(minor || 0) / 100;
}

function computeProgressiveTax(brackets, taxableMajor) {
  let tax = 0;

  for (const bracket of brackets) {
    const min = Number(bracket.min || 0);
    const max = bracket.max === null || bracket.max === undefined ? taxableMajor : Number(bracket.max);

    if (taxableMajor <= min) {
      continue;
    }

    const taxableSlice = Math.max(0, Math.min(taxableMajor, max) - min);
    if (taxableSlice <= 0) {
      continue;
    }

    const rate = Number(bracket.rate || 0);
    const flatAmount = Number(bracket.flatAmount || 0);

    tax += taxableSlice * rate;
    tax += flatAmount;
  }

  return tax;
}

function computeTaxForRule(rule, taxableMinor, ytdMinor) {
  const brackets = Array.isArray(rule.brackets) ? rule.brackets : [];
  const taxableMajor = toMajor(taxableMinor);
  const ytdMajor = toMajor(ytdMinor);

  let taxMajor = 0;

  if (rule.calculationType === "PROGRESSIVE_BRACKET") {
    taxMajor = computeProgressiveTax(brackets, taxableMajor);
  }

  if (rule.calculationType === "FLAT_RATE") {
    const rate = Number(brackets[0]?.rate || 0);
    taxMajor = taxableMajor * rate;
  }

  if (rule.calculationType === "FLAT_AMOUNT") {
    taxMajor = Number(brackets[0]?.flatAmount || 0);
  }

  if (rule.calculationType === "WAGE_BASE_CAP") {
    const rate = Number(brackets[0]?.rate || 0);
    const capMajor = toMajor(rule.wageBaseCapMinor || 0);
    const remaining = Math.max(0, capMajor - ytdMajor);
    taxMajor = Math.min(taxableMajor, remaining) * rate;
  }

  const taxMinor = toMinorUnits(taxMajor);

  if (rule.paidBy === "EMPLOYEE") {
    return { employeeAmountMinor: taxMinor, employerAmountMinor: BigInt(0) };
  }

  if (rule.paidBy === "EMPLOYER") {
    return { employeeAmountMinor: BigInt(0), employerAmountMinor: taxMinor };
  }

  return { employeeAmountMinor: taxMinor, employerAmountMinor: taxMinor };
}

async function loadCurrentCompensation(employeeId, periodEnd) {
  return db.compensation.findFirst({
    where: {
      employeeId,
      isCurrent: true,
      effectiveDate: {
        lte: periodEnd,
      },
    },
    orderBy: {
      effectiveDate: "desc",
    },
  });
}

async function loadYtd(employeeId, organizationId, periodStart) {
  const yearStart = new Date(periodStart.getFullYear(), 0, 1);

  const aggregates = await db.payrollItem.aggregate({
    where: {
      employeeId,
      payrollRun: {
        organizationId,
        periodStart: {
          gte: yearStart,
          lt: periodStart,
        },
      },
      status: {
        in: ["APPROVED", "PAID", "CALCULATED"],
      },
    },
    _sum: {
      grossPayMinor: true,
      totalEmployeeTaxMinor: true,
    },
  });

  return {
    ytdGrossMinor: asBigInt(aggregates._sum.grossPayMinor || 0),
    ytdTaxMinor: asBigInt(aggregates._sum.totalEmployeeTaxMinor || 0),
  };
}

function ensureStorageDir() {
  const dir = path.join(process.cwd(), "storage", "payslips");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function generatePayslip(item, employee, run) {
  const outputDir = ensureStorageDir();
  const fileName = `${item.id}.pdf`;
  const absolutePath = path.join(outputDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(absolutePath);

    doc.pipe(stream);

    doc.fontSize(18).text("Payslip", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${employee.firstName} ${employee.lastName}`);
    doc.text(`Period: ${run.periodStart.toISOString().slice(0, 10)} to ${run.periodEnd.toISOString().slice(0, 10)}`);
    doc.text(`Currency: ${item.currency}`);
    doc.moveDown();
    doc.text(`Gross Pay: ${toMajor(item.grossPayMinor).toFixed(2)}`);
    doc.text(`Employee Tax: ${toMajor(item.totalEmployeeTaxMinor).toFixed(2)}`);
    doc.text(`Net Pay: ${toMajor(item.netPayMinor).toFixed(2)}`);
    doc.moveDown();
    doc.text(`YTD Gross: ${toMajor(item.ytdGrossMinor).toFixed(2)}`);
    doc.text(`YTD Tax: ${toMajor(item.ytdTaxMinor).toFixed(2)}`);

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return `/api/documents/payslips/${item.id}`;
}

export async function listPayrollRuns(user, organizationId = null) {
  const resolvedOrganizationId = resolveOrganizationId(user, organizationId);

  return db.payrollRun.findMany({
    where: {
      organizationId: resolvedOrganizationId,
    },
    orderBy: {
      periodStart: "desc",
    },
  });
}

export async function getPayrollRun(user, id) {
  const run = await db.payrollRun.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!run) {
    throw new AppError(404, "Payroll run not found");
  }

  resolveOrganizationId(user, run.organizationId);
  return run;
}

export async function listPayrollItems(user, runId) {
  const run = await db.payrollRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    throw new AppError(404, "Payroll run not found");
  }

  resolveOrganizationId(user, run.organizationId);

  return db.payrollItem.findMany({
    where: {
      payrollRunId: runId,
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createPayrollRun(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  const run = await db.$transaction(async (tx) => {
    const created = await tx.payrollRun.create({
      data: {
        organizationId,
        periodStart: new Date(payload.periodStart),
        periodEnd: new Date(payload.periodEnd),
        payDate: new Date(payload.payDate),
        status: "DRAFT",
        currency: payload.currency || "USD",
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "payroll.run.created",
      resourceType: "PayrollRun",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return created;
  });

  return run;
}

export async function calculatePayrollRun(user, runId, requestMeta = {}) {
  const run = await db.payrollRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    throw new AppError(404, "Payroll run not found");
  }

  const organizationId = resolveOrganizationId(user, run.organizationId);

  const employees = await db.employee.findMany({
    where: {
      organizationId,
      status: {
        in: ["ACTIVE", "ONBOARDING", "ON_LEAVE"],
      },
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      employmentCountry: true,
    },
  });

  const taxRules = await db.taxRule.findMany({
    where: {
      isActive: true,
      effectiveDate: {
        lte: run.periodEnd,
      },
      OR: [{ expirationDate: null }, { expirationDate: { gte: run.periodStart } }],
    },
  });

  let totalGrossMinor = BigInt(0);
  let totalNetMinor = BigInt(0);
  let totalEmployerCostMinor = BigInt(0);

  await db.$transaction(async (tx) => {
    await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: "CALCULATING" },
    });

    for (const employee of employees) {
      try {
        const compensation = await loadCurrentCompensation(employee.id, run.periodEnd);

        if (!compensation) {
          await tx.payrollItem.upsert({
            where: {
              payrollRunId_employeeId: {
                payrollRunId: run.id,
                employeeId: employee.id,
              },
            },
            update: {
              status: "FAILED",
              errorReason: "Missing current compensation",
            },
            create: {
              payrollRunId: run.id,
              employeeId: employee.id,
              baseSalaryMinor: 0,
              grossPayMinor: 0,
              preTaxDeductions: [],
              taxableIncomeMinor: 0,
              taxes: [],
              postTaxDeductions: [],
              totalEmployeeTaxMinor: 0,
              totalEmployerTaxMinor: 0,
              netPayMinor: 0,
              currency: run.currency,
              status: "FAILED",
              errorReason: "Missing current compensation",
              ytdGrossMinor: 0,
              ytdTaxMinor: 0,
            },
          });

          continue;
        }

        const baseSalaryMinor = asBigInt(compensation.amountMinor);
        const overtimeMinor = BigInt(0);
        const bonusMinor = BigInt(0);
        const commissionMinor = BigInt(0);
        const allowancesMinor = BigInt(0);

        const grossPayMinor = baseSalaryMinor + overtimeMinor + bonusMinor + commissionMinor + allowancesMinor;
        const preTaxDeductions = [];
        const taxableIncomeMinor = grossPayMinor;

        const { ytdGrossMinor, ytdTaxMinor } = await loadYtd(employee.id, organizationId, run.periodStart);

        const matchingRules = taxRules.filter((rule) => rule.countryCode === employee.employmentCountry);

        const taxes = [];
        let totalEmployeeTaxMinor = BigInt(0);
        let totalEmployerTaxMinor = BigInt(0);

        for (const rule of matchingRules) {
          const result = computeTaxForRule(rule, taxableIncomeMinor, ytdGrossMinor);
          totalEmployeeTaxMinor += result.employeeAmountMinor;
          totalEmployerTaxMinor += result.employerAmountMinor;

          taxes.push({
            taxType: rule.taxType,
            employeeAmountMinor: result.employeeAmountMinor.toString(),
            employerAmountMinor: result.employerAmountMinor.toString(),
          });
        }

        const postTaxDeductions = [];
        const netPayMinor = grossPayMinor - totalEmployeeTaxMinor;

        await tx.payrollItem.upsert({
          where: {
            payrollRunId_employeeId: {
              payrollRunId: run.id,
              employeeId: employee.id,
            },
          },
          update: {
            baseSalaryMinor,
            overtimeMinor,
            bonusMinor,
            commissionMinor,
            allowancesMinor,
            grossPayMinor,
            preTaxDeductions,
            taxableIncomeMinor,
            taxes,
            postTaxDeductions,
            totalEmployeeTaxMinor,
            totalEmployerTaxMinor,
            netPayMinor,
            currency: compensation.currency,
            status: "CALCULATED",
            errorReason: null,
            ytdGrossMinor: ytdGrossMinor + grossPayMinor,
            ytdTaxMinor: ytdTaxMinor + totalEmployeeTaxMinor,
          },
          create: {
            payrollRunId: run.id,
            employeeId: employee.id,
            baseSalaryMinor,
            overtimeMinor,
            bonusMinor,
            commissionMinor,
            allowancesMinor,
            grossPayMinor,
            preTaxDeductions,
            taxableIncomeMinor,
            taxes,
            postTaxDeductions,
            totalEmployeeTaxMinor,
            totalEmployerTaxMinor,
            netPayMinor,
            currency: compensation.currency,
            status: "CALCULATED",
            ytdGrossMinor: ytdGrossMinor + grossPayMinor,
            ytdTaxMinor: ytdTaxMinor + totalEmployeeTaxMinor,
          },
        });

        totalGrossMinor += grossPayMinor;
        totalNetMinor += netPayMinor;
        totalEmployerCostMinor += grossPayMinor + totalEmployerTaxMinor;
      } catch (error) {
        await tx.payrollItem.upsert({
          where: {
            payrollRunId_employeeId: {
              payrollRunId: run.id,
              employeeId: employee.id,
            },
          },
          update: {
            status: "FAILED",
            errorReason: error.message,
          },
          create: {
            payrollRunId: run.id,
            employeeId: employee.id,
            baseSalaryMinor: 0,
            grossPayMinor: 0,
            preTaxDeductions: [],
            taxableIncomeMinor: 0,
            taxes: [],
            postTaxDeductions: [],
            totalEmployeeTaxMinor: 0,
            totalEmployerTaxMinor: 0,
            netPayMinor: 0,
            currency: run.currency,
            status: "FAILED",
            errorReason: error.message,
            ytdGrossMinor: 0,
            ytdTaxMinor: 0,
          },
        });
      }
    }

    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "PENDING_APPROVAL",
        totalGrossMinor,
        totalNetMinor,
        totalEmployerCostMinor,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "payroll.run.calculated",
      resourceType: "PayrollRun",
      resourceId: run.id,
      changes: {
        totalGrossMinor: totalGrossMinor.toString(),
        totalNetMinor: totalNetMinor.toString(),
        totalEmployerCostMinor: totalEmployerCostMinor.toString(),
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: "payroll.calculated",
      aggregateType: "PayrollRun",
      aggregateId: run.id,
      payload: {
        payrollRunId: run.id,
      },
    });
  });

  const admins = await db.user.findMany({
    where: {
      organizationId,
      userRoles: {
        some: {
          role: {
            name: "CLIENT_ADMIN",
          },
        },
      },
    },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        category: "PAYROLL",
        title: "Payroll pending approval",
        body: "A payroll run has been calculated and is ready for approval.",
        actionUrl: `/payroll/${run.id}`,
      }),
    ),
  );

  return db.payrollRun.findUnique({ where: { id: run.id } });
}

export async function approvePayrollRun(user, runId, requestMeta = {}) {
  const run = await db.payrollRun.findUnique({ where: { id: runId } });

  if (!run) {
    throw new AppError(404, "Payroll run not found");
  }

  const organizationId = resolveOrganizationId(user, run.organizationId);

  return db.$transaction(async (tx) => {
    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    await tx.payrollItem.updateMany({
      where: {
        payrollRunId: runId,
        status: "CALCULATED",
      },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "payroll.run.approved",
      resourceType: "PayrollRun",
      resourceId: runId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return updated;
  });
}

export async function processPayrollRun(user, runId, requestMeta = {}) {
  const run = await db.payrollRun.findUnique({ where: { id: runId } });

  if (!run) {
    throw new AppError(404, "Payroll run not found");
  }

  const organizationId = resolveOrganizationId(user, run.organizationId);

  return db.$transaction(async (tx) => {
    await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "PROCESSING",
      },
    });

    const items = await tx.payrollItem.findMany({
      where: {
        payrollRunId: runId,
        status: "APPROVED",
      },
      include: {
        employee: true,
      },
    });

    for (const item of items) {
      const payslipUrl = await generatePayslip(item, item.employee, run);

      await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payslipUrl,
        },
      });

      if (item.employee.userId) {
        await tx.notification.create({
          data: {
            userId: item.employee.userId,
            type: "IN_APP",
            category: "PAYROLL",
            title: "Payslip available",
            body: `Your payslip for ${run.periodStart.toISOString().slice(0, 10)} - ${run.periodEnd
              .toISOString()
              .slice(0, 10)} is now available.`,
            actionUrl: "/my/payslips",
          },
        });
      }
    }

    const completed = await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "payroll.run.processed",
      resourceType: "PayrollRun",
      resourceId: runId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: "payroll.processed",
      aggregateType: "PayrollRun",
      aggregateId: runId,
      payload: {
        payrollRunId: runId,
      },
    });

    return completed;
  });
}
