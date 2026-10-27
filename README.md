# CausalBench Designer

An Angular application for authoring versioned CausalBench contexts, validating their metadata, and exporting Python or context YAML for local execution with `causalbench-asu==0.2.5`.

The refresh follows the supplied [CausalBench documentation](cb-docs/). See [HANDOFF.md](HANDOFF.md) for implementation and verification evidence, and [CONTRACTS.md](CONTRACTS.md) for contract decisions and the unverified live registry dependencies.

## Author a context

1. Connect a current registry session and select one task with its exact module ID and version in **01 / Context**. Designer automatically reads its package and named input declarations without running Python or asking you to open files.
2. Choose Dataset, Model, or Metric in the component catalog. **Filter component versions** narrows the **Component and version** list by name or module ID and shows the number of matching versions. Add datasets and map every task input to an alias shown in the editor. Aliases, formats, and paths load automatically from that exact dataset package. **Suggest compatible mappings** fills empty inputs when exactly one alias has the required type; ambiguous choices remain yours. The same alias can supply multiple inputs. `dataframe` loads as `SpatioTemporalData`; `graph.static` and `graph.temporal` both load as `SpatioTemporalGraph`.
3. Add model and metric configurations that reference the same task ID **and** version. Exact references and defaults load automatically. Enable only the overrides you intend. Numbers, booleans, explicit nulls, empty/multiline text, arrays, and objects retain their values. Generic `object` parameters accept any finite JSON value, including scalar options such as `"uniform_average"`. Parameter types are authoring checks performed by the designer; the checked Python `Context.create` implementation validates names but does not enforce declared parameter types.
4. Use **Apply to draft** to commit temporary edits, or **Cancel** to discard them. Add explicit configurations for comparisons; range strings do not expand automatically. Repeated modules and parameter values are allowed.
5. Review the scenario preview and field-specific validation messages. Two datasets × three model configurations yield six scenarios; four metric configurations yield 24 evaluations.
6. Choose **Review & export** to inspect and download the exact Python or YAML file. Incomplete, incompatible, or unknown required metadata blocks export. Python executes locally and creates an unpublished run. Publication remains a separate explicit operation.

On `/`, **Show task composition** in section **02 / Composition** switches between component cards and task wiring. The wiring shows dataset aliases, task inputs, and the exact model output keys required by metrics; it follows the selected task automatically.

The top-bar **Blueprint · Experimental** link opens `/node-editor`, with draggable nodes, automatic context arrows, sketch connections, pan/zoom, and keyboard controls. Context arrows show dataset → model, model → metric, and direct dataset → metric inputs; their labels follow the saved mappings and task contract. Without a verified task contract, scenario arrows are explicitly labeled unverified. Opening a context reconstructs these arrows. Configured nodes use the same draft, temporary editor, validation, and serializers as Context. Processor notes and additional sketch connections remain design annotations. Editing executable mappings still uses the configuration editor; drawing or deleting a sketch never changes the context.

Navigation retains the draft, composition switch, and blueprint layout in memory. Reloading discards them; automatic draft persistence remains deferred. Use **Open context** to restore an exported or registry context.

Use the sun/moon icon in the top bar to change appearance. The first visit follows the system appearance; an explicit choice is saved in browser local storage when available. Both routes, the canvas, configuration controls, and dialogs share the theme. Theme preferences are separate from contexts and session credentials.

Task changes retain existing entries and identify incompatible ones. Browser metadata checks cannot establish actual dataset contents, runtime model output names/types, helper correctness, or scientific suitability.

## Open an existing context

Choose **Open context** in **01 / Context** in either view. With a current registry session, search saved contexts and select an exact version. The designer downloads its context and shows a preview; choose **Open in designer**, or **Replace draft & open** when work already exists. Selection alone does not replace your draft. Cancel, invalid files, and failed downloads leave it intact.

You can also choose a YAML, JSON, or context ZIP file, or paste YAML/JSON. The designer restores the name, description, exact task/component versions, dataset mappings, and every explicit model/metric configuration. Consecutive configurations for the same component share an editor entry; serialized order and repeated values are preserved. Opening a context resets the old blueprint sketch and creates nodes for the restored entries.

Component metadata resolves automatically for the exact saved versions. Saved mappings and overrides remain editable while it loads, and unapplied edits survive metadata arrival. Package evidence takes priority over incomplete catalog summaries. Download failures are shown by module name, ID, and version with a retry action. Unknown required metadata still blocks validated export; these messages do not establish that the context fails in Python.

Imports support CB 0.2.x contexts, up to 2 MB of UTF-8 configuration or an 8 MB ZIP containing exactly one `config.yaml`, `config.yml`, or `config.json`. Only that configuration is read; component code is never executed. Unsupported fields are rejected so they cannot disappear during editing. Python scripts cannot be imported. Edits remain local and can be exported; saving changes back to the registry is not implemented.

## Registry and metadata

