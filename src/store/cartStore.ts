"use client";

import { create } from "zustand";
import { gstOn, priceFor } from "@/lib/brand";

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  image: string;
  line: string;
  withFrame: boolean;
  unitPrice: number;
  qty: number;
  merchandiseId?: string;
};

type AddPayload = {
  productId: string;
  name: string;
  image: string;
  line: string;
  withFrame: boolean;
  unitPrice?: number;
  merchandiseId?: string;
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
      const unitPrice = item.unitPrice ?? priceFor(item.withFrame);
      const existing = state.lines.find((line) => line.id === id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.id === id
              ? {
                  ...line,
                  qty: Math.min(9, line.qty + 1),
                  unitPrice,
                  merchandiseId: item.merchandiseId ?? line.merchandiseId,
                }
              : line,
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
            merchandiseId: item.merchandiseId,
          },
        ],
      };
    }),
  inc: (id) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.id === id ? { ...line, qty: Math.min(9, line.qty + 1) } : line,
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

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

export function cartGst(lines: CartLine[]): number {
  return gstOn(cartSubtotal(lines));
}

export function cartTotal(lines: CartLine[]): number {
  return cartSubtotal(lines);
}
