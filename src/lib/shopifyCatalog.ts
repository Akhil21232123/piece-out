import { CATEGORIES, DROP_ID, MYSTERY, PRODUCTS, type CategoryId, type Product } from "@/data/products";
import { compareFor, priceFor } from "@/lib/brand";
import {
  adminGraphql,
  shopifyAdminConfigured,
  shopifyPublicOrigin,
  shopifyStorefrontConfigured,
  storefrontGraphql,
} from "@/lib/shopify";

export type ShopifyMoney = { amount: string; currencyCode: string };

export type ShopifyVariantNode = {
  id: string;
  title: string;
  availableForSale: boolean;
  sku?: string | null;
  price: ShopifyMoney;
  compareAtPrice?: ShopifyMoney | null;
  selectedOptions: Array<{ name: string; value: string }>;
};

export type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  productType?: string | null;
  tags: string[];
  featuredImage?: { url: string; width?: number; height?: number } | null;
  images: { nodes: Array<{ url: string; width?: number; height?: number }> };
  variants: { nodes: ShopifyVariantNode[] };
};

type ProductsQuery = {
  products: { nodes: ShopifyProductNode[] };
};

const PRODUCTS_QUERY = /* GraphQL */ `
  query PieceoutCatalog {
    products(first: 80, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        description
        availableForSale
        productType
        tags
        featuredImage { url width height }
        images(first: 8) { nodes { url width height } }
        variants(first: 20) {
          nodes {
            id
            title
            availableForSale
            sku
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

type AdminProductsQuery = {
  products: { nodes: Array<{ id: string; handle: string; title: string; tags: string[] }> };
};

const ADMIN_PRODUCTS_QUERY = /* GraphQL */ `
  query PieceoutAdminProducts {
    products(first: 100) {
      nodes { id handle title tags }
    }
  }
`;

type ProductSetPayload = {
  productSet: {
    product?: { id: string; handle: string } | null;
    userErrors: Array<{ field?: string[] | null; message: string }>;
  };
};

const PRODUCT_SET = /* GraphQL */ `
  mutation PieceoutProductSet($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product { id handle }
      userErrors { field message }
    }
  }
