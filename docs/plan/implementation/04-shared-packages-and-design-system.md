# Shared packages and design system

Details the packages that both `apps/web` and `apps/mobile` depend on, plus the packages that only `apps/worker` depends on. Read `01-monorepo-and-project-structure.md` §6 first for the ownership table.

## 1. `@foundry/domain`

Pure TypeScript, zero runtime dependencies beyond Zod. Mirrors `plan/03-domain-model.md` exactly — this package is the executable version of that document.

```
packages/domain/src/
├── ids.ts                # Branded ID types: WorkspaceId, ProjectId, PackRevisionId, SprintId, ...
├── value-objects/
│   ├── numeric-claim.ts
│   ├── money-amount.ts
│   ├── provenance.ts
│   ├── citation-locator.ts
│   ├── time-window.ts
│   ├── confidence.ts
│   ├── access-scope.ts
│   ├── risk-class.ts
│   ├── cost-estimate.ts
│   └── version-ref.ts
├── entities/
│   ├── workspace.ts
│   ├── project.ts
│   ├── company-pack.ts
│   ├── sprint.ts
│   ├── evidence-item.ts
│   ├── assumption.ts
│   ├── experiment.ts
│   ├── artifact.ts
│   ├── provider-connection.ts
│   └── ...                # one file per entity in plan/03 §3
├── status/                # Enum + label + transition-rule modules: assumption-status.ts, artifact-status.ts, ...
└── index.ts               # Barrel export
```

Rules:

- Every entity/value-object module exports both a TypeScript `type`/`interface` **and** a Zod schema of the same shape, named `<Thing>` and `<Thing>Schema`. There is no separate ORM-generated storage schema — `packages/db` repository functions parse raw SQL rows directly through these same domain schemas (`00-tech-stack-and-versions.md` §7), so there is exactly one schema per concept, not two.
- Status transition rules (e.g., the `Assumption` lifecycle in `plan/03` §7) are implemented as pure functions `canTransition(from, to): boolean` and `nextStates(from): Status[]`, exported alongside the enum, so every layer that needs to validate a transition imports the same function instead of re-encoding the state machine.
- No file in this package imports from `react`, `next`, `postgres`, `ai`, or any AWS SDK. This is enforced by an ESLint boundary rule (`13-coding-standards-and-conventions.md` §4).

## 2. `@foundry/api-contracts`

```
packages/api-contracts/src/
├── router-type.ts        # `export type { AppRouter } from ...` — re-exports the *type only*, never the implementation
├── read-models/           # Zod schemas + types for every read model in plan/13 §3 ("Queries and read models")
├── commands/              # Zod schemas + types for every command in plan/13 §3
├── events/                 # Domain event payload types (used by notification rendering + client-side toasts)
├── stream-events.ts        # The StreamEvent union from 02-web-frontend-architecture.md §6
└── errors.ts                # The error vocabulary from plan/13 §7, as a discriminated union with `code`, `explanation`, `retryable`, `nextAction`
```

`router-type.ts` is the only place this package touches the actual tRPC router implementation, and it imports only the **type**, not the runtime module — this keeps `apps/mobile`'s bundle free of server-only code (`postgres.js`, provider SDKs) while still getting full type inference for `trpcClient`. `read-models/` includes `mcp-server-summary.ts` (the shape returned by `mcpServer.list`, `05-api-and-backend-architecture.md` §3) alongside the pack/sprint/evidence read models.

## 3. Design tokens (`@foundry/ui` + `@foundry/ui-native`)

A single source-of-truth token file drives both Tailwind (web) and NativeWind (mobile):

```
packages/ui/src/tokens/
├── color.ts       # Semantic colors: surface, border, text, status (evidence-required, blocked, stale, ...)
├── spacing.ts      # 4px-based scale
├── typography.ts    # Font family, size, weight, line-height scale
├── radius.ts
└── motion.ts        # Duration/easing tokens for the (small) set of animated transitions
```

