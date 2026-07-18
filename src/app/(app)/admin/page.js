import { AdminPanel } from "@/components/panels/admin-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listTaxRules } from "@/services/tax.service";
import { listContractTemplates } from "@/services/contract.service";
import { listOrganizations } from "@/services/org.service";

export default async function AdminPage() {
  const user = await requirePageUser();
  const [taxRules, templates, organizations] = await Promise.all([
    listTaxRules(user),
    listContractTemplates(user),
    listOrganizations(user),
  ]);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-600">Platform controls for tax rules, templates, and tenants.</p>
      </header>
      <AdminPanel taxRules={taxRules} templates={templates} organizations={organizations} />
    </section>
  );
}
