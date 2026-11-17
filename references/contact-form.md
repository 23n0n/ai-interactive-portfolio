# Contact form — visitor message to the owner's inbox

Owns: the public contact form end to end — the visitor's screen, the endpoint that accepts it, the
spam gate, the mail that leaves the site, the stored copy and the admin inbox. Loads at Build when
the contact section is built, and again at Publish when mail delivery is proven. Abuse controls that
also apply here live in `references/secure.md` §2 item 4; this file owns the rest.

A contact form that answers `200` and delivers nothing is the failure this reference exists to
prevent. The site must show the owner a message in their mailbox they can reply to, and the release
must say which check proved it.

## 1. The shape of the feature

1. A section on the public site with four required inputs (name, e-mail, subject, message) and one
   optional one (phone), a Cloudflare Turnstile widget, a submit button and a short privacy note.
2. `POST /api/public/contact` on the site's own origin; the Worker proxies it to the `contact`
   edge function and attaches the trusted ingress secret (`references/secure.md` §7, Ingress).
3. The function verifies the challenge, validates and caps every field, stores the message, sends
   one e-mail to the owner and answers with a small JSON body.
4. The admin console lists stored messages, shows them, and lets the owner delete one.

The visitor never chooses the recipient, the sender, the subject prefix or the template. All four
are server-side constants; a form that accepts them is an open relay.

## 2. Data

`public.contact_messages` (DDL and grants: `DATABASE_SCHEMA.md` §13):

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text | 1–120 chars after trim |
| `email` | text | matches `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤254 chars |
| `phone` | text null | ≤40 chars |
| `subject` | text | 1–100 chars |
| `message` | text | 1–5000 chars |
| `status` | text | `new` \| `read` \| `deleted`, default `new` |
| `created_at` | timestamptz | `now()` |

- RLS on, **no anon policy, no authenticated policy**. Reads and updates go through the admin panel
  with the admin role; the restrictive `aal2` policy from `DATABASE_SCHEMA.md` §13 applies, so an
  `aal1` admin session cannot read the inbox either.
- The insert comes from the edge function with the service key; the browser never writes this table.
- Store the message body, not an IP address. If a rate-limit key is needed for an alert, store a
  salted hash next to the alert, never in this table (`DATABASE_SCHEMA.md` §2.3).
- Retention: delete rows older than the period the privacy note states (default 12 months) with the
  scheduled sweep the audit checks for; the visitor's message is not a permanent archive.

## 3. Endpoint contract

Runnable reference: `examples/edge-functions/contact-worker.ts` (a Cloudflare Worker route — the
mail binding lives in the Worker, not in a Supabase function), with tests beside it.

| Case | Answer |
|---|---|
| `OPTIONS` | preflight, allowlisted origin only |
| any method but `POST` | `405` with `Allow: POST, OPTIONS` |
| missing or wrong `Content-Type` | `415` |
| malformed JSON, unknown fields, oversized body | `400` |
| field missing, too long, or failing the e-mail pattern | `400` with a field-level message the UI can show |
| missing, expired or forged Turnstile token | `403` |
| over the per-IP limit | `429` with `Retry-After` |
| challenge passed, validated, stored | `200` `{ "success": true }` |
| stored, mail send failed | `502` `{ "success": false }` — the message is kept and the failure is logged |

Caps are enforced twice: in the browser (counter, `maxLength`) for a usable form, and in the
function for the boundary. The function's copy is the authority. Do not accept a `category` list
the visitor cannot see, and do not echo the submitted body back in the response.

## 4. Spam and abuse

1. Turnstile `siteverify` runs server-side before storage, with the visitor's IP, and **fails
   closed**: a missing secret, an unreachable siteverify or an `error-codes` answer rejects the
   request. Never trust the widget's client-side token alone.
2. One message per IP per window (default 5 per 10 minutes) using the shared rate-limit table; the
   limit is evaluated after ingress and before storage.
3. Reject undeliverable and never-real sender domains — a disposable-domain set plus an MX/A
   existence check on the domain the visitor typed. A rejection is a generic `400`; never explain
   which list matched.
4. Accept plain text only. HTML in the message is rejected, not sanitised; the mail is built from
   escaped values.
5. Log provider error codes and field-level validation counts. Never log the message body, the
   e-mail address or the IP with the body.

## 5. Delivery — the part that quietly does not work

The mail leaves through Cloudflare **Email Sending** (the `SEND_EMAIL` binding), not through Email
Routing. The two are not interchangeable:

| Product | Requires | Breaks |
|---|---|---|
| Email Routing | Routing enabled on the zone, which rewrites the zone MX | any mailbox hosted elsewhere on that domain |
| **Email Sending** (use this) | the sending domain onboarded to Compute → Email Service → Email Sending, which adds `cf-bounce` MX, SPF, DKIM and DMARC on **that subdomain only** | nothing outside the subdomain |

Rules:

1. Onboard the sending subdomain and wait for the records to verify **before** the go-live gate.
   Cloudflare answers `E_SENDER_DOMAIN_NOT_AVAILABLE` / `E_SENDER_NOT_VERIFIED` until it is ready.
2. Keep the apex mailbox (the owner's real inbox at their provider) untouched — the requirement is a
   subdomain, not the apex.
3. Sender is a constant on the onboarded subdomain; recipient is a single address the owner
   controls; `Reply-To` is the visitor's validated address so one click answers them.
4. The binding returns success when the request is accepted, which is **not** proof of delivery.
   Treat the provider's response as the first step: log the message id and the provider error code,
   and alert on any non-success rather than on the visitor's `200`.
5. A send failure must not lose the message: the row is stored first, the response is `502`, and the
   alert carries the stored id so the owner can recover the text from the admin inbox.

## 6. Admin inbox

A list of stored messages (newest first, `new` marked), a read view, and a delete action. The owner
can copy an address and reply from their own mail client; the panel does not send. Deleting sets
`status = 'deleted'` and the retention sweep removes the row.

## 7. Verification before go-live

1. Submit the real form from a browser as a visitor and confirm **the message lands in the owner's
   mailbox**, with the visitor's address in `Reply-To`.
2. Read the delivered message's authentication results (`Authentication-Results` header): SPF,
   DKIM and DMARC must all pass for the sending subdomain.
3. Replay the request without a token, with a token from another origin, and with an expired token:
   three `403`s.
4. Submit six times from one address: the sixth answers `429`.
5. Send a disposable-domain address and an address whose domain has no MX: both `400`, both stored
   nothing.
6. Stop the sending domain (or point the sender at an unverified one): the request answers `502`,
   the row is still in the inbox, and the alert fired.
7. Confirm the panel hides the inbox from an `aal1` admin session (`references/admin-mfa.md`).

Record the six results in the release evidence (`references/assurance.md`).

## 8. Failure modes

The reference's tests (`deno test examples/edge-functions/`) pin the ordering: guards before
work, challenge before storage, storage before send, `502` after the row exists.

| Symptom | Cause | Fix |
|---|---|---|
| `200` and no mail | sending domain not onboarded; the binding accepted and dropped | onboard, wait for verification, re-run a real send |
| `E_SENDER_NOT_VERIFIED` | records not published yet | wait, then re-check the DKIM/SPF state |
| mail arrives in spam | DMARC missing or `p=none` without alignment | publish DKIM + aligned SPF and a DMARC record for the subdomain |
| replies go nowhere | `Reply-To` missing | set it to the visitor's address |
| Turnstile always fails | widget domain list lacks the host | add the production and preview hosts to the widget |
| the owner's own mailbox MX moved | Email Routing enabled on the apex | disable Routing, use Email Sending on a subdomain |
