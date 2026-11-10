import { cookies } from "next/headers";
import { listRestockAlerts } from "@/lib/alerts";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { AdminAlerts } from "../AdminAlerts";
import { AdminLogin } from "../AdminLogin";
import { AdminSignOut } from "../AdminSignOut";
import { AdminTabs } from "../AdminTabs";

export const metadata = {
  title: "Restock pings — piece/out",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPingsPage() {
  const jar = await cookies();
  const authed = Boolean(adminPassword()) && cookieMatches(jar.get("po_admin")?.value ?? "");
  if (!authed) return <AdminLogin />;

  const alerts = await listRestockAlerts();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#171411]">restock pings</h1>
        </div>
        <AdminSignOut />
      </div>
      <AdminTabs active="pings" pings={alerts.length} />
      <AdminAlerts initial={alerts} />
    </main>
  );
}
