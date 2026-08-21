# BusinessGenerator reset plans

**Status:** current implementation-planning index
**Date:** 22 August 2026
**Scope:** Transition from the legacy custom multi-agent implementation to a
founder-controlled journey, versioned business record, and one co-founder.

## Current direction

BusinessGenerator is a place where a founder documents an idea, progresses
through small meaningful steps, retains context over time, and leaves with a
presentable business model plus a clear validation experiment.

The application owns the state machine, business record, provenance, policy,
approval, and audit. The co-founder is an assistive interface to that state,
not its authority. There are no app-defined sub-agents, specialist teams,
conference loops, critic agents, or worker pools.

DeepSeek Harness is a later, conditional `CofounderRuntime` implementation. It
must be isolated and stripped of its local coding-agent capabilities; it is not
safe or aligned to embed unchanged.

## Read in this order

1. [Product reset](../02-product-requirements/00-product-reset.md)
2. [Shared founder-journey requirements](../02-product-requirements/01-shared-product-requirements.md)
3. [Product reset and migration](14-product-reset-and-migration.md)
4. [Current-state and retirement inventory](15-current-state-and-retirement-inventory.md)
5. [DeepSeek Harness evaluation](16-deepseek-harness-evaluation.md)
6. [Canonical journey and business model](17-canonical-journey-and-business-model.md)
7. [Implementation contracts and cleanup runbook](18-implementation-contracts-and-cleanup.md)

## Delivery order

1. Freeze legacy expansion and protect migration data.
2. Establish one authoritative journey and accepted business-record contract.
3. Ship the web journey shell, record, evidence, and proposal-review flow.
4. Add one co-founder through application-owned contracts.
5. Remove the legacy agent/sprint implementation after replacement paths pass.
6. Run a DeepSeek Harness adapter proof of concept.
7. Add bounded integrations and native mobile capabilities only after the
   foundation is stable.

## Historical plans

The following material remains useful as evidence of previous decisions, but is
not implementation authority:

| Location | Status | Use |
| --- | --- | --- |
| `00`–`13` | Superseded | Retain domain, security, and infrastructure ideas only when the current plans explicitly preserve them |
| `implementation/` | Historical | Reference for the existing codebase and infrastructure inventory |
| `implementation-v2/` | Historical | Reference for prior product-direction changes; do not extend its job/sprint model |
| `implementation-3/` | Historical | Reference for UI implementation detail; reconcile every item with current requirements first |

The corresponding research archive retains business-framework and human-ownership
insights. Its multi-agent architecture and company-operations runtime are
historical only.
