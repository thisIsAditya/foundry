# Document intelligence and knowledge layer

## 1. Objective

The app must be able to use founder-provided and externally discovered material without treating all text as equally trustworthy.

Supported first-class inputs:

- PDF;
- HTML and web pages;
- plain text and Markdown;
- JSON and JSON-like API responses;
- CSV and spreadsheet files;
- DOCX;
- PPTX;
- images and scanned documents through OCR.

The system should preserve the original file, create a normalized representation, and keep precise locators so a founder can inspect the exact evidence used in a conclusion.

## 2. Direct reading versus retrieval

Use a routing decision rather than forcing every file through RAG.

| Situation | Preferred method | Reason |
|---|---|---|
| Small text or HTML document | Direct reading with selected content | Lower latency and less retrieval loss |
| Small JSON or structured table | Parse into typed records and use deterministic filters | Preserve fields, units, and relationships |
| Large document | Hybrid retrieval over normalized blocks | Avoid overflowing context |
| Many related documents | Workspace/project retrieval with metadata filters | Support source comparison and deduplication |
| Financial or market data | Parse tables and calculate outside the model | Prevent arithmetic and transcription errors |
| Slide or spreadsheet generation | Use canonical data and a template | Do not ask a model to invent cell or slide values |
| Image or scanned PDF | OCR plus visual/table extraction | Preserve page and region references |
| Repeated questions over a stable source set | Cached index and source snapshots | Reduce cost and ensure reproducibility |

RAG is a retrieval strategy, not a truth guarantee. Retrieved content must still carry source identity, timestamp, and provenance.

## 3. Ingestion pipeline

### Step 1: Intake

Create an upload or fetch intent with:

- project and workspace scope;
- original filename or URL;
- user purpose;
- expected content type if known;
- retention and sensitivity classification;
- consent or authorization status for external content.

### Step 2: Safety and normalization

Before model access:

- verify size and declared MIME type;
- inspect file signature;
- scan for malware;
- reject unsupported or suspicious archives;
- normalize encoding;
- strip active content where possible;
- isolate macros and embedded executable content;
- record the original hash;
- mark external content as untrusted.

### Step 3: Format extraction

Create a normalized document with ordered content blocks:

- paragraph;
- heading;
- list;
- table;
- table cell;
- figure or image;
- code/data block;
- metadata;
- page or slide boundary;
- workbook sheet and cell range.

Preserve the original locator for every block.

### Step 4: Structured extraction

Run specialized extractors only when useful:

- tables and numeric values;
- names and organizations;
- dates and jurisdictions;
- claims and citations;
- assumptions and forecasts;
- competitor references;
- financial inputs;
- interview quotes;
- action items.

Extraction output is a proposal. It must carry confidence and block references.

### Step 5: Indexing

Create:

- full-text index;
- vector embeddings where the model and privacy policy allow;
- metadata index for project, source, date, geography, document type, section, and sensitivity;
- parent-child block relationships;
- table-aware records;
- deduplication fingerprints.

Do not embed secrets, access tokens, or restricted personal data into a shared index.

### Step 6: Review and citation

The Evidence Librarian or a review flow converts extracted content into:

- accepted evidence;
- unverified candidate evidence;
- founder assertion;
- irrelevant material;
- redacted material.

The user should be able to open the source at the cited page, paragraph, URL fragment, slide, sheet, or cell range.

## 4. Retrieval contract

Every retrieval request should specify:

- project/workspace scope;
- source allowlist or denylist;
- query;
- required evidence type;
- date range;
- jurisdiction;
- maximum result count and token budget;
- whether unverified sources are allowed;
- desired citation granularity.

Every retrieval result should return:

- source and snapshot IDs;
- title and type;
- matching block;
- locator;
- relevance score;
- freshness;
- provenance;
- redaction state;
- content hash;
- a note if the match is derived rather than verbatim.

The model must not receive “orphan text” without source metadata.

## 5. Web research

Web research is a controlled tool flow:

1. Search for candidate sources.
2. Record the query and result metadata.
3. Fetch selected pages.
4. Wrap fetched content as `UNTRUSTED_WEB_CONTENT`.
5. Parse and snapshot the page.
6. Extract claims with locators.
7. Register accepted citations.
8. Run groundedness and freshness checks.

External pages are data, not instructions. A page may contain prompt injection, hidden instructions, malicious links, or misleading claims. The fetching tool must never grant the page authority over agent policy.

Research tools must not:

- scrape authenticated services without explicit authorization;
- bypass robots, access controls, or terms;
- treat a directory count as market size;
- treat a search snippet as a verified fact;
- cite a URL that was not fetched or checked;
- silently use a newer source than the one recorded in an artifact.

## 6. Interview and founder-provided evidence

Interviews are different from web research.

Store:

- participant pseudonym or permitted identifier;
- consent status;
- date and timezone;
- interview context;
- transcript or notes;
- quote boundaries;
- Mom Test lint findings;
- pain/workaround tags;
- decision-maker hints;
- requested follow-up;
- deletion policy.

The app may coach, transcribe, summarize, and lint. It must not count simulated conversations as customer evidence or impersonate the founder in a live interview.

## 7. Numeric and financial extraction

Numbers require special handling.

For every extracted number, retain:

- original text;
- normalized decimal;
- unit;
- currency;
- tax inclusion;
- time period;
- geography;
- formula or transformation;
- source locator;
- provenance;
- assumption relationship;
- extraction confidence;
- reviewer status.

A number without unit and time window is incomplete. “Market size: 10 million” is not an acceptable canonical value.

Use deterministic computation for:

- market-size multiplication;
- currency conversion;
- price and margin calculations;
- LTV/CAC and payback;
- sensitivity matrices;
- spreadsheet formulas;
- reconciliation checks.

## 8. Context assembly

The context builder should assemble a task-specific packet:

1. Current phase and sprint contract.
2. Relevant pack sections.
3. Open assumptions related to the task.
4. Selected evidence and citations.
5. Prior decisions that constrain the task.
6. Tool descriptions allowed for the task.
7. Output schema and quality checks.
8. Data handling restrictions.

It should not send the whole company history for every turn. Summaries and references are preferred; the source can be fetched when needed.

## 9. Retrieval quality controls

Evaluate retrieval separately from generation:

- recall of required source passages;
- precision of cited passages;
- table and unit preservation;
- source freshness;
- duplicate and contradictory source detection;
- citation locator correctness;
- redaction correctness;
- cross-document comparison quality.

When retrieval is weak, the answer should say that evidence is insufficient rather than produce a polished synthesis.

## 10. Deletion and retention

Deletion must operate across:

- original object;
- parsed document;
- content blocks;
- embeddings;
- search index;
- cached context;
- generated artifacts that quote the deleted source;
- audit references.

If a deleted source supports an accepted decision, the decision should retain a redacted provenance record and be marked as requiring review. The app should not silently preserve private content in a generated PDF or slide deck.

## 11. Document outputs

The knowledge layer provides structured inputs to the artifact system:

- claim list;
- evidence list;
- citation map;
- tables;
- assumptions;
- source bibliography;
- change summary;
- stale dependencies.

The document renderer, not the language model, owns final pagination, cell placement, slide layout, and file packaging.
