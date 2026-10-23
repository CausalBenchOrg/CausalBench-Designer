# CausalBench Designer refresh handoff

Updated: 2026-10-23 (America/Phoenix).

## Objective and authorization

Update the existing designer to match the CausalBench design in [`cb-docs/`](cb-docs/), focusing on context authoring, validation, and export for local Python execution.

The user originally requested staged approvals. On 2026-10-22, after being asked whether to keep those checkpoints, the user explicitly selected **“Proceed through the full refresh.”** This supersedes the earlier per-stage approval workflow. The source refresh is implemented. Live catalog and real-data execution evidence is recorded below; deployment remains a separate activity.

The user subsequently requested **Show task composition** as a local switch in section 02, restoration of the experimental Blueprint editor in the top bar, and a revision plan while retaining the current visual style. This follow-up restores the canvas interactions and shared configuration workflow. The task-aware blueprint revision below is planned work.

## Current state

| Item | State |
| --- | --- |
| Application refresh | Implemented across the eight planned areas; see the delivery record below. |
| Shared draft | Typed domain model and root store used by both routes; navigation retains applied state in memory. |
| Authoring | Exact task versions, arbitrary mappings, alias reuse, isolated edits, typed overrides, explicit configurations, and scenario previews. |
| Open existing contexts | Registry version picker, local YAML/JSON/ZIP and paste; preview before replacement, full recipe restoration, unresolved-reference editing, and fresh blueprint nodes. |
| Validation/export | Shared validator; exact previews and Python/YAML downloads targeting `causalbench-asu==0.2.5`. Unknown required metadata blocks export. |
| Registry/session | Authenticated catalog fetches verified for all four kinds. Live identity requirements and stable pagination fixed; missing task/alias/version metadata remains unknown until supplied from packages. |
| Dependencies | Framework/toolchain retained. Context import adds pinned `yaml@2.9.1` and `fflate@0.8.2` with a matching lockfile. |
| Production build | Passed outside tracked `docs/`, without warnings. |
| Tests | 61 headless Chrome checks passed; four independent export fixtures, connected-Chrome QA, and a separate real Sachs execution passed. Automated fixtures use synthetic identities. |
| Visual review | Complete through the user-enabled Chrome extension: desktop/narrow layouts, both themes and routes, metadata authoring, mappings, typed edits, Apply/Cancel, dialogs, exports, and real registry selections. |
| Theme | Top-bar light/dark control; semantic palette across forms/dialogs/canvas. System default and stored explicit preference; storage failures do not block switching. |
| Publication/deployment | Not performed. `docs/` and supplied `cb-docs/` remain unchanged. |
| Git baseline | `a9effca` (`Merge pull request #5 from CausalBenchOrg/1.1h-Indev`). |

At session start, README was modified and HANDOFF plus `cb-docs/` were untracked user-supplied work. Documentation was updated within the authorized refresh; supplied CB docs were preserved. Nothing was staged or committed.

## Source of truth and unresolved contracts

Use these supplied sources:

- [Concepts](cb-docs/docs/concepts.md): experiment structure and package/repository boundaries.
- [Contexts and runs](cb-docs/docs/contexts.md): selection, scenario expansion, serialized contexts, and Python creation.
- [Tasks](cb-docs/docs/modules/tasks.md): required named inputs, runtime types, helpers, and exact task identity.
- [Datasets](cb-docs/docs/modules/datasets.md): file aliases, formats, and semantic indexes.
- [Models and metrics](cb-docs/docs/modules/models-metrics.md): manifests, defaults, and parameter values.
- [Python API](cb-docs/docs/api.md) and [reproducibility](cb-docs/docs/reproducibility.md): local execution and publication lifecycle.

The docs identify `causalbench-asu` 0.2.5 as their checked package, but several authoring examples retain 0.2.4 language and older build values. Record the intended full compatibility version explicitly; do not copy an example build number blindly. Loading compatibility compares major/minor, while registry component versions are separate identities.

The supplemental examples cover different tasks and do not form one interchangeable benchmark. The supplemental model manifest also lacks the `causalbench` block required by the documented schema. Keep original examples intact; derive separate, clearly identified fixtures where corrections are needed. Registry IDs in examples are point-in-time references, not guaranteed assets available to the current account.

The original audit identified two questions before claiming automatic task-driven authoring. Successful catalog shapes are now observed, but complete backend task/alias/version descriptors remain absent; see the live-data follow-up below.

1. **What does the registry return today?** `cb-docs/docs/api.md` documents Python classes, not the REST fetch endpoints or web descriptor shapes used by the designer. Verify sanitized representative responses for task references, exact versions, dataset aliases/formats, defaults, errors, and pagination before changing request assumptions.
2. **How can the browser obtain task contracts?** Required inputs are defined by the Python methods `model_data_inputs()`, `metric_data_inputs()`, and `metric_model_inputs()`, not by the task YAML alone. Check for supported serialized metadata in registry detail responses. If absent, record a backend descriptor dependency or propose an explicit imported/manual descriptor fallback. Do not infer arbitrary contracts from task names, and do not execute contributed Python in the browser.

When metadata is insufficient, distinguish an unknown check from a passed check. Browser metadata checks cannot prove runtime output types, dataset contents, or scientific suitability; the Python execution remains authoritative for runtime contracts.

## Required context behavior

