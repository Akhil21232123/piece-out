export type Product = {
  id: string;
  name: string;
  line: string;
  image: string;
  width: number;
  height: number;
  livePuzzle?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: "po-10",
    name: "caprese break",
    line: "lunch, but make it art.",
    image: "/products/caprese-break.jpg",
    width: 1024,
    height: 991,
  },
  {
    id: "po-11",
    name: "lily bloom",
    line: "soft girl. loud print.",
    image: "/products/lily-bloom.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-12",
    name: "vino hours",
    line: "one more glass. then lock in.",
    image: "/products/vino-hours.jpg",
    width: 1024,
    height: 986,
  },
  {
    id: "po-13",
    name: "starboy",
    line: "max mode. no limits.",
    image: "/products/starboy.jpg",
    width: 1002,
    height: 1024,
  },
  {
    id: "po-14",
    name: "desi refresh",
    line: "jugaad, but pretty.",
    image: "/products/desi-refresh.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-15",
    name: "cherry pick",
    line: "sweet. messy. yours.",
    image: "/products/cherry-pick.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-16",
    name: "make love",
    line: "make art. make out. make money.",
    image: "/products/make-love.jpg",
    width: 1024,
    height: 819,
  },
  {
    id: "po-01",
    name: "diet coke",
    line: "your hour starts now.",
    image: "/products/diet-coke.jpg",
    width: 1024,
    height: 990,
    livePuzzle: false,
  },
  {
    id: "po-02",
    name: "dream mode",
    line: "small steps. big dreams.",
    image: "/products/dream-mode.jpg",
    width: 1024,
    height: 987,
  },
  {
    id: "po-03",
    name: "lock in",
    line: "discipline today. freedom tomorrow.",
    image: "/products/lock-in.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-04",
    name: "good things",
    line: "trust the process.",
    image: "/products/good-things.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-05",
    name: "starry night",
    line: "stare at the sky later.",
    image: "/products/starry-night.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-06",
    name: "f1 speed",
    line: "no limits.",
    image: "/products/f1-speed.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-07",
    name: "stay real",
    line: "not for them. stay real.",
    image: "/products/stay-real.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-08",
    name: "fight club",
    line: "1999 classic.",
    image: "/products/fight-club.jpg",
    width: 1024,
    height: 989,
  },
  {
    id: "po-09",
    name: "expensive shit",
    line: "i like expensive shit.",
    image: "/products/expensive-shit.jpg",
    width: 1024,
    height: 987,
  },
];

export const HOW_IT_WORKS = [
  { id: "open", n: "01", title: "peel", note: "pop the lid. no box energy." },
  { id: "build", n: "02", title: "snap", note: "frame clicks. done." },
  { id: "puzzle", n: "03", title: "lock in", note: "120 pieces. one hour." },
  { id: "display", n: "04", title: "flex", note: "hang it. or don't." },
] as const;
