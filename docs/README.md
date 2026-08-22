# BusinessGenerator documentation

## Current authority

The founder-journey requirements and reset plans are the only current product
and architecture direction:

1. [Product requirements](02-product-requirements/README.md)
2. [Product reset](02-product-requirements/00-product-reset.md)
3. [Product reset and migration](plan/14-product-reset-and-migration.md)
4. [Current-state and retirement inventory](plan/15-current-state-and-retirement-inventory.md)
5. [Canonical journey and business model](plan/17-canonical-journey-and-business-model.md)
6. [DeepSeek Harness evaluation](plan/16-deepseek-harness-evaluation.md)
7. [Implementation contracts and cleanup runbook](plan/18-implementation-contracts-and-cleanup.md)
8. [Implementation v4](plan/implementation-v4/00-README.md)

These documents replace the custom multi-agent, Magentic-style orchestration
direction. The application owns state, approvals, and policy; DeepSeek Harness
is an optional later runtime behind that boundary.

## How to use the remaining documents

| Location                                                                        | Status                              | Use                                                                                             |
| ------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `01-research/01-competitive-landscape/`                                         | Dated research                      | Retain facts and product insights; verify time-sensitive claims before using them               |
| `01-research/02-idea-to-business-process/`                                      | Background research                 | Use frameworks and validation principles; do not treat the 26-step map as the v1 workflow       |
| `01-research/03-agent-architecture/`                                            | Historical                          | Do not implement its agent roster, conference loop, or operations runtime                       |
| `02-product-requirements/00`–`05`                                               | Current                             | Product boundary, shared journey, platform requirements, and delivery slices                    |
| `plan/00`–`13`                                                                  | Superseded                          | Reference only where the reset inventory explicitly retains a technical or domain concept       |
| `plan/implementation-v4/`                                                       | Current implementation plan         | Execute the reset through its contracts, migration, web, co-founder, Harness, and release plans |
| `plan/implementation/`, `plan/implementation-v2/`, and `plan/implementation-3/` | Historical implementation inventory | Do not build from these specifications without reconciling them with the reset                  |

## Product boundary

BusinessGenerator helps founders document and progress from an idea to a
presentable business model through a stateful, founder-controlled journey. It
uses one AI co-founder. The app owns business state, provenance, policy, and
approvals.

It does not build or operate a custom sub-agent system, autonomous agent team, or company-operations platform.
