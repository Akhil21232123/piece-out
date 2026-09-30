import { SHOP } from "@/data/products";
import { BRAND } from "@/lib/brand";

export const SITE = {
  name: "pieceout",
  legalName: "piece/out",
  tagline: "A premium collection of puzzles you can pop open.",
  url: "https://www.pieceout.shop",
  howUrl: "https://how.pieceout.shop",
  locale: "en_IN",
  country: "IN",
  currency: "INR",
  mark: "/brand/mark.jpg",
  logo: "/brand/mark.jpg",
  poster: "/brand/piece-out-logo.jpg",
  hero: "/products/diet-coke-pop.jpg",
} as const;

export const TITLE =
  "pieceout | Premium Collection Puzzles in a Can — Limited Drops by piece/out";

export const DESCRIPTION =
  "pieceout is a premium collection-based puzzle brand. Each piece/out drop is a limited art collection sealed in a can: 150 interlocking pieces, one hour off the algorithm, then a framed object you hang. Shop from ₹399, or ₹499 framed. Delivery is added at checkout.";

export const KEYWORDS = [
  "pieceout",
  "piece/out",
  "piece out",
  "pieceout puzzles",
  "pieceout shop",
  "premium puzzle brand",
  "premium collection puzzles",
  "collection based puzzles",
  "limited edition puzzles India",
  "puzzles in a can",
  "pop open puzzle",
  "150 piece puzzle",
  "framed puzzle art",
  "designer puzzles",
  "art puzzles India",
  "F1 puzzle",
  "Fight Club puzzle",
  "random puzzle India",
  "mystery puzzle can",
  "adult jigsaw puzzle",
  "gift puzzle India",
  "buy puzzles online India",
  "pieceout.shop",
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return new URL(path, SITE.url).toString();
}

export function productUrl(id: string) {
  return `${SITE.url}/#${id}`;
}

export function jsonLdGraph() {
  const products = SHOP.map((product, index) => ({
    "@type": "Product" as const,
    "@id": `${productUrl(product.id)}#product`,
    name: `${product.name} — pieceout`,
    alternateName: [`pieceout ${product.name}`, `piece/out ${product.name}`],
    description: `${product.story} ${BRAND.pieces} interlocking pieces in a can, designed as premium wall art after one hour of making.`,
    image: [absoluteUrl(product.image), ...(product.shots ?? []).map(absoluteUrl)],
    sku: product.id.toUpperCase(),
    mpn: product.id.toUpperCase(),
    brand: { "@id": `${SITE.url}/#brand` },
    category: "Jigsaw Puzzles",
    material: "paperboard puzzle pieces in a steel can",
    countryOfOrigin: "IN",
    isPartOf: { "@id": `${SITE.url}/#collection` },
    offers: [
      {
        "@type": "Offer",
        url: productUrl(product.id),
        priceCurrency: SITE.currency,
        price: String(BRAND.priceBare),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        name: `${product.name} without frame`,
      },
      {
        "@type": "Offer",
        url: productUrl(product.id),
        priceCurrency: SITE.currency,
        price: String(BRAND.priceFrame),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        name: `${product.name} with frame`,
      },
    ],
    position: index + 1,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "Brand"],
        "@id": `${SITE.url}/#organization`,
        name: SITE.legalName,
        legalName: SITE.legalName,
        alternateName: ["pieceout", "piece out", "Piece Out", "pieceout.shop"],
        url: SITE.url,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(SITE.mark),
          width: 576,
          height: 576,
        },
        image: absoluteUrl(SITE.poster),
        description: DESCRIPTION,
        slogan: SITE.tagline,
        brand: { "@id": `${SITE.url}/#brand` },
        knowsAbout: [
          "premium collection puzzles",
          "limited-drop jigsaw art",
          "puzzles in a can",
          "framed puzzle objects",
        ],
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "Brand",
        "@id": `${SITE.url}/#brand`,
        name: "pieceout",
        alternateName: SITE.legalName,
        url: SITE.url,
        logo: absoluteUrl(SITE.mark),
        slogan: SITE.tagline,
        description:
          "pieceout is a premium collection-based puzzle house. Drops are curated editions, not bulk toys: one can, 150 pieces, a frame, and a finished object.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: "pieceout",
        alternateName: SITE.legalName,
        description: DESCRIPTION,
        inLanguage: "en-IN",
        publisher: { "@id": `${SITE.url}/#organization` },
        isFamilyFriendly: true,
      },
      {
        "@type": "WebPage",
        "@id": `${SITE.url}/#webpage`,
        url: SITE.url,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@id": `${SITE.url}/#website` },
        about: { "@id": `${SITE.url}/#brand` },
        primaryImageOfPage: absoluteUrl(SITE.hero),
        inLanguage: "en-IN",
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE.url}/#collection`,
        url: `${SITE.url}/#shop`,
        name: "pieceout Collection Drop 01",
        description:
          "The current pieceout drop, filtered by art, culture, music, sports, movies, and more: limited pictorial puzzles as premium can-and-frame objects, plus a mystery puzzle packed as a random edition.",
        isPartOf: { "@id": `${SITE.url}/#website` },
        about: { "@id": `${SITE.url}/#brand` },
        numberOfItems: SHOP.length,
        mainEntity: { "@id": `${SITE.url}/#itemlist` },
      },
      {
        "@type": "ItemList",
        "@id": `${SITE.url}/#itemlist`,
        name: "pieceout premium puzzle collection",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: SHOP.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: productUrl(SHOP[index]?.id ?? "po-drop"),
          item: product,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE.url}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is pieceout?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "pieceout (styled piece/out) is a premium collection-based puzzle brand. Each drop is a curated edition: a 150-piece pictorial puzzle sealed in a can, made to peel open, lock in for about an hour, and hang as framed art.",
            },
          },
          {
            "@type": "Question",
            name: "Is pieceout a toy puzzle or a collection object?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "pieceout is collection-first. The can is packaging and ritual, the pieces are the making, and the finished board is a designed object for a wall or shelf — not a disposable kids' puzzle.",
            },
          },
          {
            "@type": "Question",
            name: "How many pieces are in a pieceout puzzle?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Every current collection edition has ${BRAND.pieces} interlocking pieces, sized for about one hour of focused making.`,
            },
          },
          {
            "@type": "Question",
            name: "Can I choose which pieceout puzzle I get?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Pick a named edition, or buy the mystery puzzle and we pack a random edition from the current drop.",
            },
          },
          {
            "@type": "Question",
            name: "How much does a pieceout puzzle cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Collection editions are ₹${BRAND.priceBare} without a frame and ₹${BRAND.priceFrame} with a frame. Delhivery delivery is added at checkout.`,
            },
          },
        ],
      },
    ],
  };
}
