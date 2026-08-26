import { cookies } from "next/headers";
import { adminPassword, cookieMatches, inboxEmail, listOrders } from "@/lib/orders";
import { AdminLogin } from "./AdminLogin";
import { AdminOrders } from "./AdminOrders";

export const metadata = {
  title: "Orders — piece/out",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const jar = await cookies();
  const authed = Boolean(adminPassword()) && cookieMatches(jar.get("po_admin")?.value ?? "");

  if (!authed) {
    return <AdminLogin />;
  }

  const orders = await listOrders();
  const inbox = inboxEmail();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#171411]">orders</h1>
      <p className="mt-2 text-sm text-[#7a7268]">
        {orders.length} captured here
        {inbox ? ` · copies sent to ${inbox}` : ""}.
      </p>
      <AdminOrders orders={orders} />
    </main>
  );
}
