import { z } from "zod";

const idSchema = z.string().min(1);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  organizationName: z.string().min(2),
  legalName: z.string().min(2),
  headquartersCountry: z.string().min(2),
  billingEmail: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(10),
});

export const organizationCreateSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().min(2),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  headquartersCountry: z.string().min(2),
  headquartersAddress: z.string().optional(),
  billingEmail: z.string().email(),
  defaultCurrency: z.string().min(3).max(3).default("USD"),
  status: z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "CHURNED"]).optional(),
  settings: z.record(z.any()).optional(),
});

export const organizationUpdateSchema = organizationCreateSchema.partial();

export const employeeCreateSchema = z.object({
  organizationId: idSchema.optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  personalEmail: z.string().email(),
  workEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  employmentCountry: z.string().min(2),
  jobTitle: z.string().min(1),
  department: z.string().optional(),
  managerId: idSchema.optional(),
  startDate: z.string().datetime(),
  compensationAmount: z.number().positive().optional(),
  compensationCurrency: z.string().min(3).max(3).optional(),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]).optional(),
});

export const employeeUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  workEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  managerId: idSchema.optional().nullable(),
  status: z.enum(["ONBOARDING", "ACTIVE", "ON_LEAVE", "TERMINATING", "TERMINATED"]).optional(),
  onboardingStatus: z.enum(["INVITED", "IN_PROGRESS", "PENDING_REVIEW", "APPROVED", "COMPLETED"]).optional(),
  endDate: z.string().datetime().optional().nullable(),
});

export const onboardingUpdateSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "VERIFIED", "REJECTED"]),
      completedAt: z.string().datetime().optional().nullable(),
      documentId: z.string().optional().nullable(),
      rejectionReason: z.string().optional().nullable(),
    }),
  ),
});

export const compensationCreateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]),
  effectiveDate: z.string().datetime(),
});

export const contractTemplateCreateSchema = z.object({
  organizationId: idSchema.optional(),
  name: z.string().min(2),
  countryCode: z.string().optional(),
  type: z.enum(["EMPLOYMENT", "CONTRACTOR", "AMENDMENT", "NDA"]),
  content: z.string().min(10),
  lockedSections: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const contractCreateSchema = z.object({
  organizationId: idSchema.optional(),
  employeeId: idSchema.optional(),
  contractorId: idSchema.optional(),
  templateId: idSchema.optional(),
  countryCode: z.string().optional(),
  type: z.enum(["EMPLOYMENT", "CONTRACTOR", "AMENDMENT", "NDA"]).optional(),
  effectiveDate: z.string().datetime().optional(),
  previousVersionId: idSchema.optional(),
  customTerms: z.record(z.any()).optional(),
  compensation: z.record(z.any()).optional(),
  benefits: z.record(z.any()).optional(),
});

export const contractUpdateSchema = z.object({
  customTerms: z.record(z.any()).optional(),
  renderedContent: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "VIEWED", "SIGNED", "ACTIVE", "AMENDED", "TERMINATED"]).optional(),
});

export const contractSignSchema = z.object({
  signature: z.string().min(1),
  typedName: z.string().min(1),
});

export const payrollCreateSchema = z.object({
  organizationId: idSchema.optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  payDate: z.string().datetime(),
  currency: z.string().min(3).max(3).optional(),
});

export const leavePolicyCreateSchema = z.object({
  organizationId: idSchema.optional(),
  countryCode: z.string().optional(),
  name: z.string().min(2),
  leaveType: z.string().min(2),
  accrualRate: z.number().min(0),
  accrualCadence: z.enum(["DAILY", "MONTHLY", "YEARLY"]).optional(),
  carryOverLimitDays: z.number().min(0).optional(),
  maxBalanceDays: z.number().min(0).optional(),
  requiresApproval: z.boolean().optional(),
});

export const leaveRequestCreateSchema = z.object({
  employeeId: idSchema,
  policyId: idSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalDays: z.number().positive().optional(),
  reason: z.string().optional(),
});

export const leaveDecisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  comment: z.string().optional(),
});

export const taxRuleCreateSchema = z.object({
  countryCode: z.string().min(2),
  regionCode: z.string().optional(),
  taxType: z.enum(["INCOME", "SOCIAL_SECURITY", "MEDICARE", "UNEMPLOYMENT", "PENSION", "LOCAL", "OTHER"]),
  paidBy: z.enum(["EMPLOYEE", "EMPLOYER", "BOTH"]),
  calculationType: z.enum(["PROGRESSIVE_BRACKET", "FLAT_RATE", "FLAT_AMOUNT", "WAGE_BASE_CAP"]),
  brackets: z.array(z.record(z.any())),
  wageBaseCapMinor: z.union([z.string(), z.number(), z.bigint()]).optional(),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const taxRuleUpdateSchema = taxRuleCreateSchema.partial();

export const contractorCreateSchema = z.object({
  organizationId: idSchema.optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  country: z.string().min(2),
  classificationScore: z.number().min(0).max(100).optional(),
  classificationRisk: z.string().optional(),
});

export const contractorUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  country: z.string().optional(),
  status: z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  classificationScore: z.number().min(0).max(100).optional(),
  classificationRisk: z.string().optional(),
});

export const contractorConvertSchema = z.object({
  employmentCountry: z.string().optional(),
  jobTitle: z.string().min(1),
  department: z.string().optional(),
  startDate: z.string().datetime(),
});

export const invoiceGenerateSchema = z.object({
  organizationId: idSchema.optional(),
  invoiceDate: z.string().datetime().optional(),
});
