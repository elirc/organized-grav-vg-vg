import { BillingPanel } from "@/components/panels/billing-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listInvoices, listPricingPlans } from "@/services/billing.service";

export default async function BillingPage() {
  const user = await requirePageUser();
  const [plans, invoices] = await Promise.all([listPricingPlans(), listInvoices(user)]);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-zinc-600">Plans, invoice generation, and client billing history.</p>
      </header>
      <BillingPanel plans={plans} invoices={invoices} />
    </section>
  );
}
