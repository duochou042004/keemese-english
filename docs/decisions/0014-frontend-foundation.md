# ADR-0014: Frontend foundation libraries

Status: Accepted (2026-10-17). Versions checked against npm on 2026-10-17 and **pinned exactly in the lockfile when installed in M0**.

| Concern | Choice | Version line | Why |
|---|---|---|---|
| Styling | Tailwind CSS v4 + `@tailwindcss/vite` | 4.3 | Baseline. Tokens in CSS `@theme` |
| Components | **shadcn/ui** (code copied into `web/src/components/ui`) on **Radix** primitives (`radix-ui`) | shadcn CLI 4.x | Accessible primitives (focus management, ARIA) we own and can restyle. Radix is chosen over Base UI for maturity |
| Server state | TanStack Query | 5.x | Caching, request deduplication, mutations with invalidation, no global store |
| Forms | React Hook Form + Zod 4 + `@hookform/resolvers` | 7.x / 4.x / 5.x | Uncontrolled inputs (fast), one schema for types and validation |
| Icons | `lucide-react` | 1.x | Bundled with shadcn, tree-shaken |
| Toasts | `sonner` (via shadcn) | — | Brief success feedback only |
| Dates | `Intl` + `date-fns` (only if `Intl` is not enough) | — | Prefer the platform |
| Font | Inter Variable, self-hosted via `@fontsource-variable/inter` | — | Full Vietnamese diacritics, tabular numerals, no third-party font CDN (NFR-PRIV-01) |
| API types | `openapi-typescript` (dev dependency) generates `web/src/api/schema.d.ts` from the backend OpenAPI document | — | Keeps the API contract in sync ([ADR-0016](0016-minimal-apis-and-contracts.md)) |

**Not added** (each would need a new ADR): global state libraries (Redux, Zustand; Query plus URL state is enough), CSS-in-JS, chart libraries (progress uses simple CSS bars and an SVG line chart until one is proven necessary), animation libraries, data-grid libraries.

Rule for agents: **a new runtime dependency requires a sentence of justification in the PR and approval from the orchestrator.** Prefer the platform and existing dependencies (Ponytail ladder).