| Area | Required behavior |
| --- | --- |
| Task | Exactly one task reference; model and metric references must match its ID and version. |
| Component identity | Pin registry ID and version. Keep a configuration entry's local identity separate from the module identity. |
| Dataset mappings | Map every required dataset-derived task input to a real dataset file alias. Support arbitrary input names and alias reuse. |
| Formats | `dataframe` loads as `SpatioTemporalData`; `graph.static` and `graph.temporal` load as `SpatioTemporalGraph`. Preserve format distinctions without inventing a stricter runtime class rule. |
| Model outputs | Names must match the task's metric-model inputs; the documented context does not rename outputs. |
| Settings | Manifest declarations contain `data`/`value`; context entries contain direct values. Keep defaults separate from explicit overrides and reject unknown override names. |
| Values | Preserve supported null, scalar, array, and object values, including `false`, `0`, empty strings, quotes, backslashes, and multiline text. |
| Configurations | Explicit model configurations create separate entries/scenarios. Do not treat a range expression as an automatically expanded search. |
| Expansion | Scenarios = dataset entries × model configuration entries. Metric evaluations = scenarios × metric configuration entries. |
| Lifecycle | The browser authors the recipe; Python executes locally and returns an unpublished run. Publication is a separate explicit operation. |

For example, two dataset entries, three model configurations, and four metric configurations produce six scenarios and 24 metric evaluations.

The Python creation API accepts `task=Task(...)`, `datasets=[(Dataset(...), mapping)]`, `models=[(Model(...), overrides)]`, and `metrics=[(Metric(...), overrides)]`. Empty override dictionaries select defaults. YAML context entries use IDs/versions, dataset `mapping`, and direct `hyperparameters` values.

The checked `Context.create` behavior validates override names, but does not enforce manifest-declared parameter data types. Type-aware designer controls should preserve intended values without claiming that CB already performs those checks.

## Architecture

- `src/app/domain/context.ts`: shared references, descriptors, configuration entries, legacy adapters, scenario counts, and field-specific validation.
- `src/app/domain/descriptors.ts`: explicit registry normalization and manual JSON metadata fallback; no contributed Python execution.
- `src/app/domain/serialize.ts`: validated normalized context data, recursive safe Python literals, and YAML flow values compatible with Python's loader.
- `src/app/domain/context-import.ts`: strict saved-context catalog adapter and recipe hydration with exact references, stable local identities, and ordered configuration grouping. `context-reader.ts` lazily loads YAML/ZIP parsing and validates supported recipe fields before hydration.
- `ContextStore`: root-scoped applied draft plus opened-source identity. Descriptors, entries, and temporary editor snapshots are deep copied; late exact catalog metadata preserves author edits.
- `ThemeService`: system appearance on first visit, local-storage preference on later visits, and root theme attribute. Shared CSS variables theme all active UI surfaces without changing domain data.
- `CatalogService`: shared per-kind loading/error/catalog state and token/request lifecycle. `ApiService` handles configurable registry requests and pagination.
- `ContextLibraryService`: lazy saved-context listing, stable pagination, authenticated exact-version download, and session cancellation. `OpenContextComponent` handles file/paste input, preview, and explicit safe replacement.
- `ContextDesignerComponent`: catalog, recipe, validation, and editing workflow. `SidebarComponent`: isolated mapping and typed parameter editor.
- `ContextViewComponent`: component cards and task wiring, toggled locally by **Show task composition** in section 02.
- `NodeEditorComponent`: restored SVG Blueprint canvas inside the shared designer shell at `/node-editor`. `BlueprintStore` retains node identities, positions, sketch edges, selection, and viewport in memory. Applied nodes reference the canonical draft; sketch connections and processor notes remain presentation data and are excluded from export. Unconfigured dataset/model/metric placeholders block blueprint export.
- `ExportDialogComponent`: native modal dialog with exact Python/YAML preview and guarded downloads. `TokenService` validates origin, opener source, and payload before accepting tokens.

Context import is implemented in the follow-up below. Automatic draft persistence is deferred; both routes preserve the applied draft only while the application remains loaded. The older unused dataset/model/metric list component files remain in the repository but are no longer declared by the active application module.

### Initial audit findings (historical)

The table below records the original evidence, including methods/storage shapes that have since been replaced. Delivered behavior and remaining dependencies are recorded at the end.


