# Third-party notices

Everything authored in this repository is released under the
[Unlicense](LICENSE): public domain, no attribution required. This file marks the boundary of that
dedication — material that is **not the authors' to release**, and the obligation each piece carries. A
public-domain dedication cannot reach code someone else wrote, so it is recorded here instead of
being silently covered.

| Piece | Licence | Where |
|---|---|---|
| shadcn/ui-derived demo components | MIT | `examples/local-sandbox/src/components/ui/`, `src/lib/cn.ts` |
| The demo's dependencies (not vendored) | MIT / ISC / Apache-2.0 | `examples/local-sandbox/package.json` |
| Libron typeface (bundled) | OFL 1.1, Reserved Font Name | `examples/local-sandbox/public/fonts/` |
| Recorded model output | provider terms | `evals/**/runs/*.json` |

## shadcn/ui — MIT

`examples/local-sandbox/src/components/ui/button.tsx` and `examples/local-sandbox/src/lib/cn.ts`
derive from [shadcn/ui](https://github.com/shadcn-ui/ui): the `cva` variant map and the `cn` helper.
MIT conditions its permission on the notice travelling with copies of the work, so it is reproduced
here rather than dropped:

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

No other file in the tree is copied from a third party.

## Dependencies — not vendored

No `node_modules` is tracked, so no library source ships from this repository; the demo app resolves
its dependencies from the public npm registry, pinned by `examples/local-sandbox/bun.lock`. Licence
and version below are read from each installed package's own `package.json`. They matter to anyone
who **distributes a built app**, because a bundle carries their compiled code: `class-variance-authority`
is the one under Apache-2.0 rather than a permissive MIT/ISC term, and Apache-2.0 requires its
`LICENSE` and `NOTICE` to accompany a distribution.

| Package | Version | Licence |
|---|---|---|
| `react` | 19.3.0 | MIT |
| `react-dom` | 19.3.0 | MIT |
| `react-router-dom` | 7.18.4 | MIT |
| `clsx` | 2.1.1 | MIT |
| `tailwind-merge` | 3.7.0 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `lucide-react` | 1.48.0 | ISC |

## Fonts — Libron, redistributed under the OFL

`examples/local-sandbox/public/fonts/` holds the Libron webfont build (v0.31: Regular, Italic, Bold,
BoldItalic, WOFF2) by Nico Verbruggen, taken unmodified from the upstream release. The four files
travel with the repo, so the **OFL notice travels with them** and is shipped beside them as
`examples/local-sandbox/public/fonts/OFL.txt`, served at `/fonts/OFL.txt`.

Libron is itself a modified Newsreader → Readerly; the upstream copyright lines name all three, and
they are reproduced verbatim in that notice. Upstream versions carry the **Reserved Font Name
"Libron"**, so a *modified* copy must be renamed — this repo ships the build unmodified and keeps the
name, and anyone forking it must do the same or rename. The OFL also forbids selling the font on its
own. The demo makes no third-party font request at runtime.

## Recorded model output

`evals/**/runs/*.json` hold responses recorded from a model provider while benchmarking this skill.
They are measurement records, not authored prose, and the provider's terms govern their use; they are
listed here because they are the only third-party-authored text in the tree.

## Reporting a gap

If something here is missing its notice, or is listed as third-party and should not be, open an issue.
