// Run: deno test examples/edge-functions/contact-worker.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleContact, validate, type ContactEnv } from "./contact-worker.ts";

const realFetch = globalThis.fetch;

function env(overrides: Partial<ContactEnv> = {}): ContactEnv {
  return {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key-for-tests",
    TURNSTILE_SECRET: "turnstile-secret-for-tests",
    CONTACT_TO: "owner@example.com",
    CONTACT_FROM: "form@send.example.com",
    SEND_EMAIL: { send: () => Promise.resolve({ success: true }) },
    ...overrides,
  };
}

/** Stubs the three outbound calls the handler makes: rate limit, insert, siteverify. */
function stubFetch(options: { limit?: boolean; insert?: boolean; turnstile?: boolean } = {}): void {
  const { limit = true, insert = true, turnstile = true } = options;
  globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.includes("/rpc/check_contact_rate_limit")) {
      return Promise.resolve(new Response(JSON.stringify(limit), { status: 200 }));
    }
    if (url.includes("/rest/v1/contact_messages")) {
      return Promise.resolve(
        insert
          ? new Response(JSON.stringify([{ id: "message-1" }]), { status: 201 })
          : new Response("nope", { status: 500 }),
      );
    }
    if (url.includes("siteverify")) {
      return Promise.resolve(new Response(JSON.stringify({ success: turnstile }), { status: 200 }));
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  };
}

function request(body: unknown, init: RequestInit = {}): Request {
  return new Request("https://zabrowski.test/api/public/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.9" },
    body: JSON.stringify(body),
    ...init,
  });
}

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  subject: "Contract work",
  message: "Could we talk about a security review next month?",
  turnstileToken: "token",
};

Deno.test("validate rejects overlong, malformed and HTML bodies", () => {
  assertEquals(validate(valid), []);
  assertEquals(validate({ ...valid, email: "not-an-email" }), ["email"]);
  assertEquals(validate({ ...valid, name: "x".repeat(121) }), ["name"]);
  assertEquals(validate({ ...valid, message: "<script>alert(1)</script>" }), ["message"]);
  assertEquals(validate({ ...valid, email: "jane@mailinator.com" }), ["email"]);
});

Deno.test("method and content-type guards answer before any work", async () => {
  stubFetch();
  const get = await handleContact(new Request("https://zabrowski.test/api/public/contact"), env());
  assertEquals(get.status, 405);
  assertEquals(get.headers.get("Allow"), "POST, OPTIONS");

  const text = await handleContact(
    request(valid, { headers: { "Content-Type": "text/plain", "cf-connecting-ip": "203.0.113.9" } }),
    env(),
  );
  assertEquals(text.status, 415);
  globalThis.fetch = realFetch;
});

Deno.test("invalid fields answer 400 and name only the fields", async () => {
  stubFetch();
  const response = await handleContact(request({ ...valid, subject: "" }), env());
  assertEquals(response.status, 400);
  const body = (await response.json()) as { fields?: string[]; success: boolean };
  assertEquals(body.success, false);
  assertEquals(body.fields, ["subject"]);
  globalThis.fetch = realFetch;
});

Deno.test("a refused challenge is 403 and stores nothing", async () => {
  stubFetch({ turnstile: false });
  const response = await handleContact(request(valid), env());
  assertEquals(response.status, 403);
  globalThis.fetch = realFetch;
});

Deno.test("the rate limit answers 429 with Retry-After", async () => {
  stubFetch({ limit: false });
  const response = await handleContact(request(valid), env());
  assertEquals(response.status, 429);
  assertEquals(response.headers.get("Retry-After"), "600");
  globalThis.fetch = realFetch;
});

Deno.test("a stored and sent message answers 200", async () => {
  stubFetch();
  let sentTo: string | undefined;
  const response = await handleContact(
    request(valid),
    env({
      SEND_EMAIL: {
        send: (message) => {
          sentTo = message.replyTo;
          return Promise.resolve({ success: true });
        },
      },
    }),
  );
  assertEquals(response.status, 200);
  assertEquals(sentTo, "jane@example.com");
  globalThis.fetch = realFetch;
});

Deno.test("a provider failure answers 502 after the message was stored", async () => {
  stubFetch();
  const response = await handleContact(
    request(valid),
    env({ SEND_EMAIL: { send: () => Promise.resolve({ success: false, error: "E_SENDER_NOT_VERIFIED" }) } }),
  );
  assertEquals(response.status, 502);
  const body = (await response.json()) as { success: boolean };
  assertEquals(body.success, false);
  globalThis.fetch = realFetch;
});
