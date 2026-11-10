import { CUSTOM_PUZZLE, SHIPPING } from "./brand";
import type { ShopOrder } from "./orderTypes";

/**
 * Order confirmation sent to the buyer once, right after payment.
 *
 * Needs two env values:
 *   RESEND_API_KEY  (already used for the shop inbox mail)
 *   EMAIL_FROM      e.g. `piece/out <orders@pieceout.shop>`, on a domain verified in Resend.
 * Resend's shared sender (orders@resend.dev) only delivers to the Resend account owner, so
 * without a verified domain this does nothing rather than fail the order.
 */

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function customerEmailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function buildCustomerEmail(order: ShopOrder) {
  const first = (order.name || "").trim().split(/\s+/)[0] || "there";
  const hasCustom = order.items.some((item) => item.productId === CUSTOM_PUZZLE.id);
  const days = hasCustom ? CUSTOM_PUZZLE.days : SHIPPING.days;
  const reply = process.env.ORDER_EMAIL || "";
  const lines = order.items.map((item) => ({
    label: `${item.qty} × ${item.name}${item.withFrame ? " · with frame" : ""}`,
    price: inr(item.unitPrice * item.qty),
  }));
  const where = [order.address, [order.city, order.state].filter(Boolean).join(", "), order.pincode]
    .filter(Boolean)
    .join("\n");
  const track = order.trackingUrl || "";

  const subject = `Order confirmed · ${order.id} · piece/out`;

  const text = [
    `Hi ${first},`,
    "",
    `Thanks for your order. Payment received, and your can${order.items.length > 1 || order.items[0]?.qty > 1 ? "s are" : " is"} being packed.`,
    "",
    `Order ${order.id}`,
    ...lines.map((line) => `${line.label}   ${line.price}`),
    "Delivery   FREE",
    `Paid   ${inr(order.total)}`,
    "",
    `Ships in ${days}${hasCustom ? " (custom puzzles are printed to order)" : ""}.`,
    track ? `Track it: ${track}` : "We'll share tracking as soon as it's with the courier.",
    "",
    "Delivering to:",
    where,
    "",
    reply ? `Anything wrong? Just reply to this email.` : "",
    "",
    "pop the can. peel. hang it.",
    "piece/out",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");

  const rows = lines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0;color:#171411">${esc(line.label)}</td><td style="padding:6px 0;text-align:right;color:#171411">${esc(line.price)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f3ede2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#171411">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
  <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.03em">piece/out</p>
  <div style="margin-top:18px;background:#fffaf3;border-radius:18px;padding:24px">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#e31b23">order confirmed</p>
    <p style="margin:8px 0 0;font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.05">thanks, ${esc(first)}.</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#5e574e">Payment received. We're packing your order now. It ships in <b style="color:#171411">${esc(days)}</b>${hasCustom ? " (custom puzzles are printed to order)" : ""}.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-top:1px solid #e6dfd2;font-size:15px">
      <tr><td colspan="2" style="padding:12px 0 4px;font-size:12px;color:#7a7268">Order ${esc(order.id)}</td></tr>
      ${rows}
      <tr><td style="padding:6px 0;color:#7a7268">Delivery</td><td style="padding:6px 0;text-align:right;font-weight:800">FREE</td></tr>
      <tr><td style="padding:10px 0 0;border-top:1px solid #e6dfd2;font-weight:800">Paid</td><td style="padding:10px 0 0;border-top:1px solid #e6dfd2;text-align:right;font-weight:800">${esc(inr(order.total))}</td></tr>
    </table>
    ${
      track
        ? `<p style="margin:22px 0 0"><a href="${esc(track)}" style="display:inline-block;background:#e31b23;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:13px 22px;border-radius:999px">Track your order</a></p>`
        : `<p style="margin:18px 0 0;font-size:14px;color:#5e574e">We'll share tracking as soon as it's with the courier.</p>`
    }
    <p style="margin:22px 0 0;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#7a7268">delivering to</p>
    <p style="margin:6px 0 0;font-size:14px;line-height:1.5;white-space:pre-line">${esc(order.name)}\n${esc(where)}</p>
  </div>
  <p style="margin:18px 4px 0;font-size:13px;line-height:1.5;color:#7a7268">${reply ? "Something wrong with the order or the address? Just reply to this email." : ""}</p>
  <p style="margin:10px 4px 0;font-size:13px;color:#7a7268">pop the can. peel. hang it.</p>
</div></body></html>`;

  return { subject, text, html, replyTo: reply };
}

/** Returns true when an email was handed to Resend. Never throws for a missing setup. */
export async function emailCustomer(order: ShopOrder): Promise<boolean> {
  const to = (order.email || "").trim();
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (order.status !== "paid" || !looksLikeEmail(to)) return false;
  if (!key || !from) {
    console.warn("customer email skipped: set RESEND_API_KEY and EMAIL_FROM", order.id);
    return false;
  }
  const mail = buildCustomerEmail(order);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // Resend drops a second send with the same key, so retries can never double-mail.
      "Idempotency-Key": `order-confirmed-${order.id}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Customer email failed (${res.status})`);
  return true;
}
