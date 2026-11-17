/**
 * Admin gate for service-role edge functions.
 *
 * `is_admin` alone accepts a password-only (`aal1`) session. The restrictive RLS
 * policy closes that for table writes, but a function running with the service
 * key never triggers RLS, so the same assertion has to be made in code: once the
 * caller has a verified MFA factor, the presented token must be `aal2`.
 *
 * The client is narrowed to the one method used, so this file has no dependency
 * on a Supabase SDK version and can be unit-tested without a network.
 */

export interface AdminGateClient {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}

export type AdminGateResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Reads `aal` from the JWT payload. The signature is verified separately
 * (`auth.getUser()`); this only reads a claim from an already-trusted token.
 */
export function readAssuranceLevel(authorization: string | null): string | null {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(decoded) as { aal?: unknown };
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch (error) {
    console.error("admin-gate: JWT payload decode failed", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Verifies the caller may act as an admin at the account's required assurance
 * level. Call it after the JWT signature check and before any handler logic.
 */
export async function assertAdminAal2(
  client: AdminGateClient,
  authorization: string | null,
): Promise<AdminGateResult> {
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true) {
    if (admin.error) console.error("admin-gate: is_admin failed", admin.error.message);
    return { ok: false, status: 403, message: "Admin access required" };
  }

  const enrolled = await client.rpc("has_mfa_enrolled");
  if (enrolled.error) {
    // Fail closed: without the factor state the second factor cannot be asserted.
    console.error("admin-gate: has_mfa_enrolled failed", enrolled.error.message);
    return { ok: false, status: 503, message: "Second-factor state unavailable" };
  }

  if (enrolled.data === true && readAssuranceLevel(authorization) !== "aal2") {
    return { ok: false, status: 403, message: "Second factor required" };
  }

  return { ok: true };
}