| Finding | Source locations / evidence | Planned step |
| --- | --- | --- |
| Compatibility checks compare task ID without task version. The sidebar does not receive the selected task version. | `taskMatches` in context view, sidebar, export dialog, and node editor; main template input bindings. | 2, 4 |
| Mapping inputs are fixed to `data` and `ground_truth`; export invents `file1`/`file2` defaults. | Sidebar mapping controls; export dialog `onExport`. | 4, 6 |
| Mapping storage differs: main sidebar saves `generic_data`/`generic_ground_truth`; canvas saves `data_file`/`ground_truth_file`; exporter reads the main shape only. | Sidebar `onApplyItem`; node editor `onApplyConfiguration`; export dialog `onExport`. | 2, 4, 7 |
| Edited parameters are stored as strings, so numeric overrides can export as quoted strings. Null/empty values are dropped; boolean and structured Python literals are not handled intentionally. | Sidebar `updateHyperparameterValue`; canvas parameter handler; export parameter loops. | 5, 6 |
| Python name/description interpolation is unescaped; missing task defaults to `Task(1,1)`; the export button only checks name. Entries may be silently filtered out. | Export dialog `getTaskExportExpression`, filtering, `onExport`, and template. | 6 |
| Temporary parameter edits can mutate applied state through shared nested objects. | Sidebar `loadExistingHyperparameterSets`; canvas parameter-set copies. | 2, 5 |
| Duplicate ID/version rejection conflicts with representing separate configurations as separate entries. Existing parameter sets already provide some expansion and must be preserved or deliberately migrated. | Main designer `isDuplicateItem`; export dialog parameter-set loops. | 2, 5 |
| Canvas edges/processors are excluded from export; generic DAG wiring implies behavior absent from the documented context schema. | Canvas `getExportDatasets`, `getExportModels`, `getExportMetrics`, and processor controls. | 7 |
| Canvas node IDs use `Date.now()` and may collide during rapid/example-node creation. | Canvas node creation and `addExampleNodes`. | 7 |
| API failures become empty arrays; request bodies have static user IDs and inconsistent page limits. | API service request constants and `catchError` handlers. | 1, 3 |
| Absent opener is dereferenced after redirect; invalid-origin/missing-token paths continue toward token storage. Source validation and listener lifecycle need review. | Token service `loadToken`. | 3 |
| Catalog/task subscriptions and repeated requests lack a shared lifecycle. | Both editors and context view initialization. | 2, 3 |
| Build output defaults to tracked `docs/`; configured `src/favicon.ico` is absent. | `angular.json` build/test assets and output path. | 1, 8 |

## Original staged implementation plan

The following plan was implemented under the later full-refresh authorization. Acceptance notes below describe the intended gates; the delivery record distinguishes fixture evidence from unavailable live evidence.

### Step 1 — Confirm contracts and establish a baseline

- Record Node/npm versions, dependency installation outcome, build outcome, and available test/browser tooling. Do not begin a framework upgrade as part of the baseline.
- Build to an isolated temporary output path so existing `docs/` assets remain reviewable.
- Check the missing favicon asset's actual impact and record any pre-existing failures.
- Establish fixture sources and the intended CB compatibility version, keeping corrected fixtures separate from supplied docs.
- Verify available REST schemas and identify the supported source for browser-readable task input/type metadata. Track unavailable authenticated/backend evidence explicitly.

**Acceptance:** reproducible baseline results and a contract/metadata decision record. Unverified API details are marked unresolved, with a concrete dependency or fallback proposal; no inferred schema is presented as confirmed.

### Step 2 — Introduce a shared context model

- Define typed task/component references, context entries, dataset alias mappings, parameter declarations, and override values.
- Separate registry descriptors, applied draft state, and temporary editor state. Give configuration entries stable IDs independent of registry ID/version.
- Migrate the main designer to the shared model, with adapters at the registry/UI boundaries. Leave canvas migration to step 7.
- Preserve existing parameter sets during migration and isolate Apply/Cancel edits.

**Acceptance:** fixtures preserve all selections, versions, mappings, and values; distinct configurations can refer to the same module version; cancelling an edit does not mutate applied state. Internal migration preserves the existing main workflow while later behavior fixes remain tracked.

### Step 3 — Repair registry and authentication handling

- Implement request/response adapters against verified contracts and make API configuration explicit.
- Resolve hardcoded user assumptions and pagination using supported API behavior.
- Distinguish loading, empty, failed, and unauthorized responses; expose useful retry/session recovery behavior.
- Correct opener checks, message origin/source/payload validation, timeout cleanup, and token/subscription lifecycle.

**Acceptance:** representative response fixtures normalize correctly, pagination does not truncate catalogs, and failures are visible. Session checks cover absent opener, accepted and foreign messages, invalid payloads, timeout, and expired credentials. Report whether live integration was exercised separately from mocked checks.

### Step 4 — Make selection and mappings task-driven

- Enforce exact task ID/version for the selected component version throughout selection, editing, validation, and export preparation.
- Revalidate existing entries when the task changes; retain affected entries with explanations rather than silently dropping them.
- Generate required dataset input mappings from the agreed contract metadata source. Select actual aliases with available format metadata and allow alias reuse.
- Distinguish metadata incompatibility, incomplete information, and checks that require runtime execution.

**Acceptance:** same task ID with a different version is rejected; arbitrary input names and one-file/multiple-input mappings work; missing aliases/required inputs and observable format mismatches are reported. No task-name or physical-filename guessing substitutes for missing metadata.

### Step 5 — Correct parameter editing and scenario previews

- Use type-aware controls and explicit structured-value editing where needed. Show defaults separately from overrides and preserve explicit nulls.
- Support multiple configurations of one module version without a blanket duplicate prohibition. Repeating an individual parameter value across configurations is valid.
- Calculate previews from the actual expanded model and metric entries, including existing parameter sets.

**Acceptance:** `0`, `false`, null, empty strings, numeric values, collections, and quoted/multiline strings retain their values and types. Unknown settings fail clearly; Apply/Cancel remains isolated. The 2 × 3 × 4 example displays six scenarios and 24 evaluations.

### Step 6 — Rebuild validation and export

- Extract shared validation and serializers from the dialog. Present field-specific errors and an export preview of the exact context.
- Generate Python using the documented tuple API and safe recursive literal serialization; produce canonical context YAML with the agreed compatibility block.
- Remove guessed task references, invented alias mappings, and silent selection filtering. Make incomplete drafts visibly incomplete.
- Explain local execution/dependency requirements and keep publication an explicit separate choice.

**Acceptance:** generated Python parses; inspected literals preserve configured values. YAML parses and round-trips through the serializer's normalized data representation without semantic loss. Missing task, invalid identities/mappings, and invalid overrides prevent a supposedly valid export. Authenticated execution is an optional separately recorded smoke check, not a substitute for serialization checks.

