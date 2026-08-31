import { NextResponse } from "next/server";
import { isEmail } from "@/lib/checkout";
import { addWaitlistEmail } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The house could not read that." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body && "email" in body
      ? String((body as { email: unknown }).email).trim().toLowerCase()
      : "";

  if (!isEmail(email)) {
    return NextResponse.json({ error: "That correspondence cannot be used." }, { status: 400 });
  }

  try {
    await addWaitlistEmail(email);
  } catch (error) {
    console.error("waitlist", error);
    return NextResponse.json({ error: "The house could not take the name." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
