# references/assurance.md — what this distribution proves, and what the site must prove

> **Holds:** the boundary between specification and evidence (what this repository can and cannot
> prove), the evidence set a release must produce, the register rules for accepted risk, the
> requirement for a preserved independent review, and the order in which a site closes the gap
> between the two.
> **Loaded at:** Publish (before the go-live gate) and Operate (every release that touches the
> security surface). Read with `references/secure.md` — that file owns the controls, this one owns
> the proof.
> **Source:** new in this revision. The controls it points at are inherited (old kit + the
> `references/secure.md` revisions); the evidence model is written down here for the first time.
> **Cross-references:** the control list is `references/secure.md` §7; the audit queries are
> `DATABASE_SCHEMA.md` §12; the gates are `references/deploy.md` §8; the acceptance register rows are
> `references/operate.md` §7; the telemetry and the audit export are `references/operate.md` §4.1.

## 1. Specification is not evidence

This repository is a **distribution**: a contract, references, a schema and an example. It is not the
site, and it cannot be the evidence for the site. Everything security-relevant here describes what a
correct build does; none of it proves that a particular build did it. The distinction matters because
the failure mode it prevents is a review that reads a good specification and approves a repository
that never implemented it.

So the rule is blunt: **a control exists when its evidence exists, not when its paragraph exists.**
For the site, that means the artifacts below; and for this repository, it means the docs must never
read as if the work were already done. They do not: every claim about the running system is phrased
as a requirement on the build, and the only artifact this repository ships that *proves* anything is
its own `scripts/check-docs.py`, which checks the distribution's internal consistency and nothing
else.

The site repository must contain, for the reviewed commit, the application code, the timestamped
migrations under `supabase/migrations/`, the edge functions, the workflow definitions, the tests,
the lockfile and the infrastructure configuration; anything missing there is a release with an open
finding.

**What can therefore be verified here:** that the specification is internally consistent, complete
against the control list, and free of the development-node artifacts that would make it
un-reviewable.
**What cannot:** RLS on real tables, real policy definitions, real grants, real view options, real
edge-function behaviour, real headers, real secrets hygiene, real CI execution, real deployments.
Those live in the site repository and the deployed environment.

## 2. The evidence set — what a release must be able to show

Each row is an artifact, not an activity. If a release cannot produce it, the release is not ready —
`references/deploy.md` §8 is where that is enforced. Keep them with the release: a sanitized copy
where the artifact contains operational data, never a token, a key or a row of private content.

