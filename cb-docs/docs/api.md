# Python API reference

This page documents the public classes used in normal CausalBench workflows. Last updated for: `causalbench-asu` 0.2.5 

## Imports

All module classes are re-exported from `causalbench.modules`:

```python
from causalbench.modules import Context, Dataset, Metric, Model, Run, Task
```

The installed distribution is named `causalbench-asu`, but the import package is named `causalbench`.

## Shared module lifecycle

`Task`, `Dataset`, `Model`, `Metric`, and `Context` share the same constructor pattern:

```text
Module(module_id: int | None = None,
          version: int | None = None,
          zip_file: str | None = None)
```

Use exactly one loading mode:

```python
# Fetch a registered module.
dataset = Dataset(module_id=DATASET_ID, version=DATASET_VERSION)

# Load and validate a local package.
dataset = Dataset(zip_file="path/to/dataset.zip")
```

Existing module ID's and Versions can be checked at the [CausalBench website](https://causalbench.org). 

Remote loading authenticates, downloads the requested archive, extracts it below `~/.causalbench/`, reads `config.yaml`, validates its JSON schema, and checks `major.minor` package compatibility. Local loading extracts to a temporary directory and performs the same manifest validation without a registry request.

Task, model, and metric Python files are dynamically imported in the current process. They are not sandboxed; inspect contributed code before calling `Task.load()`, `Context.execute()`, `Model.execute()`, or `Metric.evaluate()`.

### `publish`

```text
module.publish(public: bool = False) -> bool
```

- The default is a private upload.
- `public=True` triggers an interactive confirmation; declining falls back to a private upload rather than cancelling in the checked releases.
- Republishing an object that already has both an ID and a version triggers an overwrite confirmation.
- On success, the object receives the returned `module_id` and `version`, and the method returns `True`.
- A Zenodo record is automatically created for the publicly shared modules.

Publishing changes remote state. Public records can have stronger permanence expectations than private records; read [Reproducible experiments](reproducibility.md) first.

## `Task`

```python
Task(module_id=None, version=None, zip_file=None)
```

A task supplies the typed wiring contract between datasets, models, and metrics.

| Method | Returns | Purpose |
| --- | --- | --- |
| `load()` | `AbstractTask` implementation | Import the manifest's Python file and instantiate `class_name`. |
| `publish(public=False)` | `bool` | Upload the task package. |

The loaded implementation provides `helpers()`, `model_data_inputs()`, `metric_data_inputs()`, and `metric_model_inputs()`. See [Tasks and data contracts](modules/tasks.md).

## `Dataset`

```python
Dataset(module_id=None, version=None, zip_file=None)
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `load()` | `Bunch` | Load each configured file under its logical alias. |
| `publish(public=False)` | `bool` | Upload the dataset package. |

CSV files load into one of the CausalBench format wrappers according to their manifest:

| Manifest `data` value | Python wrapper |
| --- | --- |
| `dataframe` | `SpatioTemporalData` |
| `graph.static` | `SpatioTemporalGraph`, converted from an adjacency matrix |
| `graph.temporal` | `SpatioTemporalGraph`, loaded from an edge table |

Example:

```python
dataset = Dataset(zip_file="dataset.zip")
files = dataset.load()
print(files.file1.data.head())
```

See [Dataset packages](modules/datasets.md) for the manifest schema.

## `Model`

```python
Model(module_id=None, version=None, zip_file=None)
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `execute(parameters)` | `Bunch` | Invoke the package's top-level `execute(...)` function and add timing/resource profiling. |
| `publish(public=False)` | `bool` | Upload the model package. |

`parameters` is normally assembled by a scenario from task inputs, context hyperparameters, and task helpers. Calling this method directly is an advanced workflow because you must satisfy that complete contract yourself.

## `Metric`

```python
Metric(module_id=None, version=None, zip_file=None)
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `evaluate(parameters)` | `Bunch` | Invoke the package's top-level `evaluate(...)` function and add timing/resource profiling. |
| `publish(public=False)` | `bool` | Upload the metric package. |

As with `Model.execute`, contexts normally assemble the parameter mapping. Model and metric return values must be dictionaries or `Bunch` objects.

## `Context`

```python
Context(module_id=None, version=None, zip_file=None)
```

### Download a context

```python
context = Context(module_id=CONTEXT_ID, version=CONTEXT_VERSION)
```

### Create a context

```python
context = Context.create(
    name="Experiment name",
    description="Question this benchmark tests.",
    task=task,
    datasets=[(dataset, {"data": "file1", "ground_truth": "file2"})],
    models=[(model, {})],
    metrics=[(metric, {})],
)
```

Every dataset, model, and metric entry is a tuple. Empty override dictionaries select the module defaults.

### Execute

```python
run = context.execute()
```

`execute()` returns a new, unpublished `Run`. It expands every dataset–model pair, executes scenarios sequentially, evaluates all selected metrics, and records system information. See [Contexts and runs](contexts.md).

## `Run`

```text
Run(module_id: int | None = None, zip_file: str | None = None)
```

Unlike other registry objects, a run is fetched by run ID without a public `version` argument:

```python
run = Run(module_id=RUN_ID)
print(run)
```

`str(run)` and `print(run)` produce a compact summary. The structured fields are described under [Inspect a run](contexts.md#inspect-a-run).

`run.publish()` is rejected when the run was generated from an unpublished context.

## Data formats

```python
from causalbench.formats import SpatioTemporalData, SpatioTemporalGraph
```

### `SpatioTemporalData`

Wraps a pandas `DataFrame` in `.data` and tracks optional semantic columns through `.index`:

- `target`
- `time`
- `location`

`copy(deep=False)` returns a shallow copy; pass `deep=True` to copy the underlying frame.

### `SpatioTemporalGraph`

Wraps a graph edge-table `DataFrame` in `.data`. Its semantic index can identify:

- `cause` and `effect`;
- `location_cause` and `location_effect`;
- `strength`; and
- `lag`.

The `.nodes` property returns the sorted union of cause and effect values. Static adjacency matrices are converted to this common edge-table representation when a dataset loads.

## Result containers

CausalBench uses `bunch_py3.Bunch`, a mapping that also supports attribute-style access:

```python
name_a = run.context.name
name_b = run.context["name"]
assert name_a == name_b
```

`Run` itself is not a mapping; mapping access applies to its nested `Bunch` containers. Prefer documented field names. Treat other attributes and modules under `causalbench.commons` or `causalbench.services` as internal implementation details.

## Failure behavior

Schema, compatibility, authentication, and HTTP failures are logged by the CausalBench. For common messages and fixes, see [Troubleshooting](troubleshooting.md).