- `packages/ui/tailwind-preset.ts` maps `tokens/*` into a Tailwind v4 theme extension, imported by `apps/web/tailwind.config.ts`.
- `packages/ui-native/nativewind-preset.ts` maps the same `tokens/*` into the NativeWind theme, imported by `apps/mobile`'s Tailwind config (NativeWind reuses the Tailwind config format).
- **Never hardcode a hex color, spacing value, or font size in a component.** Every value must resolve to a token. This is what makes the "common interaction cards" in `plan/06` §7 look and feel identical across platforms without sharing actual component code.

### Status vocabulary → color/label mapping

One mapping table, imported by both `@foundry/ui` and `@foundry/ui-native`, sourced from `@foundry/domain/status`:

| Domain status | Label | Color token |
|---|---|---|
| `not_started` | Not started | `text-muted` |
| `draft` | Draft | `status-draft` (amber) |
| `evidence_required` | Evidence required | `status-warning` (orange) |
| `review_required` | Review required | `status-info` (blue) |
| `accepted` | Accepted | `status-success` (green) |
| `stale` | Stale | `status-warning` (orange, striped) |
| `blocked` | Blocked | `status-danger` (red) |
| `superseded` | Superseded | `text-muted`, strikethrough |

Adding a new status requires updating this one table plus the enum in `@foundry/domain` — nothing else.

## 4. Web component primitives (`@foundry/ui`)

Built once on Radix UI + Tailwind, consumed by `apps/web/components/primitives`:

| Primitive | Radix base | Notes |
|---|---|---|
| `Dialog` | `@radix-ui/react-dialog` | Used for approval confirmation, artifact export options |
| `Popover` | `@radix-ui/react-popover` | Citation inspector, budget gauge details |
| `Tabs` | `@radix-ui/react-tabs` | Pack section navigation |
| `Toast` | `@radix-ui/react-toast` | Non-blocking domain event notifications |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | Workspace/project switcher |
| `Badge`, `StatusPill` | none (custom) | Renders the status vocabulary table above |
| `ProgressBar`, `BudgetGauge` | none (custom) | Sprint/budget visualization |

## 5. Mobile component primitives (`@foundry/ui-native`)

React Native equivalents with the same prop contracts where practical (`<StatusPill status="stale" />` behaves identically on both platforms):

| Primitive | Implementation |
|---|---|
| `Sheet` (mobile modal equivalent of `Dialog`) | `@gorhom/bottom-sheet` |
| `Tabs` | Expo Router's tab navigator styling, wrapped |
| `Toast` | A small custom in-app toast (no heavy native toast library needed) |
| `Badge`, `StatusPill` | Custom, sharing the token mapping in §3 |
| `ProgressBar`, `BudgetGauge` | Custom, `react-native-svg`-based |

## 6. `@foundry/observability`

```
packages/observability/src/
├── otel.ts        # OTel SDK bootstrap (NodeSDK for apps/web + apps/worker), resource attributes (service.name, env)
├── logger.ts       # pino logger factory with request-id / trace-id binding
└── errors.ts        # Base AppError class + subclasses matching plan/13 §7 error vocabulary
```

Every app calls `initObservability({ serviceName })` as the first line of its entrypoint, before any other import that might emit a log or span. See `12-observability-and-cost-management.md` for exporter configuration.

## 7. `@foundry/config`

Not published as a runtime dependency of anything — it is a dev-time-only workspace package holding:

- `tsconfig.base.json` (strict mode, path aliases for `@foundry/*`)
- `eslint.config.mjs` (flat config, shared rules — see `13-coding-standards-and-conventions.md`)
- `vitest.config.base.ts`
- `tailwind-shared.ts` (base scale values consumed by the two presets in §3)

Every package/app's own config file is a thin wrapper: `export default { ...base, ...overrides }`.

## 8. Versioning and publishing

None of these packages are published to a public or private npm registry — they are consumed via pnpm workspace `"workspace:*"` protocol only. There is no package-versioning ceremony to maintain; Turborepo's task graph and TypeScript project references are the only "version" that matters inside the monorepo.