### Step 7 — Align both interfaces with the CB model

- Connect the experimental canvas to the same context model, validation, and export behavior as the main designer.
- Make visual connections represent supported task wiring and context composition. Remove or redesign processor controls so unsupported behavior is not implied.
- Use stable unique canvas IDs and keep presentation coordinates separate from executable configuration.
- Update labels, help, version displays, and core keyboard interactions to match the supported workflow.

**Acceptance:** equivalent contexts in both interfaces produce equivalent exports; visible wiring matches supported mappings; rapid node creation is collision-free. This step does not implicitly add durable draft persistence or a generic pipeline engine.

### Step 8 — Verify and prepare release changes

- Run focused contract, session, mapping, configuration, serializer, and scenario-count checks accumulated during earlier steps.
- Smoke-test the complete browser flow, including validation recovery and exported artifacts. Use static/temporal discovery and a separate one-file supervised mapping fixture where metadata permits.
- Build production output outside tracked `docs/` for review first; resolve or explicitly report build failures and warnings.
- Update the README and this handoff with final behavior, setup, compatibility, and evidence. Prepare generated deployment artifacts as a distinct reviewable change.

**Acceptance:** checks and remaining limitations are recorded; generated artifacts are reviewed; deployment/publication occurs only under the user's applicable authorization.

## Validation and development commands

Run from the repository root:

```sh
node --version
npm --version
npm ci
npm run build -- --output-path /tmp/causalbench-designer-build
npm test -- --watch=false --browsers=ChromeHeadless
```

A compatible runtime and installed Chrome are needed. Tests now exercise the implemented contracts and browser flow. Use the lockfile without opportunistic dependency upgrades. `npm run test:exports` additionally requires Python 3 and PyYAML; it inspects generated Python without importing/executing contributed components and compares typed YAML semantics.

Additional checks should be tied to the change:

- Normalize sanitized API responses and documentation-derived fixtures, including malformed/missing metadata cases.
- Parse generated Python without importing or executing contributed component code; inspect values as well as syntax so quoted numbers cannot pass unnoticed.
- Parse YAML and compare normalized context semantics, preserving entry counts and types. This serializer check does not require adding a user-facing import feature.
- Exercise the relevant browser interactions and inspect console/network errors. Record when only fixture-driven behavior was tested.
- Avoid using live registry IDs as deterministic test fixtures. Do not publish contexts/runs to validate the designer.

## Deferred scope

Automatic draft persistence, canvas layout save/restore, local ZIP authoring, component package editors, browser/server execution, registry write-back, and run dashboards require later scoped work. Reading existing context ZIPs is implemented; producing component archives is separate. A framework/toolchain upgrade is also a separate decision if needed.

## Resume checklist

1. Recheck the worktree and read this delivery record plus [CONTRACTS.md](CONTRACTS.md).
2. Preserve user-supplied `cb-docs/` and tracked `docs/` assets; do not deploy as part of a routine build.
3. For registry integration, obtain sanitized authenticated task/model/metric/dataset responses, explicit pagination behavior, exact task references, and the backend source of task input contracts. Update adapters only against that evidence.
4. Exercise the production app visually when computer-use/browser access is available. Keep fixture tests distinct from authenticated runtime execution.
5. Release preparation is a separate review: build into an isolated location, review artifacts and hosting configuration, then use the user's applicable deployment authorization.

## Delivery record — 2026-10-22

**Authorization:** the user's “Proceed through the full refresh” reply authorized all implementation stages without intermediate approval pauses.

| Step | Delivered behavior and evidence | Remaining limits |
| --- | --- | --- |
| 1 — Baseline/contracts | Node 24.12.0, npm 11.6.2, Angular CLI 17.3.17, TypeScript 5.2.2. Lockfile install added 893 packages. Baseline isolated production build passed at 447.68 kB with pre-existing optional-chain/style warnings. Missing favicon did not fail the baseline builder. Contract decisions recorded in CONTRACTS.md. | The first sandboxed probe failed DNS. A later unauthenticated probe outside the sandbox reached `/api/tasks/fetch` and returned HTTP 401 with the denied-session envelope; no authenticated live descriptor schema was obtained. |
| 2 — Shared model | Stable local entry/configuration IDs separate from registry identities; deep copies isolate temporary and applied state. Legacy mapping layouts and wrapped parameter sets have an explicit tested adapter. Multiple entries may pin the same module version. Both routes share a root store. | Reload persistence remains deferred. There was no prior persisted draft format to load automatically. |
| 3 — Registry/session | Removed static user IDs and forbidden browser request headers. Explicit endpoint/configuration adapter; pages continue until empty with repeat/limit/timeout failures. Shared catalog lifecycle, empty/error/denied states, retry and reconnect. Session source/origin/payload checks and timer/listener cleanup tested. | Successful catalog descriptor/envelope shapes and empty-page pagination remain defensive legacy assumptions; the tasks endpoint and HTTP 401 denial envelope were observed without authentication. A supported backend contract is still needed for live verification; fixture checks do not establish it. |
| 4 — Task selection/mappings | Exact ID/version matching; incompatible selections rejected and existing affected entries retained with errors. Task contract drives arbitrary dataset inputs. Actual manifest aliases are selectable and reusable; static/temporal graph formats retain distinctions while sharing the runtime graph type. Missing contract evidence is unknown and blocks validated export. | Manual descriptors are an explicit fallback; the author must verify them against actual manifests/task implementation. Model output types/keys are runtime checks. |
| 5 — Parameters/scenarios | Defaults separate from overrides; controls preserve zero, false, null, empty/quoted/multiline strings, collections, and numbers. Multiple explicit configurations and repeated values allowed. Unknown settings and malformed edits are actionable. 2 × 3 × 4 yields six scenarios and 24 evaluations. | Number inputs use JavaScript numeric precision; integer controls require safe integers. Designer type checks are not attributed to Python Context.create. |
| 6 — Validation/export | Shared field-specific validation; exact Python/YAML preview and guarded download. Safe recursive literals; documented tuple API. No guessed tasks, invented aliases, dropped values, or silent filtering. YAML targets CB 0.2.5; scientific notation is numeric under PyYAML and negative zero is preserved. | No authenticated component download or Python context execution performed. Local execution and publication remain distinct. |
| 7 — Interface alignment (initial delivery) | Both routes use the same draft/editor/validator/serializers. Composition shows supported alias wiring and model output keys; arbitrary edge/processor controls were removed in this delivery. UUID/counter identities replace timestamps. Native controls and modal dialogs support keyboard focus and Escape. | The route/canvas decision is superseded by the Blueprint restoration below. No generic pipeline execution was introduced. |
| 8 — Verification/release preparation | Production build isolated from deployment output; default builds now use ignored `dist/causalbench-designer`. Removed missing favicon reference and pre-existing style/template warnings. README/handoff updated; focused checks described below. | Existing `docs/` deployment artifacts intentionally preserved. No deployment, publication, or live integration claim. |

