import { compareFor, priceFor } from "@/lib/brand";

export const CATEGORIES = [
  { id: "art", label: "Art" },
  { id: "culture", label: "Culture" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "movies", label: "Movies" },
  { id: "more", label: "More" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ShopFilter = "all" | CategoryId;

export type Product = {
  id: string;
  name: string;
  line: string;
  story: string;
  image: string;
  /** Extra photos for the story sheet. Empty until the next drop of shots. */
  shots?: string[];
  width: number;
  height: number;
  category: CategoryId;
  livePuzzle?: boolean;
  /** Photo already has printed jigsaw seams — don't bake another overlay at rest. */
  printedGrid?: boolean;
  fit?: "cover" | "contain";
  soldOut?: boolean;
  priceBare?: number;
  priceFrame?: number;
  compareBare?: number;
  compareFrame?: number;
  variantBare?: string;
  variantFrame?: string;
};

/** Every shop card is the same square so the grid lines up. */
export const CARD_SIZE = 1024;

export const DROP_ID = "po-drop";

export const PRODUCTS: Product[] = [
  {
    id: "po-01",
    name: "Diet Coke",
    line: "Pop art edition.",
    story:
      "You know the can. You know the craving. Now put it back together, one piece at a time.",
    image: "/products/diet-coke-pop.jpg",
    shots: ["/products/diet-coke-can.jpg"],
    width: 1200,
    height: 1200,
    category: "art",
  },
  {
    id: "po-10",
    name: "Caprese Break",
    line: "Lunch, but make it art.",
    story:
      "A pause from the rush of everyday life. A puzzle made for slow lunches, good company, and finding joy in the simplest moments.",
    image: "/products/caprese-break.jpg",
    shots: ["/products/caprese-break-hang.jpg"],
    width: 1024,
    height: 991,
    category: "art",
    soldOut: true,
  },
  {
    id: "po-11",
    name: "Lily Bloom",
    line: "Soft girl. loud print.",
    story:
      "For becoming, blooming, and taking up space in your own beautiful way. A little puzzle reminder that softness can be powerful too.",
    image: "/products/lily-bloom.jpg",
    shots: ["/products/lily-bloom-hang.jpg"],
    width: 1024,
    height: 989,
    category: "art",
  },
  {
    id: "po-12",
    name: "Vino Hours",
    line: "One more glass. then lock in.",
    story:
      "For evenings that deserve to linger a little longer. A puzzle made for good pours, nice wine, slow conversations, and turning an ordinary night into a moment.",
    image: "/products/vino-hours.jpg",
    shots: ["/products/vino-hours-hang.jpg"],
    width: 1024,
    height: 986,
    category: "culture",
  },
  {
    id: "po-13",
    name: "Starboy",
    line: "Max mode. no limits.",
    story:
      "Inspired by a fearless champion and his relentless pursuit of the podium. For those who live for the lights, the speed, and turning every lap into a statement.",
    image: "/products/starboy.jpg",
    width: 1002,
    height: 1024,
    category: "music",
  },
  {
    id: "po-20",
    name: "Billie Blue",
    line: "Hit me hard and soft.",
    story:
      "Blue hour energy. Cap on. Tracklist down. One hour off the algorithm, then hang the album you already feel.",
    image: "/products/billie-blue-pop.jpg",
    width: 1024,
    height: 1024,
    category: "music",
  },
  {
    id: "po-15",
    name: "Cherry Pick",
    line: "Sweet. messy. yours.",
    story:
      "A little sweet, a little cheeky, and made for choosing joy just because you can. For those moments that don't need a reason to feel good.",
    image: "/products/cherry-pick.jpg",
    shots: ["/products/cherry-pick-hang.jpg"],
    width: 1024,
    height: 989,
    category: "art",
    soldOut: true,
  },
  {
    id: "po-17",
    name: "Fuji Garden",
    line: "For calm minds.",
    story:
      "A puzzle for the quiet escape, inspired by Japan's timeless gardens where cherry blossoms, koi ponds, and Mount Fuji come together in one peaceful scene.",
    image: "/products/fuji-garden.jpg",
    width: 1024,
    height: 992,
    category: "art",
    printedGrid: true,
  },
  {
    id: "po-06",
    name: "F1 Speed",
    line: "No limits.",
    story: "No limits. One hour on the grid, then hang the lap.",
    image: "/products/f1-speed.jpg",
    width: 1024,
    height: 989,
    category: "sports",
    soldOut: true,
  },
  {
    id: "po-18",
    name: "Stadium Dreams",
    line: "For late nights.",
    story:
      "For the nights when the whole world feels like a stadium and every dream feels within reach. Inspired by a young star making his mark and playing with something bigger than himself.",
    image: "/products/stadium-dreams.jpg",
    width: 1024,
    height: 992,
    category: "sports",
    printedGrid: true,
  },
  {
    id: "po-19",
    name: "Golden Hour",
    line: "For late nights.",
    story:
      "A tribute to the moments that become unforgettable. Made for celebrating big wins, golden memories, and the legends who make them happen.",
    image: "/products/golden-hour.jpg",
    width: 1024,
    height: 991,
    category: "sports",
    printedGrid: true,
  },
  {
    id: "po-08",
    name: "Fight Club",
    line: "1999 classic.",
    story:
      "Raw, rebellious, and unapologetically chaotic. Puzzle for the fans inspired by the cult classic and its take on breaking rules, finding yourself, and questioning the world around you.",
    image: "/products/fight-club.jpg",
    width: 1024,
    height: 989,
    category: "movies",
  },
  {
    id: "po-09",
    name: "Expensive Shit",
    line: "I like expensive shit.",
    story:
      "For people who like their taste a little extravagant and their choices a little unnecessary. Because if you're going to have a personality, you might as well have expensive taste.",
    image: "/products/expensive-shit.jpg",
    shots: ["/products/expensive-shit-hang.jpg"],
    width: 1024,
    height: 987,
    category: "more",
  },
];

export const MYSTERY: Product = {
  id: DROP_ID,
  name: "Mystery Puzzle",
  line: "Same thrill. different story.",
  story:
    "You never know what you're getting. Every can hides a different puzzle and the fun is in finding out what's inside.",
  image: "/products/mystery.jpg",
  width: 1024,
  height: 987,
  category: "more",
};

export const SHOP: Product[] = [MYSTERY, ...PRODUCTS];

export function filterShop(filter: ShopFilter, list: Product[] = SHOP): Product[] {
  const rows = filter === "all" ? list : list.filter((product) => product.category === filter);
  return [...rows].sort((a, b) => Number(isProductSoldOut(a)) - Number(isProductSoldOut(b)));
}

export function inStockEditions(): Product[] {
  return PRODUCTS.filter((product) => !product.soldOut);
}

export function inStockEditionsFrom(list: Product[]): Product[] {
  return list.filter((product) => product.id !== DROP_ID && !product.soldOut);
}

export function pickRandomEdition(): Product {
  const pool = inStockEditions();
  const product = pool[Math.floor(Math.random() * pool.length)];
  if (!product) {
    throw new Error("Drop catalog is empty.");
  }
  return product;
}

export function isSoldOut(productId: string): boolean {
  if (productId === DROP_ID) return inStockEditions().length === 0;
  return PRODUCTS.some((product) => product.id === productId && product.soldOut);
}

export function isProductSoldOut(product: Product): boolean {
  if (product.id === DROP_ID) {
    if (typeof product.soldOut === "boolean") return product.soldOut;
    return inStockEditions().length === 0;
  }
  return Boolean(product.soldOut) || isSoldOut(product.id);
}

export function productPrice(product: Product, withFrame: boolean): number {
  const n = withFrame ? product.priceFrame : product.priceBare;
  return typeof n === "number" && n > 0 ? Math.round(n) : priceFor(withFrame);
}

export function productCompare(product: Product, withFrame: boolean): number {
  const n = withFrame ? product.compareFrame : product.compareBare;
  return typeof n === "number" && n > 0 ? Math.round(n) : compareFor(withFrame);
}

export function productMerchandiseId(product: Product, withFrame: boolean): string | undefined {
  return (withFrame ? product.variantFrame : product.variantBare) || product.variantBare || product.variantFrame;
}

export const HOW_IT_WORKS = [
  { id: "open", n: "01", title: "peel", note: "pop the lid. no box energy." },
  { id: "build", n: "02", title: "snap", note: "frame clicks. done." },
  { id: "puzzle", n: "03", title: "lock in", note: "150 pieces. one hour." },
  { id: "display", n: "04", title: "flex", note: "hang it. or don't." },
] as const;
