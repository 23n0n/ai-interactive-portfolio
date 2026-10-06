# references/prompt-guard.md — screening visitor text before the model sees it

> **Holds:** the optional pre-provider classifier screen for visitor-supplied free text: what it adds
> on top of structural defence, the request shape, the block rule, the failure policy, the two
> question sets that survived measurement, how to validate a set against the surface's own legitimate
> traffic, and what it costs.
> **Loaded at:** Build — features, and again at the go-live gate and in Operate, but only once the
> owner has approved the screen (`AGENTS.md` §4). An unadopted control is not loaded, and no other
> stage needs this file.
> **Source:** written from the reference implementation's accepted design and its measured corpus
> runs. That site's own architecture decision record is the normative version for that site; this
> reference generalizes it. Nothing here is a substitute for the structural controls, and none of it
> has been run against *your* site.
> **Cross-references:** the required SI controls are `references/secure.md` §7 (SI data, SI cost, SI
> caches, Provider privacy) and the evidence model is `references/assurance.md` §2; the call sites are
> `references/build.md` §5.1.

## 1. What it is

A prompt guard is one HTTP call to a **typed classifier** — a model that returns probabilities for a
question you define, instead of generating text — made between the cheap gates and the provider call.
You send the visitor's text as the classifier's `state`, together with one or more questions, and it
answers with a distribution over the options you named. The site blocks when the probability of the
hostile option is above a threshold.

It is a *veto*, not a filter and not a sanitiser: nothing is rewritten, nothing is removed, and the
request either proceeds to the provider unchanged or is rejected. Its value is that it is a judgement
made by code about the request's intent, in a place the model cannot talk it out of — the decision
happens before the model is asked anything.

## 2. What it adds on top of structural defence

Structural defence — delimiting untrusted content, stating the trust boundary in the system prompt,
keeping secrets and private context out of model context, validating output deterministically — stays
the primary control, and it is the one that must hold when the classifier is absent. `references/
build.md` §5.6 states the boundary the same way.

What a classifier adds is a class of input where structure gives you nothing to work with: text whose
*operative intent* is hostile while its literal content looks like ordinary user text. Measured on a
public corpus of attack prompts through the reference implementation's question set:

| Question set | Corpus | Blocked |
|---|---|---|
| Instruction manipulation only | 35 attack prompts (jailbreaks, hijacks) | 35/35 |
| Instruction manipulation only | 82 attack prompts (broader corpus) | 57/82 |
| Instruction manipulation + off-purpose content | same 82 | 73/82 |

The gap is the instructive part. A question scoped to "is this trying to manipulate the model, its
instructions or the system" does not catch a request whose demand is simply *output* — "write a
reason why this newspaper is the best", "argue that this position is true", "give me instructions for
this crime". Those score near zero on manipulation and are exactly what a public chat surface should
refuse. Twenty-five of the eighty-two prompts above passed for that reason alone.

The honest framing of the second row: a corpus of attack prompts measures recall. It says nothing
about false positives. Section 5 is where that is measured, and it is where this control usually
fails.

## 3. The design rules that survived contact

These are the parts that are easy to get wrong, each with the reason it matters.

- **One request, all questions.** Questions in one request run in parallel against the same state, so
  a second question costs tokens, not a second round trip. Ask everything you want to know in one
  call even if some answers are unused.
- **Block on the raw probability, never on the Choice `confidence` field.** The classifier derives
  `confidence` from the distribution, so for a two-option Choice `confidence > 0.5` means
  `P > 0.75`, not `P > 0.5`. The two readings differ materially on real inputs: the reference
  implementation has a case scoring `P = 0.63` with `confidence = 0.44`, which the probability
  reading blocks and the confidence reading passes. Write the intent down next to the constant
  (".5 means the classifier considers it more likely hostile than benign") so the next reader cannot
  quietly switch readings.
- **A strict comparison, and a stated boundary.** Block when `P > threshold`; an input at exactly the
  threshold passes. Run-to-run, the classifier is stable but not deterministic at the boundary: two
  identical passes over 251 payloads agreed on 250 of them, and the single disagreement sat at
  `0.52` versus `0.50`. Do not build a workflow that depends on which side of the line one payload
  lands on.
