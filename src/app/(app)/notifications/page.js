import { NotificationsPanel } from "@/components/panels/notifications-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listNotifications } from "@/services/notification.service";

export default async function NotificationsPage() {
  const user = await requirePageUser();
  const notifications = await listNotifications(user);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-zinc-600">Event feed for payroll, onboarding, leave, and billing.</p>
      </header>
      <NotificationsPanel notifications={notifications} />
    </section>
  );
}
