import { DROP_ID, inStockEditionsFrom, type Product } from "@/data/products";
import { findCatalogProduct, loadCatalog, merchandiseIdFor } from "@/lib/shopifyCatalog";
import { storefrontGraphql } from "@/lib/shopify";

export type CheckoutItem = {
  productId: string;
  withFrame: boolean;
  qty: number;
  merchandiseId?: string;
};

type CartCreatePayload = {
  cartCreate: {
    cart?: { id: string; checkoutUrl: string } | null;
    userErrors: Array<{ field?: string[] | null; message: string }>;
  };
};

const CART_CREATE = /* GraphQL */ `
  mutation PieceoutCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

function pickMystery(products: Product[]): Product {
  const pool = inStockEditionsFrom(products);
  const product = pool[Math.floor(Math.random() * pool.length)];
  if (!product) {
    throw new Error("Mystery Puzzle is sold out.");
  }
  return product;
}

export function resolveMerchandiseId(
  products: Product[],
  item: CheckoutItem,
): { merchandiseId: string; product: Product } {
  if (item.merchandiseId) {
    const product = findCatalogProduct(products, item.productId) ?? products[0];
    return { merchandiseId: item.merchandiseId, product };
  }
  const product =
    item.productId === DROP_ID ? pickMystery(products) : findCatalogProduct(products, item.productId);
  if (!product) {
    throw new Error("A bag item is no longer in the shop.");
  }
  if (product.soldOut) {
    throw new Error(`${product.name} is sold out.`);
  }
  const merchandiseId = merchandiseIdFor(product, item.withFrame);
  if (!merchandiseId) {
    throw new Error(`${product.name} is not in Shopify yet. Sync the catalog, then try again.`);
  }
  return { merchandiseId, product };
}

export async function createShopifyCheckout(
  items: CheckoutItem[],
  request?: Request,
  buyer?: { email?: string; phone?: string },
): Promise<{ checkoutUrl: string; cartId: string }> {
  const { products } = await loadCatalog();
  const lines = items.flatMap((item) => {
    const qty = Math.min(9, Math.max(1, Math.floor(item.qty)));
    if (item.productId === DROP_ID) {
      return Array.from({ length: qty }, () => {
        const resolved = resolveMerchandiseId(products, { ...item, qty: 1, merchandiseId: undefined });
        return { merchandiseId: resolved.merchandiseId, quantity: 1 };
      });
    }
    const resolved = resolveMerchandiseId(products, item);
    return [{ merchandiseId: resolved.merchandiseId, quantity: qty }];
  });
  if (!lines.length) {
    throw new Error("Bag is empty.");
  }

  const data = await storefrontGraphql<CartCreatePayload>(
    CART_CREATE,
    {
      input: {
        lines,
        buyerIdentity: {
          countryCode: "IN",
          ...(buyer?.email ? { email: buyer.email } : {}),
          ...(buyer?.phone ? { phone: buyer.phone } : {}),
        },
        attributes: [{ key: "source", value: "pieceout.shop" }],
      },
    },
    request,
  );
  const fail = data.cartCreate.userErrors[0];
  if (fail) {
    throw new Error(fail.message);
  }
  const cart = data.cartCreate.cart;
  if (!cart?.checkoutUrl) {
    throw new Error("Shopify did not return a checkout URL.");
  }
  return { checkoutUrl: cart.checkoutUrl, cartId: cart.id };
}
