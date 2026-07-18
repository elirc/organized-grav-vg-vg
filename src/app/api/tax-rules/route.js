import { withRoute } from "@/lib/api";
import { taxRuleCreateSchema } from "@/lib/validators";
import { createTaxRule, listTaxRules } from "@/services/tax.service";

export const GET = withRoute({ permission: "payroll.view" }, async ({ user, query }) => {
  return listTaxRules(user, query);
});

export const POST = withRoute(
  { permission: "tax_rules.manage", bodySchema: taxRuleCreateSchema },
  async ({ user, body }) => {
    return createTaxRule(user, body);
  },
);
