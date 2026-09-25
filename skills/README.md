# skills/ — thin per-harness wrappers

Some harnesses discover skills in a fixed directory. For those, an adapter is exactly one file:

```
skills/<harness>/SKILL.md
```

That file does one thing: **point at `AGENTS.md`**. It carries no behaviour of its own.

The convention:

- The core of this repository contains **no harness-specific instructions**, as a rule and not just
  a preference. Everything the agent needs is in `AGENTS.md` and the `references/`.
- A wrapper is **only a pointer**. Stages, gates, commands, reference lists, security rules, version
  pins and configuration do not belong in it. A wrapper that carries behaviour forks the contract
  and breaks the neutrality claim — treat that as a bug.
- A wrapper is **optional**. A harness that reads a repository-root `AGENTS.md` needs none, and a
  session simply told to read `AGENTS.md` needs none either.
- Directory names such as `skills/pi/`, `skills/dsh/`, `skills/claude/` or `skills/codex/` are
  examples of the pattern. They name runners, never requirements.

The template to copy and the full explanation of the convention are in
[`references/harness.md`](../references/harness.md) §5. This file does not restate them, and where
anything here disagrees with `AGENTS.md`, `AGENTS.md` wins.
