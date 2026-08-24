"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { getPuzzle, PUZZLES } from "@/data/puzzles";
import { loadPuzzleArt, prefetchPuzzleArt } from "@/lib/textures";

export function usePuzzleMaps(index: number) {
  const puzzle = getPuzzle(index);
  const [art, setArt] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPuzzleArt(puzzle.art)
      .then((map) => {
        if (!cancelled) setArt(map);
      })
      .catch(() => {
        if (!cancelled) setArt(null);
      });

    if (PUZZLES.length > 1) {
      prefetchPuzzleArt(getPuzzle(index + 1).art);
      prefetchPuzzleArt(getPuzzle(index - 1).art);
    }
    return () => {
      cancelled = true;
    };
  }, [index, puzzle.art]);

  return { art, puzzle };
}

export function prefetchHeroSet() {
  PUZZLES.slice(0, 3).forEach((p) => prefetchPuzzleArt(p.art));
}
