import { ContractorsPanel } from "@/components/panels/contractors-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listContractors } from "@/services/contractor.service";

export default async function ContractorsPage() {
  const user = await requirePageUser();
  const contractors = await listContractors(user);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Contractors</h1>
        <p className="text-sm text-zinc-600">
          Maintain contractor profiles and convert flagged contractors to employees.
        </p>
      </header>
      <ContractorsPanel contractors={contractors} />
    </section>
  );
}
