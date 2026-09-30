export interface Puzzle {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  blurb: string;
  pieceCount: number;
  art: string;
}

export const PUZZLES: readonly Puzzle[] = [
  {
    id: "po-01",
    name: "Diet Coke",
    subtitle: "pop art edition",
    slug: "diet-coke-pop-art",
    blurb: "150 pieces. one hour. hang it or stand it.",
    pieceCount: 150,
    art: "/products/diet-coke-puzzle.jpg",
  },
] as const;

export function getPuzzle(index: number): Puzzle {
  const i = ((index % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return PUZZLES[i];
}
