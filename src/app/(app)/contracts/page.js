import { ContractsPanel } from "@/components/panels/contracts-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listContracts, listContractTemplates } from "@/services/contract.service";
import { listEmployees } from "@/services/employee.service";
import { listContractors } from "@/services/contractor.service";

export default async function ContractsPage() {
  const user = await requirePageUser();
  const [contracts, templates, employees, contractors] = await Promise.all([
    listContracts(user, {}),
    listContractTemplates(user),
    listEmployees(user, {}),
    listContractors(user, {}),
  ]);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="text-sm text-zinc-600">Generate templates, send for e-signature, and track lifecycle.</p>
      </header>
      <ContractsPanel
        contracts={contracts}
        templates={templates}
        employees={employees}
        contractors={contractors}
      />
    </section>
  );
}
