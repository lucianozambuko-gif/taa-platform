import crypto from "node:crypto";

/**
 * PayFast hosted checkout and ITN (Instant Transaction Notification) helpers.
 * Card details are entered on PayFast's page; this app never sees or stores them.
 * Docs: https://developers.payfast.co.za/docs
 */

const HOSTS = {
  sandbox: "https://sandbox.payfast.co.za",
  live: "https://www.payfast.co.za",
} as const;

export function payfastHost() {
  return process.env.PAYFAST_MODE === "live" ? HOSTS.live : HOSTS.sandbox;
}

/** PHP-style urlencode, which PayFast uses for its signature (spaces become "+"). */
function phpUrlEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, "+");
}

/** Builds the signature string from fields in the order given, skipping empty values. */
export function signatureFor(fields: [string, string][], passphrase?: string) {
  const pairs = fields
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${phpUrlEncode(value.trim())}`);
  if (passphrase) pairs.push(`passphrase=${phpUrlEncode(passphrase.trim())}`);
  return crypto.createHash("md5").update(pairs.join("&")).digest("hex");
}

export type CheckoutInput = {
  orderId: string;
  amountCents: number;
  itemName: string;
  itemDescription?: string;
  firstName: string;
  lastName: string;
  email: string;
};

/** Fields to post to PayFast's process URL, in PayFast's required order, plus the signature. */
export function buildCheckoutFields(input: CheckoutInput): [string, string][] {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fields: [string, string][] = [
    ["merchant_id", process.env.PAYFAST_MERCHANT_ID ?? ""],
    ["merchant_key", process.env.PAYFAST_MERCHANT_KEY ?? ""],
    ["return_url", `${site}/checkout/return?order=${input.orderId}`],
    ["cancel_url", `${site}/checkout/return?order=${input.orderId}&cancelled=1`],
    ["notify_url", `${site}/api/payfast/notify`],
    ["name_first", input.firstName],
    ["name_last", input.lastName],
    ["email_address", input.email],
    ["m_payment_id", input.orderId],
    ["amount", (input.amountCents / 100).toFixed(2)],
    ["item_name", input.itemName.slice(0, 100)],
    ["item_description", (input.itemDescription ?? "").slice(0, 255)],
  ];
  const signature = signatureFor(fields, process.env.PAYFAST_PASSPHRASE);
  return [...fields.filter(([, v]) => v !== ""), ["signature", signature]];
}

/** Step 1 of ITN validation: the signature PayFast sent matches the posted fields. */
export function verifyItnSignature(fields: [string, string][]) {
  const sent = fields.find(([k]) => k === "signature")?.[1];
  if (!sent) return false;
  return signatureFor(fields, process.env.PAYFAST_PASSPHRASE) === sent;
}

/** Step 2 of ITN validation: PayFast confirms the notification came from them. */
export async function confirmItnWithPayfast(rawBody: string) {
  const withoutSignature = rawBody
    .split("&")
    .filter((pair) => !pair.startsWith("signature="))
    .join("&");
  const res = await fetch(`${payfastHost()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: withoutSignature,
    cache: "no-store",
  });
  const text = (await res.text()).trim();
  return text === "VALID";
}