### Verification evidence

- `npm ci --no-audit --no-fund`: passed; dependency deprecation notices only, no package upgrades or lockfile changes.
- Baseline: `npm run build -- --output-path /tmp/causalbench-designer-baseline`: passed with historical warnings described above.
- Final: `npm run build -- --output-path /tmp/causalbench-designer-build`: passed without warnings; 379.03 kB initial, estimated transfer 100.23 kB. Output inspected for asset/index generation; tracked deployment files were not changed.
- `./node_modules/.bin/tsc --noEmit -p tsconfig.spec.json`: passed.
- `CHROME_BIN='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- --watch=false --browsers=ChromeHeadless --progress=false`: **32 passed** in Chrome Headless 155, with no suite warnings. Karma required execution outside the network sandbox because its local port bind was denied inside it.
- `npm run test:exports`: four synthetic fixture contexts pass Python AST parsing, literal/tuple identity and value inspection, YAML parsing, and recursive typed-semantic comparison. The expanded fixture produces six scenarios and 24 evaluations. No contributed Python imports or execution.
- Registry probe: unauthenticated `POST https://causalbench.org/api/tasks/fetch` outside the network sandbox returned HTTP 401, `success: false`, `status_code: 401`, null data, and “Not authenticated. Please log in.” No token was requested or supplied. Successful catalogs and backend task metadata remain unverified.
- Browser interaction tests exercise invalid metadata recovery, task selection, arbitrary same-alias mappings, explicit configurations, cancel isolation, both export previews, blocked export after a task version change, and navigation between both interfaces. They use fixture metadata rather than a live registry.
- `npm start -- --host 127.0.0.1`: local development server compiled successfully. Native access was initially unavailable. The user subsequently enabled the Chrome extension, and connected-browser visual QA was completed as recorded below.
- `git diff --check`: passed. UTF-8, code fences, and 21 local documentation links across README, HANDOFF, CONTRACTS, and fixture notes: passed.

**Next action:** collect verified authenticated registry/task metadata. Connected-Chrome visual QA is complete. Authenticated integration remains unverified; the implemented authoring/validation/export path is usable with supplied descriptors. Deployment remains separate.

## Connected-Chrome QA follow-up — 2026-10-22

The user enabled the Chrome extension and authorized visual QA. A connected browser session opened the running local app at `http://127.0.0.1:4200/`.

**Bug found and fixed:** task-input and parameter getters create fresh row objects. Their untracked Angular loops recreated form controls during every change-detection pass, dropping focus and causing a repeated update loop in the running app. Stable input/parameter names and configuration IDs now track editor rows; stable group/mapping/output keys also retain composition elements. A new regression reproduced detached controls/focus loss before the fix and passes afterward. The full authoring test now uses automatic Angular change detection as well. The user closed the old unresponsive synthetic QA tab, and the fixed flow completed in a fresh tab.

**Connected-browser checks:**

- Supplied four explicitly synthetic component descriptors through the metadata dialog, selected an exact task version, and authored arbitrary `features` / `labels` mappings reusing one alias in two dataset entries.
- Configured three model entries and four metric configurations; observed six scenarios, 24 evaluations, and zero unresolved metadata checks.
- Entered zero, false, explicit null, quoted/multiline/backslash text, and an object containing false/zero/empty text. Invalid numeric input disabled Apply; correcting it recovered the form.
- Verified Cancel isolation by changing an applied zero to 99 temporarily, cancelling, and confirming the export retained zero.
- Verified identical Python previews across Context and Composition routes and retained draft state on navigation.
- Inspected desktop (1440 × 1000) and narrow (390 × 844) layouts. Narrow document content/client widths both measured 375 CSS pixels after the scrollbar; no horizontal document overflow. The narrow export dialog scrolls vertically and closes with Escape. Temporary viewport overrides were reset.
- Downloaded actual Python and YAML files. The browser download-event observer timed out, but the files arrived in Downloads and byte-matched their exact previews. Copies in the QA artifact directory were parsed without component execution: Python AST, YAML, identities, mappings, explicit entry counts, and typed values agree.
- No warning/error console entries were captured in the fixed QA tab.
- Final full suite: **32 passed**. Isolated production build: **passed without warnings**, initial 379.03 kB / estimated transfer 100.23 kB. Four independent export fixtures and `git diff --check` passed.

