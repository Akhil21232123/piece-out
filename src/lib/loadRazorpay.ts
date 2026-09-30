export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type PayVia = "gpay" | "phonepe" | "paytm" | "bhim" | "card";

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string; method?: "upi" | "card" | "netbanking" };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  config?: {
    display?: {
      blocks?: Record<string, { name: string; instruments: { method: string }[] }>;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
  handler: (response: RazorpaySuccess) => void;
};

type RazorpayFailure = { error?: { description?: string; reason?: string } };

type CreatePaymentData = {
  amount: number;
  currency: string;
  email: string;
  contact: string;
  order_id: string;
  method: "upi";
  upi: { flow: "intent" };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed" | "payment.error" | "payment.success",
    fn: (response: RazorpayFailure & Partial<RazorpaySuccess>) => void,
  ) => void;
  createPayment?: (data: CreatePaymentData, extras?: Record<string, boolean>) => void;
};

type RazorpayCtor = new (options: RazorpayCheckoutOptions | { key: string }) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const ready = () => resolve(Boolean(window.Razorpay));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", ready, { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      if (window.Razorpay) ready();
      return;
    }
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = ready;
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function extrasFor(via: PayVia): Record<string, boolean> | undefined {
  if (via === "gpay") return { gpay: true };
  if (via === "phonepe") return { phonepe: true };
  if (via === "paytm") return { paytm: true };
  return undefined;
}

export function openRazorpayCheckout(params: {
  options: RazorpayCheckoutOptions;
  via: PayVia;
  onFail: (message: string) => void;
}) {
  if (!window.Razorpay) throw new Error("Razorpay is not loaded.");
  const { options, via, onFail } = params;
  const fail = (response: RazorpayFailure) => {
    onFail(response.error?.description || response.error?.reason || "Payment failed.");
  };
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (via !== "card" && mobile) {
    const custom = new window.Razorpay({ key: options.key });
    if (typeof custom.createPayment === "function") {
      let handedOff = false;
      let failed = false;
      custom.on("payment.success", (response) => {
        if (response.razorpay_order_id && response.razorpay_payment_id && response.razorpay_signature) {
          options.handler({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        }
      });
      custom.on("payment.error", (response) => {
        failed = true;
        fail(response);
      });
      const onHide = () => {
        if (document.hidden) handedOff = true;
      };
      document.addEventListener("visibilitychange", onHide);
      try {
        custom.createPayment(
          {
            amount: options.amount,
            currency: options.currency,
            email: options.prefill?.email ?? "",
            contact: options.prefill?.contact ?? "",
            order_id: options.order_id,
            method: "upi",
            upi: { flow: "intent" },
          },
          extrasFor(via),
        );
        window.setTimeout(() => {
          document.removeEventListener("visibilitychange", onHide);
          if (failed || handedOff || document.hidden || !window.Razorpay) return;
          if (document.querySelector("iframe[src*='razorpay'], .razorpay-container")) return;
          const checkout = new window.Razorpay(options);
          checkout.on("payment.failed", fail);
          checkout.open();
        }, 700);
        return;
      } catch {
        document.removeEventListener("visibilitychange", onHide);
      }
    }
  }

  const checkout = new window.Razorpay(options);
  checkout.on("payment.failed", fail);
  checkout.open();
}

export function upiOnlyConfig(): RazorpayCheckoutOptions["config"] {
  return {
    display: {
      blocks: {
        upi: {
          name: "Pay with UPI",
          instruments: [{ method: "upi" }],
        },
      },
      sequence: ["block.upi"],
      preferences: { show_default_blocks: false },
    },
  };
}
