import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";

export async function isAdminRequest(): Promise<boolean> {
  if (!adminPassword()) return false;
  const jar = await cookies();
  return cookieMatches(jar.get("po_admin")?.value ?? "");
}
