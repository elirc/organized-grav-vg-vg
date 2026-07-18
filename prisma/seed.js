const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const permissions = [
  "employees.view",
  "employees.create",
  "employees.edit",
  "employees.terminate",
  "payroll.view",
  "payroll.approve",
  "payroll.process",
  "billing.view",
  "billing.manage",
  "compliance.view",
  "compliance.manage",
  "reports.view",
  "reports.export",
  "leave.request",
  "leave.approve",
  "contractors.view",
  "contractors.manage",
  "contracts.view",
  "contracts.manage",
  "settings.manage",
  "notifications.view",
  "notifications.manage",
  "organizations.view",
  "organizations.manage",
  "admin.platform",
  "tax_rules.manage",
  "templates.manage",
];

const rolePermissions = {
  PLATFORM_ADMIN: ["*"],
  CLIENT_ADMIN: [
    "employees.view",
    "employees.create",
    "employees.edit",
    "employees.terminate",
    "payroll.view",
    "payroll.approve",
    "payroll.process",
    "billing.view",
    "billing.manage",
    "compliance.view",
    "compliance.manage",
    "reports.view",
    "reports.export",
    "leave.request",
    "leave.approve",
    "contractors.view",
    "contractors.manage",
    "contracts.view",
    "contracts.manage",
    "settings.manage",
    "notifications.view",
    "organizations.view",
    "organizations.manage",
    "tax_rules.manage",
    "templates.manage",
  ],
  CLIENT_MANAGER: ["employees.view", "leave.request", "leave.approve", "reports.view", "notifications.view", "contracts.view"],
  EMPLOYEE: ["leave.request", "notifications.view", "contracts.view"],
  CONTRACTOR: ["notifications.view"],
};

async function ensurePermission(name) {
  return prisma.permission.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function ensureRole({ organizationId = null, name, type, permissions: names }) {
  let role = await prisma.role.findFirst({
    where: { organizationId, name },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        organizationId,
        name,
        type,
        isSystem: true,
      },
    });
  }

  if (!names.includes("*")) {
    const permissionRecords = await prisma.permission.findMany({
      where: {
        name: {
          in: names,
        },
      },
    });

    for (const permission of permissionRecords) {
      const exists = await prisma.rolePermission.findFirst({
        where: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  return role;
}

async function assignRole(userId, roleId, organizationId = null) {
  const existing = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
      organizationId,
    },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        organizationId,
      },
    });
  }
}

