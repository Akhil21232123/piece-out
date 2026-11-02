"use client";

import { create } from "zustand";

const KEY = "po-puzzle-reward";

type RewardState = {
  /** True once the visitor has solved the /play puzzle and not yet used the reward. */
  unlocked: boolean;
  unlock: () => void;
  /** Called after a paid order: the reward is one order only. */
  consume: () => void;
  /** Read the saved reward from this browser (safe to call repeatedly). */
  hydrate: () => void;
};

export const useRewardStore = create<RewardState>((set) => ({
  unlocked: false,
  unlock: () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked: reward still lives for this visit */
    }
    set({ unlocked: true });
  },
  consume: () => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ unlocked: false });
  },
  hydrate: () => {
    try {
      if (window.localStorage.getItem(KEY) === "1") set({ unlocked: true });
    } catch {
      /* ignore */
    }
  },
}));
