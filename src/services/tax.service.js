import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function listTaxRules(user, filters = {}) {
  const where = {};

  if (filters.countryCode) {
    where.countryCode = filters.countryCode;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return db.taxRule.findMany({
    where,
    orderBy: [{ countryCode: "asc" }, { effectiveDate: "desc" }],
  });
}

export async function createTaxRule(user, payload) {
  return db.taxRule.create({
    data: {
      countryCode: payload.countryCode,
      regionCode: payload.regionCode || null,
      taxType: payload.taxType,
      paidBy: payload.paidBy,
      calculationType: payload.calculationType,
      brackets: payload.brackets,
      wageBaseCapMinor: payload.wageBaseCapMinor || null,
      effectiveDate: new Date(payload.effectiveDate),
      expirationDate: payload.expirationDate ? new Date(payload.expirationDate) : null,
      isActive: payload.isActive ?? true,
    },
  });
}

export async function updateTaxRule(user, id, payload) {
  const existing = await db.taxRule.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Tax rule not found");
  }

  return db.taxRule.update({
    where: { id },
    data: payload,
  });
}