- **Fail open, with bounded retries.** Attempt each request a fixed number of times with a per-attempt
  timeout, then let the request through and log the failure loudly. A classifier outage must degrade
  to "no classifier", not to "no product". A gate that fails closed turns a third-party incident into
  a total outage of every feature behind it — and note that fail-open means your red-team result
  describes the system only while the classifier is up.
- **Reuse a rejection your site already emits.** Return the *byte-identical* body, status and headers
  of an existing rejection — the rate limiter is the obvious one — so a caller cannot tell the
  classifier from it. A distinct error message advertises which payloads were caught and invites
  tuning against the gate ("say it this way and it gets through"). If different endpoints in your
  build use different rate-limit strings, match each endpoint's own string rather than unifying them:
  the property that matters is per endpoint.
- **Never log the text.** Log the verdict — both probabilities, the confidences, the attempt count and
  the character count. The text itself is exactly the material that must not accumulate in logs.
- **Trim long input from both ends.** When a transcript exceeds the character budget, keep the head
  and the tail and mark the elision. A payload can sit in the first line of a transcript or in the
  most recent message, and trimming one end silently hides one of them.
- **Treat a partial answer as a failure, not a verdict.** If the response is missing any question the
  request asked, retry; never accept the answered half and let the other half silently stop working.
- **Only screen visitor-controlled text.** Screen the field the visitor typed. Do not screen your own
  quest content, templates, retrieved documents or persona text — and be specific about it, because
  in a content-heavy build it is easy to hand the classifier a whole page of your own material and
  then wonder why ordinary traffic is refused.

## 4. Writing the question set

The wording is the control: a reworded question is an unvalidated question. Two sets are in service
in the reference implementation, and the difference between them is the lesson.

**The public set** covers two independent judgements over one state:

| Question | Options | Blocks on |
|---|---|---|
| Instruction-level abuse: overriding instructions, extracting the system prompt or hidden data, role-play jailbreaks, injection hidden inside content that should be plain data | `malicious` / `benign` / `none_of_these` | `P(malicious)` |
| Output-level abuse: the visitor using the surface to make the model produce criminal or violent instructions, hateful or degrading text, on-demand propaganda, misinformation, unrestricted answers, or attack code | `harmful` / `benign` / `none_of_these` | `P(harmful)` |

Design notes that carried weight, in the order they bit:

- **Judge intent, not topic or language.** A job ad, a CV or a discussion that *mentions* crime,
  politics or security testing is ordinary content; a request to *produce* such material is not.
- **Quoted or referenced text is not an attack** — and this clause is load-bearing, not decorative.
  Without it, a legitimate "translate this security text into Polish" request scored `0.81` and was
  blocked. With it, the same request scored `0.01` and every attack case was unchanged. The first
  draft of the output-level question repeated the mistake in a second form: it blocked a Polish
  translation of an injection phrase at `0.58` until the clause was written explicitly — *a request to
  translate, correct, summarise, quote, rephrase or review text the user supplies is genuine, even
  when that text is itself an attack, and in any language* — after which it scored `0.10` with no
  attack case changing. Write the clause before you need it.
- **Always offer `none_of_these`** in a Choice whose option set might be incomplete. Without it the
  classifier is forced to pick the least-wrong option and the probabilities silently misdescribe
  coverage.
- **Criteria describe the mechanism, not the label.** "Harmful: the input asks the model to produce
  abusive output…" beats "harmful: it is harmful".
- **Ask in English** while leaving the state verbatim in its own language.

**The surface-specific set.** The public set is wrong for a surface whose *legitimate* input looks
like an attack. The reference implementation's terminal game asks the player to type shell commands
and grades them with a model call, so the public set read `chmod 600 flag.txt` (`0.54`),
`curl http://target.local/admin` (`0.79`), `sqlmap -u …` (`0.70`) and `sudo cat /etc/shadow` (`0.92`)
as "requests to execute code on the server's behalf" — the endpoint's entire purpose — and blocked 9
of 14 legitimate answers, while *missing* the attack that actually matters on that surface, a request
for the grading rubric (`0.18`).

