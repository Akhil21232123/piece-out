import { createHmac, timingSafeEqual } from "crypto";
import { SITE } from "@/lib/seo";

export const SHOPIFY_API = "2025-07";

export function shopifyStoreDomain(): string {
  return (process.env.SHOPIFY_STORE_DOMAIN ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

export function storefrontToken(): string {
  return (
    process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim() ||
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() ||
    ""
  );
}

export function adminToken(): string {
  return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() ?? "";
}

export function shopifyClientId(): string {
  return process.env.SHOPIFY_CLIENT_ID?.trim() ?? "";
}

export function shopifyClientSecret(): string {
  return process.env.SHOPIFY_CLIENT_SECRET?.trim() ?? "";
}

export function shopifyWebhookSecret(): string {
  return (
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
    shopifyClientSecret()
  );
}

type CachedAdmin = { token: string; exp: number };
let cachedAdmin: CachedAdmin | null = null;

export async function resolveAdminToken(): Promise<string> {
  const staticTok = adminToken();
  if (staticTok) return staticTok;

  const id = shopifyClientId();
  const secret = shopifyClientSecret();
  const domain = shopifyStoreDomain();
  if (!id || !secret || !domain) return "";

  if (cachedAdmin && Date.now() < cachedAdmin.exp - 60_000) {
    return cachedAdmin.token;
  }

  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Shopify auth ${res.status}`);
  }
  cachedAdmin = {
    token: payload.access_token,
    exp: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return cachedAdmin.token;
}

export function shopifyStorefrontConfigured(): boolean {
  return Boolean(shopifyStoreDomain() && storefrontToken());
}

export function shopifyAdminConfigured(): boolean {
  return Boolean(
    shopifyStoreDomain() &&
      (adminToken() || (shopifyClientId() && shopifyClientSecret())),
  );
}

export function shopifyPublicOrigin(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return SITE.url;
}

function storefrontUrl(): string {
  return `https://${shopifyStoreDomain()}/api/${SHOPIFY_API}/graphql.json`;
}

function adminGraphqlUrl(): string {
  return `https://${shopifyStoreDomain()}/admin/api/${SHOPIFY_API}/graphql.json`;
}

function adminRestUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `https://${shopifyStoreDomain()}/admin/api/${SHOPIFY_API}${clean}`;
}

export function buyerIp(request?: Request): string {
  if (!request) return "";
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return (forwarded.split(",")[0] ?? "").trim() || request.headers.get("x-real-ip")?.trim() || "";
}

type GraphqlPayload<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function readGraphql<T>(res: Response): Promise<T> {
  const payload = (await res.json()) as GraphqlPayload<T>;
  if (!res.ok) {
    throw new Error(payload.errors?.[0]?.message || `Shopify ${res.status}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((err) => err.message).filter(Boolean).join("; ") || "Shopify GraphQL error");
  }
  if (!payload.data) {
    throw new Error("Shopify returned no data.");
  }
  return payload.data;
}

export async function storefrontGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  request?: Request,
): Promise<T> {
  if (!shopifyStorefrontConfigured()) {
    throw new Error("Shopify Storefront is not configured.");
  }
  const ip = buyerIp(request);
  const res = await fetch(storefrontUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken(),
      ...(ip ? { "Shopify-Storefront-Buyer-IP": ip } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  return readGraphql<T>(res);
}

export async function adminGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!shopifyAdminConfigured()) {
    throw new Error("Shopify Admin is not configured.");
  }
  const token = await resolveAdminToken();
  const res = await fetch(adminGraphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  return readGraphql<T>(res);
}

export async function adminRest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!shopifyAdminConfigured()) {
    throw new Error("Shopify Admin is not configured.");
  }
  const token = await resolveAdminToken();
  const res = await fetch(adminRestUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => ({}))) as T & { errors?: unknown };
  if (!res.ok) {
    const message =
      typeof payload.errors === "string"
        ? payload.errors
        : payload.errors
          ? JSON.stringify(payload.errors)
          : `Shopify Admin ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

export function verifyShopifyWebhook(raw: string, hmacHeader: string): boolean {
  const secret = shopifyWebhookSecret();
  if (!secret || !hmacHeader) return false;
  const digest = createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
