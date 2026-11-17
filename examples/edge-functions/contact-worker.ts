/**
 * Reference contact endpoint — a Cloudflare Worker route, not a Supabase function.
 *
 * Mail leaves through the `SEND_EMAIL` binding (Cloudflare Email Sending), and
 * that binding exists only in the Worker. The split is deliberate:
 *
 *   browser → Worker route (this file) → Supabase REST (store) + SEND_EMAIL (deliver)
 *
 * The message is stored before it is sent, so a provider that accepts and then
 * drops the mail leaves a row the owner can still read. `200` means "stored and
 * accepted by the provider"; `502` means "stored, not sent".
 *
 * Contract and verification steps: `references/contact-form.md`.
 * Adapt the constants at the top; keep the ordering — challenge before storage,
 * storage before send.
 */

export interface ContactEnv {
  /** Supabase REST origin, e.g. https://<ref>.supabase.co */
  SUPABASE_URL: string;
  /** Service-role key. Server-side only; never shipped to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Exposed to the browser bundle; used with the Siteverify call. */
  TURNSTILE_SECRET: string;
  /** Email Sending binding: `[[send_email]]` in wrangler.jsonc. */
  SEND_EMAIL: {
    send: (message: {
      to: string;
      from: string;
      subject: string;
      text: string;
      replyTo?: string;
    }) => Promise<{ success: boolean; error?: string }>;
  };
  /** Recipient the owner controls; the visitor never picks it. */
  CONTACT_TO: string;
  /** Sender on the onboarded sending subdomain. */
  CONTACT_FROM: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  turnstileToken: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 120, email: 254, phone: 40, subject: 100, message: 5000 } as const;
const RATE_LIMIT = { max: 5, windowMinutes: 10 } as const;

// Domains that never receive mail; reject them instead of bouncing.
const DISPOSABLE: Record<string, true> = {
  "mailinator.com": true,
  "tempmail.com": true,
  "10minutemail.com": true,
  "guerrillamail.com": true,
  "yopmail.com": true,
  "trashmail.com": true,
};

function json(status: number, body: unknown, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Rejects anything that is not a sane, deliverable address. */
export function validate(payload: Partial<ContactPayload>): string[] {
  const problems: string[] = [];
  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const phone = (payload.phone ?? "").trim();
  const subject = (payload.subject ?? "").trim();
  const message = (payload.message ?? "").trim();

  if (!name || name.length > LIMITS.name) problems.push("name");
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) problems.push("email");
  if (phone.length > LIMITS.phone) problems.push("phone");
  if (!subject || subject.length > LIMITS.subject) problems.push("subject");
  if (!message || message.length > LIMITS.message) problems.push("message");
  if (/<[a-z/][^>]*>/i.test(message)) problems.push("message");
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE[domain] === true) problems.push("email");
  return [...new Set(problems)];
}

async function verifyTurnstile(env: ContactEnv, token: string, ip: string | null): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) {
      console.warn("contact: turnstile refused", result["error-codes"]?.join(",") ?? "no codes");
    }
    return result.success === true;
  } catch (error) {
    // Fail closed: an unreachable challenge service is a rejection, not a pass.
    console.error("contact: turnstile unreachable", error instanceof Error ? error.message : error);
    return false;
  }
}

async function withinRateLimit(env: ContactEnv, key: string, now: Date): Promise<boolean> {
  const windowStart = new Date(now.getTime() - RATE_LIMIT.windowMinutes * 60_000).toISOString();
  const url = new URL("/rest/v1/rpc/check_contact_rate_limit", env.SUPABASE_URL);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_key: key, p_window_start: windowStart, p_max: RATE_LIMIT.max }),
    });
    if (!response.ok) {
      console.error("contact: rate-limit check failed", response.status);
      return false;
    }
    return (await response.json()) === true;
  } catch (error) {
    console.error("contact: rate-limit check threw", error instanceof Error ? error.message : error);
    return false;
  }
}

async function store(env: ContactEnv, payload: ContactPayload): Promise<string | null> {
  const url = new URL("/rest/v1/contact_messages", env.SUPABASE_URL);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone?.trim() || null,
        subject: payload.subject.trim(),
        message: payload.message.trim(),
      }),
    });
    if (!response.ok) {
      console.error("contact: insert failed", response.status);
      return null;
    }
    const rows = (await response.json()) as Array<{ id?: string }>;
    return rows[0]?.id ?? null;
  } catch (error) {
    console.error("contact: insert threw", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": new URL(request.url).origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" }, { ...cors, Allow: "POST, OPTIONS" });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json(415, { success: false, error: "Expected application/json" }, cors);
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json(400, { success: false, error: "Malformed body" }, cors);
  }

  const problems = validate(payload);
  if (problems.length > 0) {
    // Field names only: never echo the submitted body back.
    return json(400, { success: false, error: "Invalid fields", fields: problems }, cors);
  }

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json(400, { success: false, error: "Missing client address" }, cors);

  if (!(await withinRateLimit(env, ip, new Date()))) {
    return json(429, { success: false, error: "Too many messages. Try again later." }, { ...cors, "Retry-After": "600" });
  }

  if (!(await verifyTurnstile(env, payload.turnstileToken, ip))) {
    return json(403, { success: false, error: "Security check failed" }, cors);
  }

  const id = await store(env, payload);
  if (!id) return json(500, { success: false, error: "Could not accept the message" }, cors);

  try {
    const sent = await env.SEND_EMAIL.send({
      to: env.CONTACT_TO,
      from: env.CONTACT_FROM,
      subject: `Contact form: ${payload.subject.trim()}`,
      text: [
        `From: ${payload.name.trim()} <${payload.email.trim()}>`,
        payload.phone?.trim() ? `Phone: ${payload.phone.trim()}` : null,
        "",
        payload.message.trim(),
        "",
        `Stored message id: ${id}`,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
      replyTo: payload.email.trim(),
    });
    if (!sent.success) {
      console.error("contact: send failed", id, sent.error ?? "no code");
      return json(502, { success: false, error: "Message stored but not sent" }, cors);
    }
  } catch (error) {
    console.error("contact: send threw", id, error instanceof Error ? error.message : error);
    return json(502, { success: false, error: "Message stored but not sent" }, cors);
  }

  return json(200, { success: true }, cors);
}

export default { fetch: handleContact };
