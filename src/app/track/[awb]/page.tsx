import Link from "next/link";
import { type TrackInfo, trackWaybills } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your order — piece/out", robots: { index: false, follow: false } };

function when(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Customer-facing tracking. Shows only courier status (no name or address). */
export default async function TrackPage({ params }: { params: Promise<{ awb: string }> }) {
  const { awb: raw } = await params;
  const awb = decodeURIComponent(raw).replace(/[^0-9A-Za-z]/g, "").slice(0, 20);
  const info = awb ? (await trackWaybills([awb]).catch(() => new Map<string, TrackInfo>())).get(awb) : undefined;
  const headline = !info
    ? "label made, waiting for pickup"
    : info.delivered
      ? "delivered"
      : info.returning
        ? "coming back to us"
        : info.pickedUp
          ? "on the way"
          : "packed, waiting for pickup";
  const scans = info?.scans.slice().reverse().slice(0, 12) ?? [];

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-[#efe8dc] px-5 py-14 text-[#171411]">
      <Link href="/" className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</Link>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{headline}.</h1>
      <p className="mt-2 text-sm text-[#7a7268]">Delhivery tracking number {awb}</p>
      <div className="mt-6 rounded-[1.2rem] bg-[#fffaf3] p-5">
        {info ? (
          <>
            <p className="text-lg font-extrabold">{info.status || "Booked"}</p>
            <p className="mt-1 text-sm text-[#7a7268]">{[info.location, when(info.at)].filter(Boolean).join(" · ")}</p>
            {scans.length ? (
              <ol className="mt-5 space-y-3 border-t border-[#171411]/10 pt-4">
                {scans.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-bold">{s.text || "Update"}</span>
                    <span className="block text-xs text-[#7a7268]">{[s.place, when(s.at)].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[#5e574e]">
            Your parcel is packed. Updates show up here as soon as Delhivery scans it, usually within a day.
          </p>
        )}
      </div>
      <p className="mt-6 text-sm text-[#7a7268]">Most parcels arrive 3–5 days after pickup.</p>
    </main>
  );
}
