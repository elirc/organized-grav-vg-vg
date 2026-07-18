import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/page-auth";

export default async function AuthenticatedLayout({ children }) {
  const user = await requirePageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
