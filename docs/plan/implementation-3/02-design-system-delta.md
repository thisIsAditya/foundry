# Design system delta — the Gauge identity

**Implements:** D1. Extends `packages/ui/src/tokens/*.ts` and `packages/ui/src/theme.css` in place — same exported names, new values — plus one new signature component. No new styling library; Tailwind utility classes and this token layer remain the only styling approach (`00-README.md` rule 5).

## 1. Why a signature element, and what it is

The one thing every screen in this product ultimately answers is "how validated is this venture, and where in the process am I." A swept arc/dial — **the Gauge** — makes that literal: an angular sweep encodes progress (0–100, or phase 1-of-9), and its color encodes confidence state. It appears in exactly three places, each earning its use rather than decorating:

1. The Plan-drawer trigger in the shell header (`03-app-shell-and-navigation-delta.md` §2) — a small Gauge, not a flat badge.
2. The score display inside the Plan drawer itself, at full size (`06-plan-and-score-drawer-delta.md` §2).
3. A thin ambient sweep used as the running-job progress indicator inside job cards (`components/work/job-card.tsx`), replacing the current bare `.progress-track`/`.progress-fill` bar — same underlying `%` data, different rendering, so the motif reads as one instrument throughout the app rather than three unrelated widgets.

It is **not** used as generic decoration elsewhere (no gauge on marketing copy, empty states, or founder-task cards) — per `frontend-design`'s "spend your boldness in one place."

## 2. Palette — `packages/ui/src/tokens/color.ts`

Existing keys are renamed only where the old name actively conflicts with the new meaning (`statusDraft`/`statusWarning` collapse into the three-band gauge vocabulary below); every other existing key (`surface`, `surfaceRaised`, `border`, `text`, `textMuted`, `statusInfo`, `statusSuccess`, `statusDanger`) keeps its name so `packages/ui/src/status.ts`'s four `*StatusPresentation` functions compile unchanged.

```ts
export const color = {
  surface: '#F6F4EF',
  surfaceRaised: '#FFFFFF',
  border: '#E4E0D6',
  text: '#14161A',
  textMuted: '#6B6D72',
  statusDraft: '#D9A62B',
  statusWarning: '#D9663D',
  statusInfo: '#3B5BA5',
  statusSuccess: '#4C8B5D',
  statusDanger: '#C6432E',
  gaugeOrange: '#D9663D',
  gaugeAmber: '#D9A62B',
  gaugeGreen: '#4C8B5D',
  ink: '#14161A',
  paper: '#F6F4EF',
} as const;
```

`gaugeOrange`/`gaugeAmber`/`gaugeGreen` are new keys used **only** by the score-band system (D4) and the Gauge component — they intentionally duplicate the hex values of `statusWarning`/`statusDraft`/`statusSuccess` rather than being the same token, so a future change to "what color means blocked" in the generic status vocabulary never silently changes "what color means validated" in the score vocabulary, and vice versa. `ink`/`paper` are named aliases for `text`/`surface` used specifically in dark-surface contexts (the composer's empty-state hero, §`04`) where "ink on paper" reads more precisely than "text on surface."

`packages/ui/src/theme.css` is updated with matching `--color-*` CSS variables in the same pass (file header already says "keep in sync").

## 3. Typography — `packages/ui/src/tokens/typography.ts` and font loading

Three roles, per `frontend-design`'s guidance to avoid a single overworked family:

| Role | Family | Used for |
|---|---|---|
| Display | Space Grotesk | Page titles, the score number, phase eyebrow labels, drawer headers |
| Body/UI | IBM Plex Sans | Paragraphs, chat bubbles, buttons, form labels, nav labels |
| Data | IBM Plex Mono | Score values inside the Gauge, cost figures, timestamps, citation IDs, phase index ("03 / 09") |

Loaded via `next/font/google` in `apps/web/app/layout.tsx` (the existing font-loading mechanism — no new dependency), exposed as CSS variables (`--font-display`, `--font-sans`, `--font-mono`) and mirrored in `packages/ui/src/tokens/typography.ts` as string constants so non-Next.js consumers (tests, Storybook if ever added) reference the same names. `fontSize`/`fontWeight` scales in `typography.ts` are unchanged — this is a family swap, not a new scale.

## 4. The `Gauge` component — `packages/ui/src/gauge.tsx` (new)

```ts
export type GaugeBand = 'early' | 'developing' | 'validated' | 'unscored';

export function scoreBandOf(overall: number | null): GaugeBand {
  if (overall === null) return 'unscored';
  if (overall < 40) return 'early';
  if (overall < 75) return 'developing';
  return 'validated';
}

export function gaugeBandPresentation(band: GaugeBand): { label: string; colorToken: ColorToken } {
  switch (band) {
    case 'early': return { label: 'Early — mostly assumptions', colorToken: 'gaugeOrange' };
    case 'developing': return { label: 'Developing — real gaps remain', colorToken: 'gaugeAmber' };
    case 'validated': return { label: 'Validated — evidence-backed', colorToken: 'gaugeGreen' };
    case 'unscored': return { label: 'Not scored yet', colorToken: 'textMuted' };
  }
}
```

`Gauge` itself is a presentational SVG component (`{ value: number | null; size: 'sm' | 'lg'; label: string }` props) rendering an arc (not a full circle — a ~270° sweep, so it reads as an instrument dial rather than a generic donut chart) filled proportionally to `value` in the color from `gaugeBandPresentation`. `size="sm"` is the shell header trigger; `size="lg"` is the Plan drawer's headline score. Both call sites pass `value={score.getCurrent().overall}` — the component itself does no data fetching, matching every other `packages/ui` primitive (`StatusPill`, `Badge`, `ProgressBar`, `BudgetGauge` — the existing `BudgetGauge` is a naming precedent for this exact "gauge" word, confirmed reused not duplicated).

The job-card ambient sweep (§1 item 3) reuses `Gauge` with `size="sm"` and `colorToken="statusInfo"` (running work is a neutral/structural state, not a confidence-band state — it never borrows `gaugeOrange`/`gaugeAmber`/`gaugeGreen`).

## 5. What does not change

`StatusPill`, `Badge`, `ProgressBar`, radius tokens (`radius.ts`), spacing tokens (`spacing.ts`), and motion tokens (`motion.ts`) are reused exactly as-is (`implementation-v2/06-web-frontend-ia-delta.md` §9's "no new visual primitives" rule still holds). `sectionStatusPresentation`, `artifactStatusPresentation`, `businessModelSectionStatusPresentation`, and `productJobStatusPresentation` in `packages/ui/src/status.ts` keep their exact signatures and only pick up the new hex values transitively through `color.ts` — no call site changes.