Screenshots and inspected artifacts are local, temporary QA outputs in `/tmp/causalbench-designer-qa/`: `context-desktop.jpg`, `composition-desktop.jpg`, `composition-mobile.jpg`, `export-python.jpg`, `export-yaml.jpg`, `export-mobile.jpg`, and `downloaded-context.py` / `downloaded-context.yaml`. The completed synthetic QA context was left open in Chrome for inspection. Its IDs are fictitious and do not identify live registry assets.

## Blueprint restoration follow-up

The top bar now links **Context** and **Blueprint · Experimental**. Section **02 / Composition** on Context contains **Show task composition**, switching between cards and automatic task wiring without changing the recipe. The existing light surface, teal accents, typography, and configuration controls are retained.

Blueprint again has draggable SVG nodes, generic port connections, background pan, cursor-centered wheel zoom, zoom buttons, fit/reset, a context menu, and a sample sketch. Arrow keys move a focused node (Shift increases the step); Enter opens its shared configuration editor; Delete/Backspace removes it; Escape cancels a connection or menu. Applied components appear automatically. Choosing a component for a placeholder binds it once to the shared entry. Removing an applied node removes that entry and its incident sketch edges. Stable node IDs retain positions across navigation and permit repeated component identities.

Connections and processor notes are explicitly design annotations. Canonical dataset mappings continue to be edited with the shared mapping controls. Neither sketches nor coordinates nor processor notes enter Python/YAML. Unconfigured dataset/model/metric placeholders block Blueprint export; a processor note does not. Draft, layout, and switch preference survive navigation only while the application remains loaded.

## Blueprint revision plan

Keep the current visual style. Build on the restored shared draft and editor in these stages:

1. **Task-aware ports.** Replace generic executable-component ports with dataset aliases and the selected task's `model_data_inputs`, `metric_data_inputs`, and `metric_model_inputs`, including exact names and known runtime types. Show missing contract metadata as unknown and keep processor nodes visibly separate. Acceptance: arbitrary task input names and alias reuse render correctly; absent metadata never produces invented ports.
2. **Connections that edit mappings.** Make supported alias-to-input connections update the canonical dataset mapping, and reflect changes from the existing editor back onto the canvas. Validate formats, exact task versions, and missing/stale mappings at the relevant ports. Preserve the documented dataset × model Cartesian expansion and required output names; edges must not imply an unsupported subset pipeline or rename model outputs. Processor execution requires a separately defined backend contract. Acceptance: canvas and form edits produce identical recipes and field-specific validation; invalid/unknown connections remain explainable and cannot bypass export checks.
3. **Configurations and canvas usability.** Show explicit configuration counts and scenario expansion on nodes, including repeated modules/values. Add a canvas focus mode with collapsible catalog/recipe panels, task-aware layout, keyboard/touch polish, and undo for editing actions. Keep layout and execution state separate; durable canvas persistence/import require their own scope. Context recipe import is now delivered separately below. Acceptance: the two-dataset, three-model-configuration, four-metric-configuration case still yields six scenarios and 24 evaluations, and layout actions never alter export content.
4. **Verification and delivery.** Add behavior tests for bidirectional mappings, reused aliases, version/type mismatches, unknown contracts, retained layouts, and configuration expansion. Repeat real-Chrome drag, pan, zoom, keyboard, and narrow-layout QA; compare Python/YAML semantics before and after visual edits. Run an isolated production build and independent export checks. Verify authenticated registry payloads separately before claiming automatic live metadata support.

The restoration is delivered now. These stages describe the next revision; generic sketch connections have not been promoted into execution semantics.

### Restoration verification

- **39 Chrome Headless tests passed**, including the local switch, unchanged serialized recipes, route retention, stable canvas identities/coordinates, placeholder-to-entry binding, shared entry removal, real pointer-event dragging, keyboard movement/configuration, connection direction/deletion, and zoom limits. Selecting a node renders its action panel below the canvas, preventing a layout jump during drag; a regression checks the canvas position during selection.
- TypeScript spec compilation passed. The isolated production build at `/tmp/causalbench-designer-build` passed without warnings: initial **401.62 kB**, estimated transfer **105.20 kB**. All four independent Python syntax/literal and YAML round-trip fixtures passed.
- Connected Chrome verified **Show task composition**, exact task output labels, the restored top-bar route, and two port connections. A real pointer drag changed the model from `(340, 60)` to `(410, 100)`; background drag changed the viewport offset by `(40, 30)`. Zoom, fit, keyboard movement, processor note editing, and opening/canceling the shared configuration editor worked.
- Adding an unconfigured component node disabled Blueprint export; deleting it restored export. A processor note remained design-only. Python preview was identical before and after sketches, layout changes, and editor cancellation. Navigation retained both the composition preference and node layout/edges.
- Desktop **1440 × 1000** and narrow **390 × 844** views were inspected. Narrow document client/scroll widths both measured **375 CSS pixels** with no horizontal document overflow. Fit nodes gives an overview; zoom/pan controls support closer canvas inspection. The temporary viewport override was reset.
- Screenshots: `/tmp/causalbench-designer-qa/composition-switch.jpg`, `blueprint-restored.jpg`, and `blueprint-mobile.jpg`. The synthetic **QA · Blueprint restoration** context is left open in Chrome. Its registry IDs are fictitious; the real registry session still displays a denied-session response and has not supplied verified catalog metadata.

