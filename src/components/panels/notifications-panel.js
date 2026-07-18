"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NotificationsPanel({ notifications }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const markRead = (id) => {
    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error?.message || "Failed to mark notification as read");
        return;
      }
      router.refresh();
    });
  };

  const markAll = () => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error?.message || "Failed to mark notifications as read");
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Notification Center</h2>
          <button disabled={pending} onClick={markAll} className="button-secondary text-sm" type="button">
            Mark All Read
          </button>
        </div>
        {error ? <p className="danger mt-2 text-sm">{error}</p> : null}
        <div className="mt-3 space-y-2">
          {notifications.map((item) => (
            <div className="panel bg-white p-3" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-700">{item.body}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(item.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag">{item.category}</span>
                  {!item.isRead ? (
                    <button
                      className="button-secondary text-xs"
                      onClick={() => markRead(item.id)}
                      type="button"
                      disabled={pending}
                    >
                      Mark Read
                    </button>
                  ) : (
                    <span className="tag">Read</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
