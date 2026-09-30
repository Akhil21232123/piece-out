export type PinPlace = {
  pincode: string;
  city: string;
  state: string;
  locality?: string;
  serviceable?: boolean;
  reason?: string;
};

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isPincode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value.trim());
}

export function addressLooksComplete(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 8) return false;
  const withoutPin = text.replace(/\b[1-9]\d{5}\b/g, " ").replace(/\s+/g, " ").trim();
  return withoutPin.split(" ").filter((word) => word.length > 1).length >= 2;
}

export async function lookupPincode(pin: string): Promise<PinPlace | null> {
  if (!isPincode(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { pincode: pin, city: "", state: "" };
    const data = (await res.json()) as Array<{
      Status?: string;
      Message?: string;
      PostOffice?: Array<{
        District?: string;
        State?: string;
        Name?: string;
        Block?: string;
        Division?: string;
      }>;
    }>;
    const row = data[0];
    const offices = row?.PostOffice ?? [];
    const office = offices[0];
    if (row?.Status === "Error" || !office) {
      return {
        pincode: pin,
        city: "",
        state: "",
        serviceable: false,
        reason: "This pincode is not on the India Post list.",
      };
    }
    return {
      pincode: pin,
      city: office.District || office.Block || office.Name || "",
      state: office.State || "",
      locality: office.Name || office.Division || "",
      serviceable: true,
    };
  } catch {
    return { pincode: pin, city: "", state: "" };
  }
}
