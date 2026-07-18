import { withRoute } from "@/lib/api";
import { taxRuleUpdateSchema } from "@/lib/validators";
import { updateTaxRule } from "@/services/tax.service";

export const PATCH = withRoute(
  { permission: "tax_rules.manage", bodySchema: taxRuleUpdateSchema },
  async ({ user, params, body }) => {
    return updateTaxRule(user, params.id, body);
  },
);