async function main() {
  for (const permission of permissions) {
    await ensurePermission(permission);
  }

  const platformAdminRole = await ensureRole({
    organizationId: null,
    name: "PLATFORM_ADMIN",
    type: "PLATFORM_ADMIN",
    permissions: rolePermissions.PLATFORM_ADMIN,
  });

  const organization = await prisma.organization.upsert({
    where: { billingEmail: "admin@acme-global.example" },
    update: {},
    create: {
      name: "Acme Global",
      legalName: "Acme Global Inc.",
      headquartersCountry: "US",
      billingEmail: "admin@acme-global.example",
      status: "ACTIVE",
      defaultCurrency: "USD",
    },
  });

  const orgRoles = {};
  for (const roleName of ["CLIENT_ADMIN", "CLIENT_MANAGER", "EMPLOYEE", "CONTRACTOR"]) {
    orgRoles[roleName] = await ensureRole({
      organizationId: organization.id,
      name: roleName,
      type: roleName,
      permissions: rolePermissions[roleName],
    });
  }

  const passwordHash = await bcrypt.hash("ChangeMe!123", 12);

  const platformUser = await prisma.user.upsert({
    where: { email: "platform.admin@example.com" },
    update: {},
    create: {
      email: "platform.admin@example.com",
      firstName: "Platform",
      lastName: "Admin",
      passwordHash,
      status: "ACTIVE",
    },
  });

  await assignRole(platformUser.id, platformAdminRole.id, null);

  const clientAdmin = await prisma.user.upsert({
    where: { email: "client.admin@acme-global.example" },
    update: {},
    create: {
      organizationId: organization.id,
      email: "client.admin@acme-global.example",
      firstName: "Client",
      lastName: "Admin",
      passwordHash,
      status: "ACTIVE",
    },
  });

  await assignRole(clientAdmin.id, orgRoles.CLIENT_ADMIN.id, organization.id);

  let employee = await prisma.employee.findFirst({
    where: { personalEmail: "alex.worker@acme-global.example", organizationId: organization.id },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        firstName: "Alex",
        lastName: "Worker",
        personalEmail: "alex.worker@acme-global.example",
        employmentCountry: "US",
        jobTitle: "Software Engineer",
        department: "Engineering",
        startDate: new Date(),
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
      },
    });
  }

  await prisma.onboardingChecklist.upsert({
    where: { employeeId: employee.id },
    update: {},
    create: {
      employeeId: employee.id,
      items: [
        { key: "personal_information", required: true, status: "VERIFIED" },
        { key: "identity_verification", required: true, status: "VERIFIED" },
      ],
      completedAt: new Date(),
    },
  });

  await prisma.compensation.upsert({
    where: { id: `seed-comp-${employee.id}` },
    update: {},
    create: {
      id: `seed-comp-${employee.id}`,
      employeeId: employee.id,
      amountMinor: BigInt(12000000),
      currency: "USD",
      payFrequency: "MONTHLY",
      effectiveDate: new Date(),
      isCurrent: true,
    },
  });

  const contractor = await prisma.contractor.findFirst({
    where: { email: "jamie.contractor@acme-global.example", organizationId: organization.id },
  });

  if (!contractor) {
    await prisma.contractor.create({
      data: {
        organizationId: organization.id,
        firstName: "Jamie",
        lastName: "Contractor",
        email: "jamie.contractor@acme-global.example",
        country: "US",
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
        classificationScore: 23,
        classificationRisk: "LOW",
      },
    });
  }

  const ptoPolicy = await prisma.leavePolicy.findFirst({
    where: {
      organizationId: organization.id,
      name: "Standard PTO",
      leaveType: "PTO",
    },
  });

  if (!ptoPolicy) {
    await prisma.leavePolicy.create({
      data: {
        organizationId: organization.id,
        name: "Standard PTO",
        leaveType: "PTO",
        accrualRate: 1.5,
        accrualCadence: "MONTHLY",
        requiresApproval: true,
        isActive: true,
      },
    });
  }

  const employmentTemplate = await prisma.contractTemplate.findFirst({
    where: {
      organizationId: organization.id,
      name: "US Employment Agreement",
      version: 1,
    },
  });

  if (!employmentTemplate) {
    await prisma.contractTemplate.create({
      data: {
        organizationId: organization.id,
        name: "US Employment Agreement",
        countryCode: "US",
        type: "EMPLOYMENT",
        version: 1,
        content: "Agreement between {{organization.legalName}} and {{employee.fullName}}.",
        isActive: true,
      },
    });
  }

  await prisma.pricingPlan.upsert({
    where: { name: "Growth" },
    update: {},
    create: {
      name: "Growth",
      description: "Core EOR platform plan",
      baseMonthlyMinor: BigInt(99000),
      perEmployeeMonthlyMinor: BigInt(4900),
      currency: "USD",
      isActive: true,
      features: ["Payroll", "Contracts", "Leave", "Compliance"],
    },
  });

  const usIncomeRule = await prisma.taxRule.findFirst({
    where: {
      countryCode: "US",
      taxType: "INCOME",
      paidBy: "EMPLOYEE",
      calculationType: "FLAT_RATE",
    },
  });

  if (!usIncomeRule) {
    await prisma.taxRule.create({
      data: {
        countryCode: "US",
        taxType: "INCOME",
        paidBy: "EMPLOYEE",
        calculationType: "FLAT_RATE",
        brackets: [{ rate: 0.2 }],
        effectiveDate: new Date("2024-01-01"),
        isActive: true,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Platform Admin: platform.admin@example.com / ChangeMe!123");
  console.log("Client Admin: client.admin@acme-global.example / ChangeMe!123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
