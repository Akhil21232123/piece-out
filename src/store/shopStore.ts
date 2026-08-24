import { create } from "zustand";
import { makeOrderId } from "@/lib/brand";

export type CheckoutStep = "details" | "pay";

export interface ShopState {
  withFrame: boolean;
  checkoutOpen: boolean;
  checkoutStep: CheckoutStep;
  orderId: string | null;
  setWithFrame: (withFrame: boolean) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  goToPay: () => void;
}

export const useShopStore = create<ShopState>((set) => ({
  withFrame: true,
  checkoutOpen: false,
  checkoutStep: "details",
  orderId: null,
  setWithFrame: (withFrame) => set({ withFrame }),
  openCheckout: () =>
    set({
      checkoutOpen: true,
      checkoutStep: "details",
      orderId: makeOrderId(),
    }),
  closeCheckout: () => set({ checkoutOpen: false, checkoutStep: "details" }),
  goToPay: () => set({ checkoutStep: "pay" }),
}));