| # | Artifact | Proves | Produced by |
|---|---|---|---|
| 1 | The reviewed commit SHA, and the release manifest (Worker version, per-function source hashes, migration versions) | what is actually running, and that the release is atomic | `references/deploy.md` §4, §7 |
| 2 | RLS audit output — §12 A–G, run against the deployed project, sanitized | every table has RLS; no API-role base-table grants; views read-only; grants on the cache/rate-limit RPCs clean; deny-all tables still deny | `DATABASE_SCHEMA.md` §12, `references/secure.md` §4 |
| 3 | Behavioural probes — anon, non-admin authenticated, admin | the policy matrix holds for a real client, not just in the catalog | `DATABASE_SCHEMA.md` §12 G |
| 4 | View-option, `SECURITY DEFINER` and `storage.objects` sweeps | the three perimeter checks in `references/secure.md` §4.1–4.3 return zero findings | `references/secure.md` §4 |
| 5 | Projection and predicate tests per `private.api_*` view, with negative tests for every private field | the definer layer exposes exactly the allowlisted columns and rows | `references/secure.md` §4.1 (the view allowlist, the projection/predicate test and the negative tests) |
| 6 | The admin-function case matrix for **every** service-role endpoint, plus the ordering cases | no endpoint can be reached without a verified caller, and no path returns before the check | `references/secure.md` §3, `DATABASE_SCHEMA.md` §9 |
| 7 | Live header and route results | CSP with the nonce matching hydration, `frame-ancestors` on every HTML response, HSTS, `nosniff`, referrer and permissions policies, `405`/`415` guards | `references/secure.md` §5 |
| 8 | The spoofed-header and direct-invocation tests | the rate-limit key comes from the trusted ingress and cannot be influenced by a caller | `references/secure.md` §7 (ingress) |
| 9 | A restore record: when the last restore was tested, and the measured recovery point and time | the backup actually restores, and against an objective rather than an assumption | `references/operate.md` §3 |
| 10 | A controlled-event test per alert, and the audit export receipt | the telemetry fires, and the audit trail survives off-platform | `references/operate.md` §4.1 |
| 11 | SBOM, dependency-review result, provenance, and the artifact/bundle secret scan | the shipped artifacts, not only the source tree, were checked | `references/secure.md` §2 item 12 |
| 12 | The prompt-injection red-team result, and the AI data-flow note (what is sent to the provider, the provider's retention and model-training terms with the date they were checked, the transfer and subprocessor position, the redaction pass before transmission, the pre-submission notice, the non-AI alternative, and the deletion limits) | the model context holds the minimum data, leakage is detected rather than assumed impossible, and the provider's terms are recorded rather than assumed | `references/secure.md` §7 (AI data) |
| 13 | The independent review artifact (§4) | somebody who did not build it tried to break it | `references/secure.md` §6 |
| 14 | The successful CI run for the reviewed commit (workflow run id / artifact URLs) | the gates that run were executed against the code being released, not asserted | `references/deploy.md` §3, §4, §8 |
| 15 | The migration inventory — `supabase migration list` against the linked project, with no pending migration | the schema history is complete and the release's migration versions are a real set, not a list | `references/deploy.md` §6, `DATABASE_SCHEMA.md` §11 |
| 16 | The cache-key schema and the cache-invalidation test | a cached response cannot outlive the model, prompt, context, policy or content version that produced it | `references/secure.md` §7 (AI caches), `DATABASE_SCHEMA.md` §2.3 |
| 17 | The service-role key rotation record | the rotation procedure works, and the affected functions were re-deployed and re-checked after it | `references/operate.md` §6 |

A release that omits a row is a release with an open finding. Record the omission, and the run report
carries it until it is closed — silence is the one thing that is not allowed.

## 3. Accepted risk is registered, not remembered

An acceptance is a decision with an owner and a shelf life. The register lives in
`references/operate.md` §7 (the rows), and the rules are here:

- **Every row carries:** the decision, the owner, the approval date, an **expiry**, a review
  cadence, the trigger that invalidates it, and the remediation it is waiting for.
- **Expired means expired.** A critical acceptance past its expiry **blocks promotion**: the site may
  keep running, but the next release does not ship until the acceptance is renewed with a new date
  or the remediation lands. The `check-docs` gate (or the release checklist) flags an acceptance
  whose expiry has passed, and the release does not ship until it is renewed; a review that finds an
  expired acceptance records it as a finding.
- **Renewal is a decision, not a default.** Renewing writes a new date and says what changed; a
  renewal because nobody got round to it is how a temporary assumption becomes permanent
  architecture.
- **The trigger beats the calendar.** If the invalidation trigger happens — a second operator, real
  user data, a plan that affords the control — the acceptance is over, whatever the expiry says.

## 4. The independent review is an artifact, not an intention

`references/secure.md` §6 defines the review: a **fresh session**, no memory of the build, the
threat model restated, the queries re-run, the findings reported as a table. What this file adds is
that the review is *kept*:

1. Run the review against the **production commit and the deployed environment**, not against the
   specification.
2. Preserve the artifact: the findings register, the evidence for each, the response, and the retest
   result. A finding is closed by a retest, not by a reply.
3. The reviewer must not rely only on this documentation — that is the point of independence. Give
   them the commit and the environment, not the narrative.
4. Repeat after any material change: authentication, the data flow, the AI surface, the RLS model,
   the ingress, or the deployment topology.

## 5. The order to close things in

When several of these are open at once, this is the order that risks the least:

1. Provide the implementation and the deployment target (the commit that is running).
2. Isolate staging from production — separate projects, credentials and data.
3. Run and preserve the database, view, grant and storage audits (§2 rows 2–5).
4. Reduce service-role exposure: authenticate every write path, scope every function, isolate the
   high-risk functions and their secrets, and rehearse the service-role rotation.
5. Make deployments atomic and edge functions versioned and rollback-capable — the whole release,
   Worker and functions, rolls back in one dispatch.
6. Require MFA, and disable public signup.
7. Close the ingress boundary; prove the rate-limit key cannot be spoofed.
8. Add the AI data controls, the cost limits and the wider injection testing.
9. Turn on security telemetry and the administrative audit trail.
10. Harden the supply chain: SBOM, pinning, SAST, provenance.
11. Improve backups: immutability, tiers, configuration recovery, point-in-time recovery.
12. Complete an independent review against the deployed production commit, and keep it.
