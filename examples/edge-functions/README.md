# Reference edge functions

Two working files the build adapts, not a library to import. They exist because both capabilities
fail silently in the same way: the code looks finished while nothing is delivered and nothing is
refused. Read the matching reference before changing them — `references/contact-form.md` and
`references/admin-mfa.md`.

| File | Runs where | Why there |
|---|---|---|
| `contact-worker.ts` | Cloudflare Worker route (`/api/public/contact`) | The `SEND_EMAIL` binding lives in the Worker, so the send cannot happen in a Supabase function |
| `admin-gate.ts` | imported by every admin-invoked Supabase function | A service-role function bypasses RLS, so it must assert the second factor itself |

## What is proven here, and how

```bash
deno check examples/edge-functions/admin-gate.ts examples/edge-functions/contact-worker.ts
deno test examples/edge-functions/
```

The tests cover the ordering the design depends on: method and content-type guards before any work,
validation naming only the failing fields, a refused challenge answering `403` with nothing stored,
the rate limit answering `429` with `Retry-After`, a stored-and-sent message answering `200` with
`Reply-To` set to the visitor, and a provider failure answering `502` **after** the row exists.

The gate tests cover all four admin states plus the fail-closed read: non-admin refused, un-enrolled
admin allowed at any level, enrolled admin at `aal1` refused, enrolled admin at `aal2` allowed,
unreadable factor state `503`.

Nothing here sends a real message or contacts a real project — the outbound calls are stubbed. The
delivery proof is a release artifact (`references/assurance.md` row 18), not a unit test.

## Adapting them

1. Replace the constants: `CONTACT_TO`, `CONTACT_FROM` and the disposable-domain list. The recipient
   is server-side and single; a form that accepts it from the visitor is an open relay.
2. Keep the ordering: challenge verified before storage, row stored before the send, `502` when the
   send fails. Reversing the last two loses the message the owner would have recovered.
3. Wire the rate limiter to the site's own RPC (`check_contact_rate_limit` in the worker file) and
   keep its key on the platform header, never on a caller-controlled one.
4. In each admin function, call `assertAdminAal2` after the JWT signature check and before any
   handler logic, and return its `status` and `message` unchanged.
