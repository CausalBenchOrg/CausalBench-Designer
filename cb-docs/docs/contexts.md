# Contexts and runs

A **context** is the reproducible recipe for a benchmark. It selects one task, one or more datasets, one or more models, one or more metrics, and the values used for model and metric hyperparameters. CausalBench executes that recipe locally and returns a **run**.

## How a context expands

For each dataset–model pair, CausalBench creates a scenario and applies every selected metric:

```text
datasets × models = scenarios
each scenario     = one dataset + one model + all selected metrics
```

A context with two datasets, three model entries, and four metrics therefore executes six scenarios and produces 24 metric evaluations. Repeating the same model with different hyperparameter values creates distinct model entries and therefore distinct scenarios.

## Select compatible components

Find component IDs and versions in the [CausalBench benchmark catalog](https://causalbench.org/home/benchmarks). Pin both values; an ID identifies the component, while a version identifies the specific configuration used by the experiment.

Compatibility has two layers:

| Layer | Check |
| --- | --- |
| Task reference | Every model and metric must reference the same task ID **and** version selected by the context. |
| Data contract | Dataset file aliases and model return keys must map to the typed inputs declared by the task. |

For a typical discovery task, the wiring looks like this:

```text
dataset file1 ── mapping["data"] ──────────> model input "data"
dataset file2 ── mapping["ground_truth"] ──> metric input "ground_truth"
model output   ── {"prediction": ...} ─────> metric input "prediction"
```

The names are part of the contract. A context mapping points from a task input name such as `ground_truth` to a dataset alias such as `file2`.

## Create a context in Python

Replace the placeholder IDs below with a compatible set from the registry:

```python
from causalbench.modules import Context, Dataset, Metric, Model, Task

task = Task(module_id=TASK_ID, version=TASK_VERSION)
dataset = Dataset(module_id=DATASET_ID, version=DATASET_VERSION)
model = Model(module_id=MODEL_ID, version=MODEL_VERSION)
metric = Metric(module_id=METRIC_ID, version=METRIC_VERSION)

context = Context.create(
    name="Static discovery comparison",
    description="Evaluate one discovery model against known graph edges.",
    task=task,
    datasets=[
        (dataset, {"data": "file1", "ground_truth": "file2"}),
    ],
    models=[
        (model, {"alpha": 0.01}),
    ],
    metrics=[
        (metric, {"binarize": True}),
    ],
)
```

`Context.create(...)` expects these exact shapes:

- `task`: a `Task` instance;
- `datasets`: `(Dataset, mapping)` tuples;
- `models`: `(Model, hyperparameter_overrides)` tuples; and
- `metrics`: `(Metric, hyperparameter_overrides)` tuples.

Use `{}` when you want all model or metric defaults. Override names are validated against the `hyperparameters` declared in that component's manifest. Dataset mappings are validated when each scenario executes.

!!! note
    Constructing a component by ID downloads it immediately. Creating a context from four registry components can therefore make four authenticated network requests before `Context.create(...)` is called.

### Add a hyperparameter comparison

List the same model more than once with different override mappings:

```python
models = [
    (model, {"alpha": 0.01}),
    (model, {"alpha": 0.05}),
]
```

Each entry becomes a separate scenario for every dataset. Currently CausalBenchh do not accept a range expression and expand it automatically; enumerate the values you intend to run.

## Context configuration format

A serialized context uses direct hyperparameter values, whereas a model or metric manifest describes each hyperparameter's type, description, and default. This abbreviated example follows a static-discovery context sample:

```yaml
type: context
causalbench:
  major: '0'
  minor: '2'
  build: '4'
name: Static discovery comparison
description: Compare compatible discovery models and graph metrics.
task:
  id: 1
  version: 1
datasets:
  - id: 1
    version: 1
    mapping:
      data: file1
      ground_truth: file2
models:
  - id: 3
    version: 1
    hyperparameters:
      variant: original
      alpha: 0.01
      ci_test: fisherz
metrics:
  - id: 1
    version: 1
    hyperparameters:
      binarize: true
```

The `causalbench` block records the package version that created the context; `build: '4'` illustrates the published 0.2.4 release. Record your actual version. CausalBench requires matching `major.minor` values; the `build` value is recorded but is not part of the compatibility check.

## Execute a context

For a context created in memory or downloaded from the registry:

```python
run = context.execute()
```

Execution is sequential in CausalBench. Task, model, and metric code runs on your machine, and its Python dependencies must already be installed in the active environment.

## Inspect a run

Start with the human-readable summary:

```python
print(run)
```

The structured object contains:

| Path | Contents |
| --- | --- |
| `run.context` | Context ID, version, and name. |
| `run.task` | Task ID, version, and name. |
| `run.results` | One result per dataset–model scenario. |
| `run.time` | Whole-context start, end, and duration values. |
| `run.profiling` | Platform, CPU, detected GPUs, disks, total memory, and total storage. |
| `result.dataset` | Dataset ID, version, and name. |
| `result.model` | Model metadata, hyperparameters, output, execution time, and resource profiling. |
| `result.metrics` | Metric metadata, hyperparameters, output, execution time, and resource profiling. |

Current timing values come from `time.time_ns()` and are therefore expressed in nanoseconds. Model and metric output values are converted to strings when `Context.execute()` prepares the run for serialization.

Example traversal:

```python
for result in run.results:
    print(result.dataset.name, result.model.name)
    print("scenario duration (ns):", result.time.duration)

    for metric in result.metrics:
        print(metric.name, metric.output["score"])
        print("metric duration (ns):", metric.time.duration)
```

## Fetch a published run

Runs use a run ID rather than an ID–version pair:

```python
from causalbench.modules import Run

run = Run(module_id=RUN_ID)
print(run)
```

## Publish in dependency order

Publishing is an external write. The default visibility is private:

```python
context.publish()          # private context
run.publish()              # private run
```

Pass `public=True` to request public visibility; the client asks for confirmation:

```python
context.publish(public=True)
run.publish(public=True)
```

In the checked 0.2 releases, declining that public confirmation falls back to a private upload rather than cancelling. Do not call `publish()` if you intend to make no remote change.

A context can be published only if its task, datasets, models, and metrics already have registry IDs. A run can be published only if its context has an ID and version. See [Reproducible experiments](reproducibility.md) before publishing publicly.

## Common composition failures

- **Model or metric not compatible with task:** its `task.id` or `task.version` differs from the selected task.
- **Mapping does not specify a field:** the task declares an input that is absent from the dataset mapping.
- **Mapped parameter does not exist:** the mapping names a dataset file alias that is not present in the dataset package.
- **Mapped parameter has the wrong type:** the dataset file loaded as a different CausalBench format than the task requires.
- **Unknown hyperparameter:** an override key is not declared in the model or metric manifest.

See [Troubleshooting](troubleshooting.md) for corrective steps.
