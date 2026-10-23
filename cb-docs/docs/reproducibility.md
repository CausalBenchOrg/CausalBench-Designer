# Reproducible Benchmarking

A reproducible CausalBench result is more than a metric score. Another researcher needs to know exactly which component versions and settings ran, how data inputs were mapped, which software and system executed them, and which repository record contains the result.

Exact duplication is not always possible across hardware and software. CausalBench therefore emphasizes transparent, attributable runs: differences should be visible enough to investigate instead of being hidden behind a single score.

> **Version note:** This documentation was verified against the published `causalbench-asu` 0.2.5 package. Check your installed version when exact behavior matters.

Before using this guide, read [How CausalBench Fits Together](concepts.md) for the distinction between a context, scenario, run, and result.

## Identities You Need to Record

For versioned components, an ID without its version is not enough to reconstruct an experiment. Runs and results use their own unversioned record IDs.

- **Package version:** identifies the client implementation that loaded, executed, profiled, and submitted the components.
- **Task ID and version:** identify the data and output contract used by the run.
- **Context ID and version:** identify the reusable experiment recipe.
- **Dataset ID and version:** identify each data package; also retain its file mapping and external provenance.
- **Model ID and version:** identify each implementation; retain every resolved hyperparameter value.
- **Metric ID and version:** identify each evaluator; retain every resolved metric setting.
- **Run ID:** identifies a registered execution of the context on one system.
- **Result ID:** identifies a finer-grained dataset-model-metric record within a published run, as described by the CausalBench paper.

Check the installed package version with:

```bash
python -c "from importlib.metadata import version; print(version('causalbench-asu'))"
```

Component versions and the Python package version are separate. Updating the package does not automatically update a referenced dataset, model, metric, task, or context.

An ID/version pair is a registry locator, not a content checksum. The checked client can submit an overwrite request for an object that already has both values after interactive confirmation; the hosted service then applies its current policy. Unless the hosted record is confirmed permanent, preserve the exact downloaded archive or configuration and record a cryptographic checksum so later changes can be detected.

## Local Execution and Profiling

`Context.execute()` downloads or loads the selected components, creates the scenarios, and runs them on the current machine. The returned `Run` exists locally until you explicitly publish it.

CausalBench records profiling at several levels.

### Run-Level System Profile

The run can include:

- platform name and architecture;
- CPU name and architecture;
- detected GPU name, driver, and total memory;
- physical disk metadata and capacity;
- total system memory; and
- total storage capacity.

### Model and Metric Execution Profiles

Each model and metric execution can include:

- start, end, and duration values;
- peak Python-traced memory;
- detected GPU utilization;
- bytes read from and written to detected disks;
- Python version; and
- versions of imported Python packages that the profiler can resolve.

Scenario and overall run durations are recorded separately. In CausalBench, raw timestamps and durations are produced with `time.time_ns()`, so label any converted values with their units.

### Profiling Limits

Profiling data needs interpretation:

- Peak Python-traced memory is not the same as total process or system memory.
- GPU data can be empty or partial when no supported device or driver interface is detected.
- Imported-package detection may not describe native libraries, system packages, containers, or transitive dependencies completely.
- Short executions, background load, caching, thermal behavior, and shared infrastructure can distort timing and utilization.
- A machine profile cannot make two different systems identical.

For performance claims, repeat runs, describe warm-up and aggregation, and compare like-for-like systems. Do not interpret a single local duration as a universal property of a model.

## Local, Private, and Public Are Different States

### Local Run

```python
from causalbench.modules import Context, Run

context = Context(module_id=CONTEXT_ID, version=CONTEXT_VERSION)
run: Run = context.execute()
print(run)
```

This executes locally. It does not publish the run.

### Private Publication

```python
run.publish()
```

`publish()` defaults to `public=False`. It sends the run to the authenticated hosted repository with private visibility; it is not merely a local save operation.

A run can be published only when its context already has a repository ID and version. In turn, a context can be published only when its task, datasets, models, and metrics already have repository IDs.

### Public Publication

```python
run.publish(public=True)
```

The package asks for interactive confirmation before requesting public visibility.

Public publication can disclose component contents, outputs, system metadata, dependency versions, and dataset-derived information. Inspect the complete artifact and confirm that you have the necessary data, code, and licensing rights before proceeding. Never package credentials, access tokens, private keys, or restricted data.

