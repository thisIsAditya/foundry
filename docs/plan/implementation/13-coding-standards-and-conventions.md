# Coding standards and conventions

This is the document with the single highest leverage for the goal stated in the user's request: **"the agent which is going to write the code must not think much and still make no mistake."** Every rule below exists to remove a decision a coding agent would otherwise have to make ad hoc.

## 1. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| File names | `kebab-case.ts` | `pack-service.ts`, `sprint-runner.ts` |
| React components (file + export) | `PascalCase` | `EvidenceCard.tsx` exporting `EvidenceCard` |
| Non-component functions/variables | `camelCase` | `getDeskSummary`, `packRevisionId` |
| Types/interfaces/Zod schema constants | `PascalCase`, schema constants suffixed `Schema` | `type NumericClaim`, `const NumericClaimSchema` |
| Enums / status vocab | `snake_case` string literal unions, not TypeScript `enum` | `'not_started' | 'draft' | 'accepted'` (see §3 for why) |
| Database tables/columns | `snake_case`, plural table names | `pack_revisions`, `workspace_id` |
| tRPC procedures | `<router>.<verbNoun>`, camelCase | `sprint.approvePlan`, `pack.getDiff` |
| BullMQ queue names | `kebab-case`, singular | `sprint`, `ingestion`, `render`, `notification` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `BETTER_AUTH_SECRET` |
| Branded domain IDs | `<Entity>Id` type alias over a branded `string` | `type ProjectId = Brand<string, 'ProjectId'>` |

## 2. TypeScript compiler configuration

`tsconfig.base.json` (extended by every package) sets, non-negotiably:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2023",
    "skipLibCheck": true
  }
}
```

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are turned on deliberately even though they add friction — they eliminate an entire category of "assumed it was there" runtime bugs that are otherwise invisible until production. Never disable a strict flag in a leaf `tsconfig.json` to make a type error go away; fix the underlying type instead.

## 3. Why string-literal unions instead of TypeScript `enum`

`plan/03-domain-model.md` and `plan/13-contracts-and-boundaries.md` define status vocabularies as plain words. Represent every one of them as a `string` literal union (`'draft' | 'accepted' | ...`) with a matching Zod `z.enum([...])`, never a TypeScript `enum`:

- The value is identical to what is stored in Postgres (`text` columns, §5 of `06-database-schema.md`) and what crosses the wire in JSON — no numeric-enum serialization surprises.
- A Zod enum gives runtime validation for free; a TypeScript `enum` does not validate anything at a system boundary.
- Adding a new status is a one-line addition to the union + the Zod schema + the table in `04-shared-packages-and-design-system.md` §3 — nothing else to keep in sync.

## 4. Enforced architectural boundaries (ESLint)

`packages/config/eslint.config.mjs` configures `eslint-plugin-import`'s `no-restricted-paths` (or an equivalent boundaries plugin) to make the rules in `01-monorepo-and-project-structure.md` §7 into build failures, not code-review reminders:

```js
// shape of the rule, not the literal file
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './packages/domain', from: ['./packages/db', './packages/agent-runtime', 'postgres', 'ai'] },
        { target: './apps/web', from: ['./packages/db', './packages/agent-runtime', './packages/tools'] },
        { target: './apps/mobile', from: ['./packages/db', './packages/agent-runtime', './packages/tools', 'postgres'] },
        { target: './infra/cdk', from: ['./apps', './packages/agent-runtime', './packages/db'] },
      ],
    }],
    'no-restricted-syntax': ['error', {
      selector: "CallExpression[callee.object.name='process'][callee.property.name='env']",
      message: 'Read environment variables only through lib/env.ts (see 02-web-frontend-architecture.md §9).',
    }],
    // Forbid publicProcedure except in an explicit allowlist file (workspace.create, health checks)
  },
}
```

A PR that violates one of these rules fails CI at the `lint` step (`10-aws-infrastructure-and-deployment.md` §9's `ci.yml`) before any human review is needed.

## 5. Comment policy

Comments explain **why**, never **what**. This mirrors the general engineering rule already in force for this project: only comment what is necessary.

- Do not write a comment that restates the next line in English (`// increment counter` above `count++`).
- Do write a comment when a decision is non-obvious from the code alone: a workaround for a library quirk, a deliberate deviation from the "default" approach, a reference back to the specific `plan/` document and section that mandates a particular behavior (e.g., `// see plan/02 §6 Gate B: a waitlist signal does not count`).
- Every non-obvious business rule ported from `plan/00`–`13` into code should carry a one-line comment citing the source document/section, so a future reader (human or agent) can find the reasoning without re-deriving it.
- Do not leave commented-out code in a merged PR. Delete it; Git history is the record.

## 6. Adding a new package or app

Do not create a new top-level package on a whim. Before adding one:

1. Check whether the responsibility fits an existing package in `01-monorepo-and-project-structure.md` §6.
2. If it genuinely does not fit (e.g., a first cross-cutting concern that touches nothing existing), add it to that table and update this document and `01-monorepo-and-project-structure.md` in the same PR — the file tree documents must never drift from the real repository.
3. New packages start with the same `tsconfig.base.json`/ESLint/Vitest extension pattern as every existing package (`04-shared-packages-and-design-system.md` §7) — never a bespoke config.

## 7. Concrete limits (so nobody has to guess a number)

| Limit | Value | Where enforced |
|---|---|---|
| Max upload file size | 50 MB (documents), 200 MB (audio/video interview recordings) | `evidence.createUploadIntent` input validation |
| Max PDF pages parsed | 200 pages (beyond this, queue a manual review flag instead of failing) | `packages/document-intelligence` |
| Max code-mode execution time | 5 seconds | `packages/agent-runtime/code-mode/sandbox.ts` |
| Max code-mode memory | 64 MB | same |
| Max code-mode source size | 20 KB | same |
| Max code-mode result size | 256 KB | same |
| Max sprint workers in parallel | 3 (configurable per `SprintContract.maxWorkers`, hard ceiling 5) | `packages/agent-runtime/orchestration/worker-pool.ts` |
| Max sprint duration | 45 minutes wall clock before forced pause/stall | `packages/agent-runtime/orchestration/stall-detector.ts` |
| Max sprint budget without explicit founder approval | Workspace-configurable, default US$2 equivalent | `BudgetService` |
| tRPC read-procedure rate limit | 60/min per actor | `05-api-and-backend-architecture.md` §10 |
| tRPC mutation-procedure rate limit | 20/min per actor | same |
| Idempotency key TTL | 24 hours | `07-caching-queues-and-streaming.md` §5 |
| Better Auth session cookie cache TTL | 5 minutes (falls back to a DB session lookup after) | `09-authentication-and-security.md` §2 |
| Admin/test API-key rate limit | 30 requests/minute per key | `09-authentication-and-security.md` §2a |
| Max user MCP servers per user | 10 | `mcpServer.add` input validation |
| MCP `listTools()` probe timeout | 8 seconds | `packages/agent-runtime/mcp/mcp-bridge.ts` |
| MCP tool call timeout | 30 seconds | same |

These numbers are starting points, not eternal constants — but they must live in one named constant module per concern (not duplicated as magic numbers across files) so a future change is a one-line diff. Put them in `packages/config/src/limits.ts` and import from there.

## 8. Git and PR conventions

- Commit messages: Conventional Commits style (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`), imperative mood, focused on why over what — matches the git-commit guidance already in force for this repository.
- One logical change per PR. A PR that adds a tRPC procedure should also add its test (§ testing strategy) and, if it changes a screen, its component — not be split across three PRs that leave the app in a broken intermediate state.
- Every PR that changes the database schema must include a new, hand-written `.sql` migration file in `packages/db/migrations/` in the same PR (`06-database-schema.md` §10) — there is no generated schema file to diff instead, so a reviewer reads the actual SQL. A schema change without a migration file fails CI.
- Every PR that changes an `AgentDefinition`'s instructions or output schema must bump its `version` field (`plan/05` §9) — never edit a prompt in place under an existing version number.

## 9. Formatting

- Prettier (default config, 100-character print width, single quotes, trailing commas `all`) formats everything; ESLint does not duplicate formatting rules (`eslint-config-prettier` disables any overlapping stylistic ESLint rules).
- `pnpm format` and a pre-commit hook (via `simple-git-hooks` or `husky` + `lint-staged`) run Prettier + ESLint `--fix` on staged files only, so CI never fails on a formatting nit that could have been auto-fixed locally.

## 10. Definition of done for a feature

A feature (a tRPC procedure + its UI + its worker-side behavior, if any) is done when:

- [ ] It matches an entry in `05-api-and-backend-architecture.md` §3's procedure catalogue (or that table was updated in the same PR).
- [ ] Input/output types come from `@foundry/api-contracts` / `@foundry/domain` — no ad hoc inline types duplicating a domain concept.
- [ ] Authorization goes through `workspaceProcedure`/`projectProcedure` + `PolicyService`, never an inline role check.
- [ ] A mutation includes an idempotency key and, if it edits a versioned aggregate, an expected-version/hash field.
- [ ] Unit + integration tests exist per `11-testing-strategy.md` §2–4.
- [ ] Any new status, event type, or error code is added to the shared enum/table it belongs to (§3 above), not hardcoded as a string literal at the call site.
- [ ] Any new cost-bearing action (a new tool, a new model call) is recorded through `usage/usage-recorder.ts` (`08-agent-runtime-implementation.md` §9).
- [ ] `pnpm turbo run lint typecheck test --filter=...` passes locally before pushing.
