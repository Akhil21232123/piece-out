import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { shipBoard } from "@/lib/shipFlow";
import { AdminLogin } from "../AdminLogin";
import { AdminShip } from "../AdminShip";
import { AdminSignOut } from "../AdminSignOut";
import { AdminTabs } from "../AdminTabs";

export const metadata = { title: "Ship — piece/out", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminShipPage() {
  const jar = await cookies();
  const authed = Boolean(adminPassword()) && cookieMatches(jar.get("po_admin")?.value ?? "");
  if (!authed) return <AdminLogin />;
  const board = await shipBoard();
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#171411]">ship</h1>
        </div>
        <AdminSignOut />
      </div>
      <AdminTabs active="ship" ship={board.toShip.length} />
      <AdminShip initial={board} />
    </main>
  );
}
