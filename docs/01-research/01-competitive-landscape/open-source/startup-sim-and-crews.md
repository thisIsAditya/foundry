# CrewAI simulators and research crews

These repos are the **default student/hackathon architecture**. Useful as a map of roles people intuitively want; not useful as production.

## chetas1208/Startup_sim (0 stars)

Monorepo: React + FastAPI + CrewAI + Tavily + Neo4j. Ten agents, SSE progress, AWS path (DynamoDB, S3, Lambda).

Agents in order:

1. Clarifier
2. Market research (citations)
3. Positioning (ICP)
4. MVP planner (4-week)
5. Landing copy + pricing
6. Bull investor
7. Skeptic investor
8. Moderator
9. Finance (unit economics)
10. Finalizer (GO/NO-GO + experiments)

**Steal:** stateful `StartupDossier` JSON; bull/skeptic/moderator; citations; graph of competitors.  
**Avoid:** treating a 4-week generated roadmap as a plan to execute.

## Muhammad-Saif-Ur-Rehman/Market_Research_Crew (0 stars)

Five sequential agents → 3,000–4,000 word “investor-ready” report: TAM/SAM/SOM, competitors, personas, MVP, pricing, go/no-go. Streamlit + Serper + optional Selenium.

**Steal:** the five-role split is a reasonable _research_ crew.  
**Avoid:** Selenium scraping competitors in a hosted product (ToS, legal, brittleness).

## 22CB006/startup-analyzer-crewai (1 star)

Product / Engineering / Market agents. FastAPI + Next.js. Academic structure (property-based tests). Thin domain logic.

## zenmakhlouf/autonomous-venture-capital

Toy: Founder agent invents startups; Investor agent scores and “funds.” Gemini + MCP + live dashboard. Useful as an **observability** demo (every thought is an event), not as a business tool.

## GitHub topic `startup-validation` (2026)

A swarm of Claude Code skills: “roast with 500 AI users,” GO/PIVOT/KILL reports, evidence-gated pipelines, “no AI, just public evidence” CLIs. Signal: **founders want a verdict**. Danger: simulated users are not users.

## Cross-cutting lesson

CrewAI makes it easy to name agents after departments. It does **not** make them truthful. Every serious system we studied adds something CrewAI does not give you: **search tools, file contracts, numeric gates, or a human interview requirement.**
