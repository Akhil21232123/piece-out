import { compareFor, priceFor } from "@/lib/brand";

export const CATEGORIES = [
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
  /** Shows the NEW tag on the shop card. Remove once the drop is no longer new. */
  isNew?: boolean;
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
    id: "po-21",
    name: "Disco Cheetah",
    line: "Danced all night. napping all day.",
    story:
      "For the one who's last off the dance floor and first asleep in the cab home. A wild cat, a pink bed, a disco ball still spinning above her. Proof you can be fierce and still need a nap, because rest is part of the party.",
    image: "/products/disco-cheetah.jpg",
    width: 1024,
    height: 1024,
    category: "more",
    isNew: true,
  },
  {
    id: "po-22",
    name: "Tokyo Summer",
    line: "Anime street edition.",
    story:
      "Remember summers that felt endless? A quiet street, a cold drink from the vending machine, nowhere you had to be. For everyone who grew up wishing they could step inside an anime frame. Spend an hour on that street, then keep it on your wall.",
    image: "/products/tokyo-summer.jpg",
    width: 1024,
    height: 1024,
    category: "more",
    isNew: true,
  },
  {
    id: "po-23",
    name: "City Views",
    line: "New York, after the rain.",
    story:
      "For the dreamer with a city on their vision board. Wet streets, yellow cabs and a skyline that keeps telling you to aim higher. Piece it together now and hang it up, until the day you're standing on that corner yourself.",
    image: "/products/city-views.jpg",
    width: 1024,
    height: 1024,
    category: "more",
    isNew: true,
  },
  {
    id: "po-24",
    name: "Dirty Martini",
    line: "Shaken. stirred. pieced.",
    story:
      "Two glasses, a roll of the dice, and a night that hasn't decided what it wants to be yet. For the friends who make plans over drinks and memories by accident. Pour one, pick a piece, and let the evening take its time.",
    image: "/products/dirty-martini.jpg",
    width: 1024,
    height: 1024,
    category: "more",
    isNew: true,
  },
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
    category: "more",
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
    category: "more",
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
    category: "more",
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
    category: "more",
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
  {
    id: "po-25",
    name: "Virat Kohli",
    line: "The king still rises.",
    story:
      "For every fan who has held their breath when he walks out to bat. Years of impossible chases, of never giving up on a game everyone else had written off. If he taught you that discipline builds greatness, build him one piece at a time, then give him the wall he deserves.",
    image: "/products/virat-kohli.jpg",
    width: 1024,
    height: 1002,
    category: "sports",
    isNew: true,
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
    category: "sports",
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
    category: "more",
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
    category: "more",
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
    id: "po-26",
    name: "Spider-Man",
    line: "Your friendly neighbourhood puzzle.",
    story:
      "For the kid who swung from the sofa in a homemade mask, and the grown-up who still believes ordinary people can be heroes. Crouched, ready, keeping watch over your room. Some heroes don't need a cape, just one hour of your time.",
    image: "/products/spider-man.jpg",
    width: 1024,
    height: 1024,
    category: "movies",
    isNew: true,
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
    id: "po-20",
    name: "Billie Blue",
    line: "Hit me hard and soft.",
    story:
      "Blue hour energy. Cap on. Tracklist down. One hour off the algorithm, then hang the album you already feel.",
    image: "/products/billie-blue-pop.jpg",
    width: 1024,
    height: 1024,
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