Registry requests default to `https://causalbench.org/api`. Open the designer from CausalBench for session handoff, or use **Registry session** to enter a current session token. Tokens stay in session storage when available. Visiting locally without a token leaves authoring available. Handoff messages require the expected opener, an allowed origin, and a valid token payload.

Catalogs distinguish loading, empty, failure, and denied-session states, with retry and reconnect controls. Requests page until an empty page; repeated/overlapping pages or the request limit produce a visible failure instead of a successful partial catalog. Dataset/model/metric requests use **Uploaded Date descending** for stable pagination. The live model/metric schemas require `user_id`, supplied from the active JWT's numeric subject as a request hint; the server authenticates the bearer token. API base URL, page size (default 1,000), and maximum pages are configured through `REGISTRY_CONFIG` in [api.service.ts](src/app/services/api.service.ts).

Authenticated fetches for all four catalogs were verified on 2026-10-23. Their summaries omit task input contracts, usable dataset alias manifests, and exact model/metric task versions. Designer now resolves these automatically from the exact component packages when components are selected or an existing context is opened. Model/metric manifests provide exact task references and typed defaults; absent `hyperparameters` means no declarations. Task source is parsed as Python syntax, and the manifest's exact class is inspected for literal input dictionaries. No contributed Python is imported or executed. Dynamic task declarations require a machine-readable registry contract or the advanced fallback.

Complete exact-version registry metadata can be used directly, including machine-readable task contracts for dynamic implementations. Otherwise, ZIP reads request byte ranges so a large dataset can supply its manifest without downloading its CSVs. Servers that ignore Range use a bounded streamed fallback (32 MB); individual metadata files and the ZIP directory are limited to 2 MB. ZIP64, encrypted archives, unsupported compression, inaccessible versions, and dynamic declarations produce explicit diagnostics. Requests are paced and time out after 60 seconds (180 seconds on an explicit retry). Session changes abort downloads and discard their cached evidence.

**Module metadata audit → Audit all modules** checks every listed version, with separate counts for attempts and verified packages. The ordered issue list and downloadable JSON identify each version and failure stage; `catalogMissing` records omissions from the listing separately from the package result. Network/download failures mean the package could not be inspected, rather than proving metadata is missing. A full audit can take several minutes; **Stop audit** retains its partial results. Ordinary authoring resolves only the selected/used components.

The [2026-10-23 audit list](reports/module-metadata-audit.txt) and [full JSON results](reports/module-metadata-audit.json) cover 1,533 versions: **1,532 packages verified**, with no missing context declarations found among those inspected. **Telecom dataset #1446 v2** returned HTTP 403 for the audit session and remains unverified. The slow E3SM dataset #1478 v1 resolved on recheck. Catalog omissions are enumerated separately for every version.

Legacy manifests without a `causalbench` block follow the Python loader's installed-version default. An explicitly incompatible major/minor version is rejected. This matches `Module.__init__`, which initializes compatibility before merging package fields.

**Advanced metadata → Supply descriptor metadata** remains available for exceptional/custom contracts. Normal registry authoring does not require it. The editor examples use fictitious IDs; replace them with real identities. This fallback authors component metadata, not a context import, and never executes contributed Python in the browser.

For example, a task descriptor has this shape (IDs below are fictitious):

```json
{
  "kind": "task",
  "id": 10001,
  "version": 1,
  "name": "My supervised task",
  "contract": {
    "modelData": {"features": "SpatioTemporalData"},
    "metricData": {"target": "SpatioTemporalData"},
    "metricModel": {"prediction": "SpatioTemporalData"}
  }
}
```

Dataset descriptors add `files: [{"alias":"observations","format":"dataframe","path":"observations.csv"}]`. Model/metric descriptors add `taskRefs: [{"id":10001,"version":1}]` and `parameters: {"setting":{"data":"integer","value":0}}`; use `parameters: {}` when none are declared. Manual metadata is labeled and remains the author's responsibility. Updating a descriptor updates matching entries while preserving mappings and overrides for revalidation. Physical filenames and legacy feature `file_type` fields are never guessed into aliases.

## Try real registry data

[examples/sachs](examples/sachs/) contains the designer-generated [Python](examples/sachs/context.py), [YAML](examples/sachs/context.yaml), and package-verified [descriptor metadata](examples/sachs/descriptors.json) for a real-data smoke test:

- Causal Discovery (Static), task **1 v1**; Sachs protein-signaling dataset **1443 v1**, with **7,466 rows and 11 variables**.
- PC model **3 v1** with manifest defaults; `accuracy_static` metric **1 v1** with its default `binarize=true`.
- Dataset mappings: `data → file1`, `ground_truth → file2`. The task requires model output `prediction` unchanged.

The context was authored in connected Chrome and executed locally with `causalbench-asu==0.2.5`, yielding one scenario/evaluation and graph accuracy **0.7768595041322314**. This is a functional smoke test, not a scientific validation of algorithm suitability. No records were published. The exact exported Python was run against downloaded, inspected archives with networking disabled, and its effective settings were checked against the YAML plus manifest defaults.

