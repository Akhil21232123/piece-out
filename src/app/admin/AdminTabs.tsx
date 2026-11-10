import Link from "next/link";

type Tab = "orders" | "pings";

/** Tab bar shared by /admin (orders) and /admin/pings (restock pings). */
export function AdminTabs({ active, pings }: { active: Tab; pings?: number }) {
  const tabs: { id: Tab; href: string; label: string; badge?: number }[] = [
    { id: "orders", href: "/admin", label: "Orders" },
    { id: "pings", href: "/admin/pings", label: "Restock pings", badge: pings },
  ];
  return (
    <nav aria-label="Admin sections" className="mt-6 flex gap-2">
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
              on
                ? "bg-[#171411] text-[#fffaf3]"
                : "border border-[#171411]/16 bg-[#fffaf3] text-[#171411] hover:border-[#171411]/40"
            }`}
          >
            {tab.label}
            {tab.badge ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  on ? "bg-[#f5c400] text-[#171411]" : "bg-[#e31b23] text-white"
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