## Dark theme and real-data follow-up

The user requested dark appearance and supplied a token for real registry testing. The top bar now offers **Dark theme / Light theme** on both routes. Shared semantic variables cover page/card surfaces, text, controls, selected states, badges, errors, code/dialog surfaces, task wiring, and SVG nodes/ports/grid. The first visit follows system appearance; explicit choices persist in browser local storage, with an in-memory fallback if storage is blocked. Browser QA confirmed an explicit light choice in a fresh tab before switching the real context back to dark.

### Live API findings and fixes

- Authenticated HTTP 200 fetches were observed for `tasks/fetch`, `dataset_version/fetch`, `model_version/fetch`, and `metric_version/fetch`. Model/metric requests initially returned HTTP 422 because `user_id` is required. Their request bodies now use the active JWT's numeric `sub` as a request hint; authorization remains on the server. No account ID is hardcoded, and tasks/datasets do not receive that hint.
- Unsorted dataset pagination was unreliable. **Uploaded Date descending** produced 1,000 + 472 + 0 module descriptors and 1,472 distinct IDs. The browser now uses this stable sort for datasets/models/metrics, defaults to 1,000 records per page, and rejects overlapping pages in addition to repeated pages and request-limit exhaustion. It does not silently deduplicate an incomplete catalog into a successful result.
- Chrome loaded **5 task versions, 1,479 dataset versions, 16 model versions, and 33 metric versions**. Module and version counts differ because modules may have multiple versions.
- The observed catalog responses omit complete task input contracts, usable dataset alias manifests, and exact model/metric task versions. Those gaps stay unknown. Four public packages were downloaded and inspected to complete the example's metadata; filenames and feature labels were not guessed into contracts.

### Real Sachs example

The designer now contains **Sachs · PC real-data test**: task **1 v1**, dataset **1443 v1**, PC model **3 v1**, and `accuracy_static` metric **1 v1**. The dataset has **7,466 observations and 11 variables**. Its manifest supplies `file1` as `dataframe` and `file2` as `graph.static`; the mappings are `data → file1` and `ground_truth → file2`. The inspected task requires model output `prediction` unchanged. Model/metric defaults are retained.

The exact Python preview exported by the designer executed locally with `causalbench-asu==0.2.5` and `gcastle==1.0.4`, using the downloaded archives with network calls disabled and temporary extraction paths. It produced **one scenario and one evaluation**, with graph accuracy **0.7768595041322314**. Effective runtime settings matched the exported YAML after resolving manifest defaults. This verifies the authoring/export/execution path; it does not establish scientific suitability. No context or run was published.

The first sandboxed execution failed when CausalBench's macOS disk profiler could not read `diskutil` output; the resulting waiting process was stopped. The same inspected test then passed outside that sandbox with networking disabled. NVIDIA/AMD discovery warnings on this Mac did not prevent CPU execution. Python dependencies were installed into `/tmp/causalbench-live-qa/runtime`; repository dependencies and the lockfile were unchanged.

Reusable, credential-free artifacts are in [examples/sachs](examples/sachs/): `context.py`, `context.yaml`, and `descriptors.json`. README documents their pinned identities, metadata fallback, and execution requirements. The JSON array is a reference bundle for the existing individual-descriptor editor, not a new importer. Registry access needs a current session; the supplied token expired at **2026-10-23 07:12:10 UTC** after the authenticated fetches/downloads had completed. No token was written to source files, logs, or exports.

### Verification

- **43 Chrome Headless tests passed**, including new theme preference/storage-failure tests, dynamic identity hints, and overlapping-page rejection. TypeScript spec compilation and all four independent export fixtures passed.
- Isolated production build passed without warnings: initial **405.20 kB**, estimated transfer **106.02 kB**. `docs/` was not regenerated or deployed.
- Connected Chrome verified both themes/routes, stored preference in a fresh tab, dark configuration forms and export dialog, real mappings/exports, and dark SVG nodes/connections. At **390 × 844**, document client/scroll widths were both **375 CSS pixels**, with no horizontal document overflow. Temporary viewport overrides are reset after QA.
- Screenshots in `/tmp/causalbench-designer-qa/`: `dark-sachs-context.jpg`, `dark-sachs-editor.jpg`, `dark-sachs-export.jpg`, `dark-sachs-blueprint.jpg`, and `dark-sachs-mobile.jpg`. Local runtime script/result: `/tmp/causalbench-live-qa/verify_export.py` and `sachs-result.json`. The real Sachs context is left open for inspection.

The authenticated catalog and real-data execution evidence above supersedes the original unverified status. Complete automatic task/alias/version metadata and deployment remain unresolved. Supplied `cb-docs/` and tracked `docs/` are unchanged; the subsequent import feature adds two parser dependencies to the lockfile.

## Open existing contexts — plan and delivery

The user requested a plan followed by implementation for selecting an existing context and populating the designer's fields. The following stages are complete:

1. **Confirm recipe and registry contracts.** Check documented context fields, the public OpenAPI schema, the website's saved-context adapter, exact version identity, and download format. Support exported YAML/JSON and downloaded context ZIPs alongside the registry picker.
2. **Build data-only import and hydration.** Validate the complete supported recipe before changing state; preserve exact versions, mappings, typed values, duplicates, and order. Resolve known descriptors and retain unresolved references without inventing contracts.
3. **Add preview and safe opening.** Put Open context in both views; search/select a saved version or read a file/paste, preview it, and explicitly replace current work. Populate forms and blueprint nodes together; keep failed/cancelled previews isolated.
4. **Verify edit/reopen behavior.** Cover malformed input, ZIP limits, registry pagination/session changes, stale downloads, metadata arriving during edits, unresolved settings, configuration counts, and export equality. Exercise desktop/mobile and both themes in connected Chrome.

### Delivered behavior and limits

- **Open context** searches saved registry versions, downloads the selected version to a preview, and supports local `.yaml`, `.yml`, `.json`, `.zip`, or pasted YAML/JSON. Selection never applies automatically. Open/Replace explicitly discards the previous draft, unapplied editor changes, and blueprint sketches; cancellation and errors leave existing work intact.
- `POST /pipelines/fetch` and `GET /pipelines/download/{id}/{version}` follow the observed contracts described in [CONTRACTS.md](CONTRACTS.md). Listing is lazy, uses the current session's numeric subject, sorts by Creation Time descending, pages to empty, and rejects overlaps/limits. Session changes cancel requests and remote previews; late responses cannot replace a newer selection.
- Restored fields include name, multiline description, task, datasets/mappings, and every model/metric override configuration. Consecutive occurrences of the same model/metric version share one editor entry; interleaved versions and duplicates retain exact serialized order. Loaded names use a one-row textarea to preserve multiline text that an HTML input would normalize.
- Missing descriptors remain explicit references with editable saved mappings and JSON override controls. Invalid JSON disables Apply. Missing contracts block validated export; no task method, alias, or parameter declaration is guessed. Exact catalog metadata arriving later updates unresolved entries without losing author edits, including edits already open in the sidebar. Manual descriptors retain priority.
- Replacement clears old canvas nodes/edges, pending connection, selection, and viewport, then adds configured nodes for the loaded recipe. Context/Blueprint continue to share the draft, editor, validator, and serializers. Opened-source identity is displayed separately from the exported recipe.
- The reader accepts CB 0.2.x, UTF-8 configuration up to 2 MB, an archive up to 8 MB with exactly one config.yaml/config.yml/config.json, at most 10,000 entries, and override nesting up to 40 levels. It rejects unsupported fields (including unsupported dataset index overrides), duplicate keys, aliases, incompatible versions, and non-JSON values rather than silently dropping them. Only the configuration is inflated; component code is neither executed nor extracted. Python scripts are not importable.
- Parser dependencies are pinned to `yaml@2.9.1` and `fflate@0.8.2`, in a lazy reader chunk. The latter preserves compatibility with the existing TypeScript 5.2 toolchain. No framework upgrade, registry write-back, publication, automatic draft persistence, or deployment was added.

### Verification evidence

- **61 Chrome Headless tests passed.** New coverage includes typed YAML/JSON round trips, negative zero, ordered/repeated configurations, exact-reference fallback, ZIP ambiguity/limits, unsupported/malformed input, saved-context response normalization, authenticated pagination/download, cancellation/races, actual File input handling, safe replacement, blueprint reset, unresolved-setting edits, multiline names, and late metadata during open edits.
- TypeScript spec compilation passed. All four independent Python syntax/literal and YAML semantic fixtures passed. `git diff --check` passed.
- Isolated production build passed without warnings: initial **426.33 kB / 110.87 kB estimated transfer**, plus lazy context reader **105.44 kB / 30.55 kB estimated transfer**. Tracked deployment output was preserved.
- A refreshed registry session loaded **34 saved context versions** in connected Chrome. Selecting **Tuning PC #2 v1** downloaded and parsed its actual archive: correct name/description, task 1 v1, one dataset, two model configurations, and two metric configurations in preview. This verifies live listing/download/preview. The session expired during subsequent QA; full field editing and reopen checks used the repository's real Sachs export.
- Opened `examples/sachs/context.yaml` through Chrome's native file chooser, restored exact references/mappings, supplied its four package-verified descriptors, and added a second explicit PC configuration with `alpha: 0.01`. The UI showed two scenarios and two evaluations, with metadata checks passed. Exporting YAML, reopening it, and selecting Python export produced a byte-identical Python preview. Malformed pasted input and Cancel retained the edited draft; cancelling a temporary alias edit retained its previous value.
- Desktop, **800 × 900**, and **390 × 844** layouts were reviewed. Narrow document client/scroll widths matched (**785/785** and **375/375** CSS pixels); the mobile open dialog fit the viewport and scrolled as needed. Dark/light picker and filled-state screenshots were inspected. The temporary viewport override was reset and light appearance restored.
- Local screenshots and export artifacts are in `/tmp/causalbench-designer-qa/`: `open-context-preview.jpg`, `open-context-populated-light.jpg`, `open-context-mobile.jpg`, `open-context-dark.jpg`, and `reopened-context.py` / `reopened-context.yaml`. The populated **Sachs · reopened context QA** draft is left open in Chrome. Registry browsing requires a current session; local file/paste import remains available without one.

No context or run was published. Supplied `cb-docs/`, tracked `docs/`, and existing user work were preserved; no changes were staged or committed.