## Permanence and DOI Policy

The 2025 paper [*CausalBench: A Unifying Framework for Benchmarking Causal Learning Models*](files/papers/CausalBench_Unifying.pdf#page=4) states that:

- a dataset, model, or metric becomes permanent in CausalBench after it is declared public and included in at least one public run; and
- public benchmark runs are registered in Zenodo and receive a DOI.

These are claims about the hosted CausalBench publication workflow, not guarantees made by local execution or by the Python client alone. Before citing a run:

1. Confirm that the service reports the intended visibility.
2. If `publish()` returns `True`, record `run.module_id`. The method itself returns a Boolean, not an ID; obtain any Result IDs from the hosted record if the service displays them.
3. Confirm that a DOI was actually assigned.
4. Open the DOI and verify that it resolves to the intended artifact and metadata.
5. Use the repository's citation metadata rather than constructing a DOI or citation manually.

Do not assume that a private upload receives a DOI or is covered by the paper's public-permanence statement. If retention or deletion is important to your project, confirm the current hosted-service policy before uploading.

## Reproducibility Checklist

### Before Execution

- [ ] Record the full `causalbench-asu` package version.
- [ ] Pin every registered context and component by both ID and version, and checksum the exact archives or configurations used.
- [ ] For local ZIPs, record the archive checksum, path, and source revision.
- [ ] For a context created only in memory, preserve its `Context.create(...)` inputs or an equivalent serialized definition and checksum it.
- [ ] Save dataset-to-task file mappings.
- [ ] Record all model and metric settings, including defaults.
- [ ] Preserve data provenance, licenses, preprocessing steps, and checksums for external source files.
- [ ] Record random seeds and any deterministic-computation settings used by contributed code.
- [ ] Preserve an environment lock file or equivalent dependency record.
- [ ] State any causal assumptions, ground-truth limitations, exclusions, and evaluation conventions.

### During Execution

- [ ] Capture the run output and any warnings or component compatibility errors.
- [ ] Check that every expected dataset-model scenario and metric completed.
- [ ] Inspect profiling fields for missing or unsupported devices.
- [ ] Keep evaluation scores separate from timing and resource measurements.
- [ ] Repeat stochastic or performance-sensitive runs according to a stated protocol.
- [ ] Avoid changing downloaded component files without creating and identifying a new version.

### Before Publication

- [ ] Before publishing a context, confirm that every referenced task, dataset, model, and metric has a repository ID and version.
- [ ] Before publishing a run, confirm that its context has a repository ID and version.
- [ ] Review the artifact for secrets, personal information, restricted data, and machine details you cannot disclose.
- [ ] Choose private or public visibility deliberately and read the package's confirmation and response.
- [ ] After publishing a context, record its assigned ID, version, publication date, and final visibility.
- [ ] After a successful run upload, record `run.module_id`, the publication date, final visibility, and any Result IDs displayed by the hosted record.
- [ ] For a public run, verify the DOI before citing it.

### When Reproducing Someone Else's Run

- [ ] Resolve the exact context version, not only its name or ID.
- [ ] Compare every component version, mapping, and setting with the original.
- [ ] Match the Python package and dependency versions where practical.
- [ ] Compare the recorded hardware/software profile before interpreting timing differences.
- [ ] Explain score differences instead of discarding them; they may reveal nondeterminism, dependency drift, or platform sensitivity.

## What to Report With Results

At minimum, a paper, report, or issue should include:

```text
CausalBench package: <version>
Task:                 <id>, version <version>
Context:              <registered id/version or local definition/checksum>
Run:                  <run id, if published; otherwise "local">
Datasets:             <registered id/version or local checksum; mappings>
Models:               <registered id/version or local checksum; settings>
Metrics:              <registered id/version or local checksum; settings>
System summary:       <CPU, GPU, memory, OS/platform>
Repetition protocol:  <seeds, repetitions, aggregation>
Public record:        <verified DOI, if assigned>
```

This compact record does not replace the full run artifact, but it gives readers enough information to locate it and judge whether a comparison is like-for-like.

Continue with the [quickstart](quickstart.md) to execute a context, or review the [component authoring guides](modules/datasets.md) when preparing your own benchmark.
