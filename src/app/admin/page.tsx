import { cookies } from "next/headers";
import { listRestockAlerts } from "@/lib/alerts";
import { listInsights } from "@/lib/insights";
import { adminPassword, cookieMatches, durableStoreConfigured, inboxEmail, listOrders } from "@/lib/orders";
import { importShopifyOrders } from "@/lib/shopifyOrders";
import { loadCatalog } from "@/lib/shopifyCatalog";
import {
  shopifyAdminConfigured,
  shopifyStoreDomain,
  shopifyStorefrontConfigured,
  shopifyWebhookSecret,
} from "@/lib/shopify";
import { AdminAlerts } from "./AdminAlerts";
import { AdminInsights } from "./AdminInsights";
import { AdminLogin } from "./AdminLogin";
import { AdminOrders } from "./AdminOrders";
import { AdminShopify } from "./AdminShopify";
import { AdminSignOut } from "./AdminSignOut";

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

  if (shopifyAdminConfigured()) {
    try {
      const { ensureShopifyReady } = await import("@/lib/shopifyCatalog");
      await ensureShopifyReady();
      await importShopifyOrders();
    } catch {
      /* local ledger still renders */
    }
  }

  const [orders, alerts, days, catalog] = await Promise.all([
    listOrders(),
    listRestockAlerts(),
    listInsights(7),
    loadCatalog(),
  ]);
  const inbox = inboxEmail();
  const durableStore = durableStoreConfigured();
  const shopify = {
    storefront: shopifyStorefrontConfigured(),
    admin: shopifyAdminConfigured(),
    webhook: Boolean(shopifyWebhookSecret()),
    domain: shopifyStoreDomain(),
    products: catalog.products.length,
    shopify: catalog.shopify,
  };

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#171411]">orders</h1>
        </div>
        <AdminSignOut />
      </div>
      <p className="mt-2 text-sm text-[#7a7268]">
        Customers pay on Razorpay. Shopify keeps the catalog, stock, and a copy of each paid order.
      </p>
      <AdminInsights initial={days} />
      <AdminShopify initial={shopify} />
      <AdminAlerts initial={alerts} />
      <AdminOrders orders={orders} durableStore={durableStore} inbox={inbox} />
    </main>
  );
}
