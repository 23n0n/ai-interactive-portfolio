// Run: deno test examples/edge-functions/admin-gate.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertAdminAal2, readAssuranceLevel, type AdminGateClient } from "./admin-gate.ts";

function jwtWith(claims: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(claims)}.signature`;
}

function client(responses: Record<string, unknown>): AdminGateClient {
  return {
    rpc: (fn: string) => Promise.resolve({ data: responses[fn] ?? null, error: null }),
  };
}

Deno.test("readAssuranceLevel reads the claim and tolerates junk", () => {
  assertEquals(readAssuranceLevel(`Bearer ${jwtWith({ aal: "aal2" })}`), "aal2");
  assertEquals(readAssuranceLevel(null), null);
  assertEquals(readAssuranceLevel("Bearer not-a-jwt"), null);
});

Deno.test("a non-admin is refused", async () => {
  const result = await assertAdminAal2(client({ is_admin: false }), null);
  assertEquals(result.ok, false);
  assertEquals(result.ok === false && result.status, 403);
});

Deno.test("an un-enrolled admin passes at any assurance level", async () => {
  const result = await assertAdminAal2(
    client({ is_admin: true, has_mfa_enrolled: false }),
    `Bearer ${jwtWith({ aal: "aal1" })}`,
  );
  assertEquals(result, { ok: true });
});

Deno.test("an enrolled admin at aal1 is refused", async () => {
  const result = await assertAdminAal2(
    client({ is_admin: true, has_mfa_enrolled: true }),
    `Bearer ${jwtWith({ aal: "aal1" })}`,
  );
  assertEquals(result.ok, false);
  assertEquals(result.ok === false && result.status, 403);
});

Deno.test("an enrolled admin at aal2 passes", async () => {
  const result = await assertAdminAal2(
    client({ is_admin: true, has_mfa_enrolled: true }),
    `Bearer ${jwtWith({ aal: "aal2" })}`,
  );
  assertEquals(result, { ok: true });
});

Deno.test("an unreadable factor state fails closed", async () => {
  const result = await assertAdminAal2(
    {
      rpc: (fn: string) =>
        Promise.resolve(
          fn === "is_admin"
            ? { data: true, error: null }
            : { data: null, error: { message: "permission denied" } },
        ),
    },
    null,
  );
  assertEquals(result.ok, false);
  assertEquals(result.ok === false && result.status, 503);
});
