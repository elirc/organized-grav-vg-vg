"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/contracts", label: "Contracts" },
  { href: "/payroll", label: "Payroll" },
  { href: "/leave", label: "Leave" },
  { href: "/contractors", label: "Contractors" },
  { href: "/billing", label: "Billing" },
  { href: "/reports", label: "Reports" },
  { href: "/notifications", label: "Notifications" },
  { href: "/admin", label: "Admin" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-[var(--accent)] text-white" : "hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