`;

let catalogCache: { at: number; shopify: boolean; products: Product[] } | null = null;
let ensureAt = 0;
const CATALOG_TTL = 45_000;
const ENSURE_TTL = 10 * 60_000;

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((item) => item.id));

export function localCatalog(): Product[] {
  return [MYSTERY, ...PRODUCTS];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function money(value?: ShopifyMoney | null): number | undefined {
  if (!value?.amount) return undefined;
  const n = Number(value.amount);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function blobOf(variant: ShopifyVariantNode): string {
  return [variant.title, variant.sku ?? "", ...variant.selectedOptions.map((opt) => `${opt.name} ${opt.value}`)]
    .join(" ")
    .toLowerCase();
}

function isFrameVariant(variant: ShopifyVariantNode): boolean {
  const blob = blobOf(variant);
  if (/\b(no[- ]?frame|without[- ]?frame|bare|puzzle only)\b/.test(blob)) return false;
  return /\b(frame|framed)\b/.test(blob) || /-(frame|framed)$/.test((variant.sku ?? "").toLowerCase());
}

function pickVariants(nodes: ShopifyVariantNode[]): { bare?: ShopifyVariantNode; frame?: ShopifyVariantNode } {
  if (!nodes.length) return {};
  const frame = nodes.find(isFrameVariant);
  const bare = nodes.find((node) => node !== frame && !isFrameVariant(node)) ?? nodes.find((node) => !isFrameVariant(node));
  if (frame && bare) return { bare, frame };
  if (nodes.length >= 2) {
    const ranked = [...nodes].sort((a, b) => (money(a.price) ?? 0) - (money(b.price) ?? 0));
    return { bare: ranked[0], frame: ranked[ranked.length - 1] };
  }
  return { bare: nodes[0], frame: nodes[0] };
}

function categoryOf(node: ShopifyProductNode, local?: Product): CategoryId {
  if (local) return local.category;
  const type = (node.productType ?? "").trim().toLowerCase();
  if (CATEGORY_IDS.has(type)) return type as CategoryId;
  const tag = node.tags.map((item) => item.toLowerCase()).find((item) => CATEGORY_IDS.has(item));
  if (tag) return tag as CategoryId;
  return "more";
}

function localMatch(node: ShopifyProductNode): Product | undefined {
  const handle = slug(node.handle);
  const title = slug(node.title);
  const tags = node.tags.map((tag) => tag.trim().toLowerCase());
  const skus = node.variants.nodes.map((variant) => (variant.sku ?? "").toLowerCase());
  return localCatalog().find((product) => {
    const id = product.id.toLowerCase();
    const name = slug(product.name);
    return (
      tags.includes(id) ||
      handle === id ||
      handle === name ||
      title === name ||
      title === id ||
      skus.some((sku) => sku === id || sku.startsWith(`${id}-`))
    );
  });
}

function mapRemote(node: ShopifyProductNode): Product {
  const local = localMatch(node);
  const { bare, frame } = pickVariants(node.variants.nodes);
  const remoteImage = node.featuredImage?.url ?? node.images.nodes[0]?.url ?? "";
  const remoteShots = node.images.nodes.map((image) => image.url).filter((url) => url && url !== remoteImage);
  const soldOut = Boolean(
    (!bare || !bare.availableForSale) && (!frame || !frame.availableForSale) && !node.availableForSale,
  );
  return {
    id: local?.id ?? (node.handle || node.id),
    name: local?.name ?? node.title,
    line: local?.line ?? (node.productType || "piece/out drop"),
    story: local?.story ?? node.description ?? "",
    image: local?.image ?? remoteImage,
    shots: local?.shots ?? (remoteShots.length ? remoteShots : undefined),
    width: local?.width ?? node.featuredImage?.width ?? 1024,
    height: local?.height ?? node.featuredImage?.height ?? 1024,
    category: categoryOf(node, local),
    livePuzzle: local?.livePuzzle,
    printedGrid: local?.printedGrid,
    fit: local?.fit,
    soldOut: local?.soldOut || soldOut,
    priceBare: money(bare?.price) ?? local?.priceBare,
    priceFrame: money(frame?.price) ?? local?.priceBare ?? money(bare?.price),
    compareBare: money(bare?.compareAtPrice) ?? local?.compareBare,
    compareFrame: money(frame?.compareAtPrice) ?? local?.compareFrame,
    variantBare: bare?.id,
    variantFrame: frame?.id ?? bare?.id,
  };
}

export function mergeCatalog(local: Product[], remote: ShopifyProductNode[]): Product[] {
  const used = new Set<string>();
  const mapped: Product[] = [];
  for (const node of remote) {
    const product = mapRemote(node);
    used.add(product.id);
    mapped.push(product);
  }
  const extras = local.filter((product) => !used.has(product.id));
  const editions = mapped.filter((product) => product.id !== DROP_ID);
  const mystery =
    mapped.find((product) => product.id === DROP_ID) ??
    extras.find((product) => product.id === DROP_ID) ??
    MYSTERY;
  const rest = [...mapped, ...extras].filter((product) => product.id !== DROP_ID);
  return [
    { ...mystery, soldOut: editions.length > 0 ? editions.every((product) => product.soldOut) : mystery.soldOut },
    ...rest,
  ];
}

export async function fetchStorefrontProducts(): Promise<ShopifyProductNode[]> {
  const data = await storefrontGraphql<ProductsQuery>(PRODUCTS_QUERY);
  return data.products.nodes;
}

async function listAdminProducts() {
  const data = await adminGraphql<AdminProductsQuery>(ADMIN_PRODUCTS_QUERY);
  return data.products.nodes;
}

function alreadyThere(
  existing: Array<{ handle: string; title: string; tags: string[] }>,
  product: Product,
): boolean {
  const handle = slug(product.name);
  const title = slug(product.name);
  return existing.some((row) => {
    const tags = row.tags.map((tag) => tag.toLowerCase());
    return tags.includes(product.id.toLowerCase()) || slug(row.handle) === handle || slug(row.title) === title;
  });
}

function publicFile(path: string): string {
  if (path.startsWith("http")) return path;
  return `${shopifyPublicOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function ensureShopifyCatalog(): Promise<{ created: number; skipped: number; errors: string[] }> {
  if (!shopifyAdminConfigured()) {
    return { created: 0, skipped: 0, errors: ["Shopify Admin token is missing."] };
  }
  const existing = await listAdminProducts();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  for (const product of localCatalog()) {
    if (alreadyThere(existing, product)) {
      skipped += 1;
      continue;
    }
    try {
      const data = await adminGraphql<ProductSetPayload>(PRODUCT_SET, {
        input: {
          title: product.name,
          handle: slug(product.name),
          descriptionHtml: `<p>${product.story}</p>`,
          productType: product.category,
          vendor: "piece/out",
          status: "ACTIVE",
          tags: [product.id, product.category, "pieceout"],
          productOptions: [
            {
              name: "Edition",
              values: [{ name: "Puzzle" }, { name: "Framed" }],
            },
          ],
          variants: [
            {
              optionValues: [{ optionName: "Edition", name: "Puzzle" }],
              price: priceFor(false).toFixed(2),
              compareAtPrice: compareFor(false).toFixed(2),
              sku: `${product.id}-bare`,
            },
            {
              optionValues: [{ optionName: "Edition", name: "Framed" }],
              price: priceFor(true).toFixed(2),
              compareAtPrice: compareFor(true).toFixed(2),
              sku: `${product.id}-frame`,
            },
          ],
          files: [
            {
              originalSource: publicFile(product.image),
              contentType: "IMAGE",
              alt: product.name,
            },
          ],
        },
      });
      const fail = data.productSet.userErrors[0];
      if (fail) {
        errors.push(`${product.name}: ${fail.message}`);
        continue;
      }
      created += 1;
    } catch (err) {
      errors.push(`${product.name}: ${err instanceof Error ? err.message : "create failed"}`);
    }
  }
  return { created, skipped, errors };
}

export async function ensureShopifyReady(force = false): Promise<void> {
  if (!shopifyAdminConfigured()) return;
  if (!force && Date.now() - ensureAt < ENSURE_TTL) return;
  const { ensureShopifyWebhooks } = await import("@/lib/shopifyOrders");
  await ensureShopifyCatalog();
  await ensureShopifyWebhooks();
  ensureAt = Date.now();
}

export async function loadCatalog(force = false): Promise<{ shopify: boolean; products: Product[] }> {
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL) {
    return { shopify: catalogCache.shopify, products: catalogCache.products };
  }
  const local = localCatalog();
  if (!shopifyStorefrontConfigured()) {
    catalogCache = { at: Date.now(), shopify: false, products: local };
    return { shopify: false, products: local };
  }
  try {
    const remote = await fetchStorefrontProducts();
    const products = remote.length ? mergeCatalog(local, remote) : local;
    catalogCache = { at: Date.now(), shopify: true, products };
    return { shopify: true, products };
  } catch (err) {
    console.error("shopify catalog", err);
    catalogCache = { at: Date.now(), shopify: true, products: local };
    return { shopify: true, products: local };
  }
}

export function merchandiseIdFor(product: Product, withFrame: boolean): string | undefined {
  return (withFrame ? product.variantFrame : product.variantBare) || product.variantBare || product.variantFrame;
}

export function findCatalogProduct(products: Product[], productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}
