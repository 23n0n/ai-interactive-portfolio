# Admin second factor — TOTP end to end

Owns: the second factor on the admin login — the project switches that make enrolment possible, the
enrolment screen, the code step at sign-in, and the server-side assertion that actually refuses an
`aal1` session. Loads at Build when the admin panel is built, and again at Publish before the
go-live gate. The security posture it implements is `references/secure.md` §2 item 13.

A policy that checks `aal2` without a way to enrol a factor is inert, and an enrolment screen
without the policy is decoration. Ship both, and prove the negative case.

## 1. What the control is

Supabase's built-in TOTP (an authenticator app) is the free second factor. Phone/SMS MFA is the paid
add-on and is out of scope. The session's assurance level rides in the JWT as `aal`:

- password accepted → `aal1`
- password plus a verified TOTP code → `aal2`

The database and the edge functions decide on `aal2`, not on the screen.

## 2. Project switches — check these before writing any UI

1. `mfa_totp_enroll_enabled` and `mfa_totp_verify_enabled` must both be `true` in the project's auth
   configuration. While they are false, `enroll` fails with **"MFA enroll is disabled for TOTP"** and
   no client work can help.
2. Read the live values from the Management API (`GET /v1/projects/<ref>/config/auth`) rather than
   assuming the dashboard state.
3. Change them with a **surgical PATCH** that carries only those fields. Pushing a whole
   `config.toml` over the hosted project can silently reset captcha, token lifetime or redirect
   URLs that the file does not mention.
4. Keep the project's other controls as they are: signup disabled, captcha on (if the project uses
   it), and the same redirect allowlist.
5. Mirror the two flags in the site's `config.toml` (`[auth.mfa.totp]`) so the repository does not
   contradict the project.

## 3. Enrolment screen

Reachable in two places, one component: a **Security** tab in the admin console, and a standalone
`/security` page for a signed-in account. The standalone page matters — an `aal1` admin cannot use
the console to reach the screen that fixes `aal1`.

1. Read the assurance state (`getAuthenticatorAssuranceLevel`): `currentLevel`, `nextLevel`.
   `nextLevel === 'aal2' && currentLevel === 'aal1'` is exactly "password accepted, code owed";
   `nextLevel !== 'aal2'` means no verified factor yet.
2. Start enrolment with `mfa.enroll({ factorType: 'totp' })`. Before calling it, list factors and
   unenroll every `status: 'unverified'` TOTP factor: an abandoned attempt otherwise blocks the next
   one with "A factor with the friendly name ... for this user already exists".
3. Render the QR. The response carries an SVG document, sometimes wrapped in a data URI and usually
   without a `viewBox`; injected verbatim it prints the URI above the code or clips to a corner.
   Decode the URI, drop `width`/`height`, add `viewBox` from them, size the element to its box.
4. Show the manual secret next to the QR with a copy button; a phone that cannot scan is common.
5. Confirm with a six-digit code (`challenge` then `verify`). Digits only, `inputMode="numeric"`,
   `autoComplete="one-time-code"`.
6. Confirm success on screen, then re-read the state: the session is now `aal2`.

## 4. Sign-in

1. Password step unchanged. After `signInWithPassword`, read the assurance state.
2. If `required`, keep the session and show the code step — do not sign out, the session is the thing
   the code completes.
3. A reload, or a bounce from a protected route, must return to the code step without asking for the
   password again: read the session on mount and re-enter the step when a factor exists.
4. Offer a way out of the code step ("use a different account") that signs out cleanly.

## 5. Server-side assertion

**Database.** A restrictive policy on every admin-gated table, combined with the existing permissive
`is_admin()` policies (RLS ANDs restrictive with permissive):

```sql
create or replace function public.has_mfa_enrolled()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = (select auth.uid()) and f.status = 'verified'
  );
$$;

-- per admin-gated table:
create policy "privileged access requires aal2" on public.<table>
  as restrictive for all to authenticated
  using (
    not public.is_admin()
    or not public.has_mfa_enrolled()
    or (select auth.jwt() ->> 'aal') = 'aal2'
  )
  with check ( ... same predicate ... );
```

Three properties make this safe to apply before anyone enrols: a non-admin is unaffected; an admin
with **no** factor is unaffected (there is nothing to complete, so nothing locks them out); an admin
**with** a factor must be `aal2`. `security definer` is required — the API role cannot read
`auth.mfa_factors`, and an invoker-rights helper fails the whole table, reads included.

**Edge functions.** Service-role functions never touch RLS, so the same assertion has to be made in
code, in one shared helper used by every admin-invoked function:

1. verify the JWT signature (`auth.getUser()` against a service-role client) — decoding is not
   verification;
2. `rpc('is_admin')` with the caller's token;
3. `rpc('has_mfa_enrolled')` with the caller's token;
4. if the caller has a factor, require `aal === 'aal2'` from the presented JWT.

Fail closed: an unreadable factor state is a `503`, never a pass. The full function contract and the
case matrix are in `references/secure.md` §3. Runnable reference and its tests:
`examples/edge-functions/admin-gate.ts` (`deno test examples/edge-functions/`).

**The client gate is not the control.** A route guard that sends an `aal1` session to the code step
is a UX nicety; both layers above are what refuse the write.

## 6. Reset and recovery

- Turning the factor off requires an `aal2` session, or one stolen password could delete the second
  factor. After unenrolling, refresh the session — the old access token still claims `aal2` until it
  does.
- Losing the device: the owner uses stored recovery codes, or the operator removes the factor
  through the Supabase dashboard and the account is signed out. There is no unauthenticated reset
  path, and a magic link is **not** a way around the factor: it produces an `aal1` session too.
- On any change to role, password, factor enrolment or account status, revoke the affected sessions.

## 7. Verification before go-live

1. Enrol a factor end to end on the real project and confirm the panel reports `aal2`.
2. Sign out, sign in: the code step appears, and a wrong six-digit code is refused.
3. With an `aal1` session (password only, same account), attempt an admin write; it must fail —
   `permission denied` or zero rows — and the admin function must answer `403`.
4. With an `aal2` session, the same write succeeds.
5. Reload during the code step: the step comes back, the password is not asked again.
6. Remove the factor (as `aal2`), confirm the account can sign in at `aal1` again and that the
   policies stop restricting writes — the progressive behaviour is deliberate, not a bug.

Record the six results in the release evidence (`references/assurance.md`).
