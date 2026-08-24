"use client";

import { create } from "zustand";
import { priceFor } from "@/lib/brand";

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  image: string;
  line: string;
  withFrame: boolean;
  unitPrice: number;
  qty: number;
};

type AddPayload = {
  productId: string;
  name: string;
  image: string;
  line: string;
  withFrame: boolean;
};

type CartState = {
  lines: CartLine[];
  add: (item: AddPayload) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  add: (item) =>
    set((state) => {
      const id = `${item.productId}-${item.withFrame ? "frame" : "bare"}`;
      const unitPrice = priceFor(item.withFrame);
      const existing = state.lines.find((line) => line.id === id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.id === id ? { ...line, qty: line.qty + 1 } : line,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            id,
            productId: item.productId,
            name: item.name,
            image: item.image,
            line: item.line,
            withFrame: item.withFrame,
            unitPrice,
            qty: 1,
          },
        ],
      };
    }),
  inc: (id) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.id === id ? { ...line, qty: line.qty + 1 } : line,
      ),
    })),
  dec: (id) =>
    set((state) => ({
      lines: state.lines
        .map((line) => (line.id === id ? { ...line, qty: line.qty - 1 } : line))
        .filter((line) => line.qty > 0),
    })),
  clear: () => set({ lines: [] }),
}));

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}
