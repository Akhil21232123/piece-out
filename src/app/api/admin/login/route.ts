import { NextResponse } from "next/server";
import { adminCookieValue, adminPassword, passwordMatches } from "@/lib/orders";

export async function POST(request: Request) {
  if (!adminPassword()) {
    return NextResponse.json({ error: "Admin password is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = typeof (body as { password?: string }).password === "string"
    ? (body as { password: string }).password
    : "";

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("po_admin", adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