To edit the example, connect a registry session, choose **Open context**, select `examples/sachs/context.yaml`, review the preview, and open it. Metadata then loads automatically. The bundled `descriptors.json` remains an offline reference for the advanced fallback. You can edit/apply mappings and configurations in the UI. To execute `context.py`, install `causalbench-asu==0.2.5`, `gcastle`, and its required scientific dependencies (including PyTorch), then authenticate locally when CausalBench requests it. Registry availability/permissions and token expiry can change; no credentials are included in these files.

## Development and verification

The locked toolchain is Angular 21.2.25, Angular CLI/build 21.2.28, and TypeScript 5.9.3. Use Node 22.12+ (22.x) or Node 24.x; verification uses Node 24.12.0/npm 11.6.2. The application uses Angular's current application builder, compiled templates, and Zone.js change detection. Context import uses pinned `yaml@2.9.1` and patched `fflate@0.8.3`, loaded only when reading a context.

`@emnapi/core` and `@emnapi/runtime` are explicitly pinned as development dependencies because npm can otherwise omit these transitive build-tool peers from a macOS-generated lockfile and fail `npm ci` on Linux ([upstream issue](https://github.com/napi-rs/napi-rs/issues/3174)). Keep these declarations when refreshing the lockfile.

```sh
npm ci
npm start -- --host 127.0.0.1
```

The development URL is `http://127.0.0.1:4200/`. Production builds now default to `dist/causalbench-designer`, leaving tracked deployment output untouched:

```sh
npm run build
# Or use an isolated path for review:
npm run build -- --output-path /tmp/causalbench-designer-build
npm test -- --watch=false --browsers=ChromeHeadless
npm run test:exports
npm run audit:production
```

Browser tests require Chrome (`CHROME_BIN` may be needed). Export checks require Python 3 with PyYAML, parse Python without importing/executing components, and compare YAML and Python literal semantics against synthetic fixtures. Scientific notation and negative zero are included. See [tests/fixtures](tests/fixtures/README.md) for fixture provenance. No live registry IDs or publication calls are used in regression tests. The 78-test suite includes package/range reads, literal task parsing, exact module resolution, access failures/retry, session cancellation, preserved edits, suggested mappings, context arrows, and the existing import/editor/export coverage. Connected-Chrome QA verifies the Tuning PC context resolves automatically and exports the exact preserved context without manual descriptors; see the handoff for earlier theme/layout and runtime evidence.

The [Pages workflow](.github/workflows/pages.yml) runs on every push/merge to `main`, or manually from the Actions tab on `main`. It installs the lockfile with Node 24, runs the browser regression tests, and executes `npm run build:pages`, including its production security audit. After a successful build, it replaces the `gh-pages` branch's tracked files with `.gitignore` and the generated `docs/` website, then deploys the same build through the official GitHub Pages action. Unchanged website files skip the branch commit. Source files stay on `main`; manual merges into `gh-pages` are unnecessary.

One-time repository setup: in Settings → Pages → Build and deployment, set Source to **GitHub Actions** and retain the custom domain **designer.causalbench.org**. In Settings → Environments → github-pages, allow deployments from `main` if branch restrictions are enabled. The workflow uses the automatic `GITHUB_TOKEN` with repository-content and Pages write permissions; no personal access token is needed. The existing `gh-pages` branch must allow the workflow to push. GitHub does not trigger a branch-based Pages build for `GITHUB_TOKEN` pushes, so this workflow also performs the actual Pages deployment.

For a local preview or manual build, run `npm run build:pages`. It includes `CNAME`, `.nojekyll`, and a `404.html` entry point for direct visits to Angular routes, and replaces the old deployment bundles. `npm run build` continues to write only to `dist/causalbench-designer`. Building locally does not publish the site.

The 2026-10-26 dependency audit reports zero known vulnerabilities across production and development dependencies. A scoped npm override pins the build tool's `undici` to patched `7.30.1` because Angular build 21.2.28 pins vulnerable `7.29.1`; review/remove this override when Angular updates its dependency. `npm run audit:production` fails for high or critical advisories in production dependencies and runs automatically before `npm run build:pages` (network access required). Audit results reflect the advisory database at the time of the check and should be rerun before releases.

## Source layout

| Path | Purpose |
| --- | --- |
| [src/app/domain](src/app/domain/) | Typed context model, validation, descriptor adapters, lazy context reader/hydration, and Python/YAML serializers. |
| [src/app/services](src/app/services/) | Shared draft, component/context catalogs, paginated registry access, and session lifecycle. |
| [src/app/components](src/app/components/) | Authoring, open-context preview, task composition, experimental blueprint canvas, temporary configuration editor, and export review. |
| [scripts](scripts/) | Independent Python syntax/literal and YAML round-trip checks. |
| [tests/fixtures](tests/fixtures/) | Synthetic documentation-derived contracts and values. |
| [cb-docs](cb-docs/) | Supplied CB documentation and supplemental examples, preserved unchanged. |
| [docs](docs/) | Generated GitHub Pages website; refresh with `npm run build:pages`. |