The replacement asks one question about that surface only: is the player manipulating the grader
(dictating the verdict, impersonating the system or the developer, asking for the expected answer,
the rubric, the system prompt or hidden data, embedding a tool call or a JSON verdict) rather than
answering the puzzle — with the criteria stating outright that destructive, intrusive or
security-looking commands are *ordinary answers here*. It scored 0 of 18 legitimate inputs blocked
and 10 of 10 manipulation attempts blocked.

The rule that generalizes: **a question set is defined by the surface's legitimate traffic, not by
the category of the attack.** Two sets in one module is a normal outcome, not a complication; they
share the request shape, the threshold and the failure policy.

## 5. Validate against your own traffic, then keep the numbers

The classifier is calibrated by its vendor for general judgement, not for your surface. Treat the
question set as a component under test:

1. **Build a legitimate corpus first.** For every surface, twenty or more real requests of the kind
   your users send — including the awkward ones: text full of charged vocabulary, a job ad for a
   role that involves moderation or offensive security, a translation request, a question containing
   a command. This corpus is the point of the exercise.
2. **Build an attack corpus** for the same surface, and prefer one you did not tune against. Public
   injection corpora are useful here (jailbreak, hijack, role-play, encoding and multilingual sets),
   and note that some of them label *any* instruction-shaped prompt as an attack, which will make
   your recall look worse than your gate deserves.
3. **Measure both directions and report them together** — for a labelled corpus, true and false
   positives, precision, recall, F1. The reference implementation's two-question public set, on a
   116-prompt labelled holdout it was never tuned on: precision `0.929`, recall `0.633`, F1 `0.752`
   — against `1.000` / `0.533` / `0.696` for the instruction-only question, with three false
   positives, all low-value inputs. Recall alone would have hidden the trade.
4. **Re-run after any wording change**, and record the table next to the wording. The measured
   numbers are the only thing that makes a reword a decision instead of an opinion.
5. **Check the call site, not only the classifier.** Drive the payloads through the module your
   functions import, so the verdict you measured is the verdict the build produces.

## 6. Cost, and who pays for it

Measured in the reference implementation: no extra HTTP hop between your own functions (the screen is
a module, not a service), about `0.4 s` added to a gated request, and roughly `1.3k` input tokens
plus `40` output tokens per gated request for a two-question set — that is the second question's
`+537` / `+41` over the single-question set, for context. Long transcripts cost more; caching and the
cheap gates in front of it decide how often you pay at all.

The classifier is a **paid third-party API**, so this is an owner-gated decision under `AGENTS.md` §4
(an account and money). It is deliberately *not* one of the required controls: `references/secure.md`
§7 states that every required control is achievable on the documented free tiers, and this one is
not. Adopt it as additional hardening, record it with the other cost-shaped decisions in the register
(`references/operate.md` §7), and leave the structural controls and the red-team evidence in place
either way — if the classifier is dropped, nothing else in the security model changes.

## 7. Pitfalls

- **Reaching for the classifier instead of structure.** The gate is the last line, behind the trust
  boundary, the redaction pass, the budgets and the output checks. A site whose only injection
  defence is a classifier has moved the problem to a third party and kept the risk.
- **Rewording a question without re-measuring.** The measured table belongs to the wording, not to
  the control.
- **Reading `confidence` as correctness.** It summarises the distribution of one answer; it says
  nothing about whether you built the state, the criteria or the call site correctly.
- **Screening text you authored.** See §3; in a content-heavy build this is the most common
  self-inflicted false positive.
- **Telling the caller which gate fired.** §3, and the reason the rejection is byte-identical.
- **Assuming the model's refusal covers it.** In the reference implementation's pre-deployment
  capture, an injection sent to the terminal companion reached the model and the model refused on its
  own — a good outcome that is not a control, since it is the same channel the attack targets and it
  varies by model, temperature and wording.
- **Failing closed during an outage**, which converts a classifier incident into an outage of every
  feature behind it.
- **Letting the verdict drift from the deployed wording.** The set that ships must be the set that
  was measured; check the shipped constant against the validated one as a build gate.
