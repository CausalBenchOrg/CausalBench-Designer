# Troubleshooting

Start with the exact message immediately before a traceback or stopped notebook cell. CausalBench logs several validation and service errors and before raising in order to assist troubleshooting.

## Installation and imports

### `No matching distribution found`

Check the interpreter and package name:

```bash
python --version
python -m pip install --upgrade causalbench-asu
```

CausalBench requires Python 3.10 or newer. The PyPI name is `causalbench-asu`, not `causalbench`.

### `ModuleNotFoundError: No module named 'causalbench'`

`pip` may have installed into a different interpreter. Compare these paths:

```bash
python -m pip --version
python -c "import sys; print(sys.executable)"
python -m pip show causalbench-asu
```

Activate the intended virtual environment and reinstall with `python -m pip ...`.

### A component reports a missing third-party module

Contributed task, model, and metric files can import libraries that are not core CausalBench dependencies. Inspect the component's imports, source link, and upstream installation instructions; verify the package name and publisher before installing it into the same environment. Record the installed dependency version with your experiment notes.

Do not install an unfamiliar package solely because arbitrary downloaded code requested it.

## Authentication and network access

### Repeated `Incorrect CausalBench credentials`

Confirm that the account works at [causalbench.org](https://causalbench.org). Then inspect `~/.causalbench/config.yaml` and correct the `email` and `password` values. To force a clean prompt while preserving the old file, rename it:

```bash
mv ~/.causalbench/config.yaml ~/.causalbench/config.yaml.backup
```

On Windows, the directory is `.causalbench` inside your user profile. Never include this file in a bug report.

### HTTP 403 or a package-version message

The service can reject a client with an unsupported package line. Upgrade and verify the installed version:

```bash
python -m pip install --upgrade causalbench-asu
python -c "from importlib.metadata import version; print(version('causalbench-asu'))"
```

### Connection, DNS, proxy, or certificate errors

Registry operations call `https://causalbench.org/api`. Confirm that the website is reachable from the same machine and network. Corporate proxies and TLS inspection can require organization-specific certificate configuration; do not disable certificate verification as a workaround.

## Component validation

### `Configuration validation error`

The package found `config.yaml`, but it does not match the schema for that component type. Check that:

- `config.yaml` is at the root of the ZIP, not inside an extra directory;
- `type` matches the class used to load it;
- the `causalbench` block contains string values for `major`, `minor`, and `build`;
- every required metadata and path field is present; and
- YAML values have the intended types (`true`, not `"true"`, for a boolean).

Compare the manifest with the relevant [dataset](modules/datasets.md), [model/metric](modules/models-metrics.md), or [task](modules/tasks.md) guide.

### `Installed CausalBench ... is incompatible with ...`

The manifest's `causalbench.major.minor` does not match the installed package's major/minor release. Use a compatible published component, or update and retest a component you maintain. Do not change the version block just to suppress the check—the component contract may actually have changed.

### `File '...' does not exist in package path`

This exact construction-time message comes from metric validation. The manifest's `path` is relative to the ZIP root; check spelling and capitalization and make sure the referenced metric Python file was included. Task, model, and dataset paths are accessed later and can fail with different import or file-reading errors, so verify those archive contents explicitly too.

### Dataset type, label, or range mismatch

`Dataset.load()` validates pandas dtypes and optional constraints:

- `integer` columns must load with an integer dtype;
- `decimal` columns must load with a floating dtype;
- configured `labels` must match observed values; and
- observed minima and maxima must fall inside a configured `range`.

Missing values can cause pandas to promote an otherwise integer column to floating point. Clean the data or describe its actual storage type rather than weakening validation without review.

## Context composition

### `Model/Metric ... not compatible with task ...`

The model's `task.id` and `task.version` must exactly match the context task. The same rule applies to metrics as well. Select compatible registry versions or publish a deliberately updated component.

### `Mapping does not specify a ... field`

The task declares an input name that is absent from the dataset mapping. For example, a discovery metric might require both:

```python
{"data": "file1", "ground_truth": "file2"}
```

The keys come from the task contract; the values are aliases in the dataset's `files` mapping.

### `Parameter ... does not exist` or has the wrong type

Verify that the mapped alias exists and loads as the format requested by the task. For example, `data: dataframe` loads as `SpatioTemporalData`, while `data: graph.static` and `data: graph.temporal` load as `SpatioTemporalGraph`.

### `Unknown model hyperparameter` or `Unknown metric hyperparameter`

Override only names declared under `hyperparameters` in that component's manifest. Pass `{}` to use every default.

### The run is larger than expected

A context executes the Cartesian product of dataset and model entries, then evaluates every metric in every scenario:

```text
scenario count = number of dataset entries × number of model entries
metric calls   = scenario count × number of metric entries
```

Reduce the context before debugging an expensive run.

## Execution and results

### `Unexpected output type`

A model's `execute(...)` or metric's `evaluate(...)` returned an unsupported value. It must return a `dict` or `Bunch`. Models should use the output names declared by the task, and metrics intended for normal run summaries should return a `score` key.

### No GPU appears in profiling

GPU discovery is best-effort and depends on the hardware, drivers, OpenCL visibility, and vendor libraries available to the environment. CPU-only execution can still be valid if the selected component supports it. Record the absence of GPU data rather than assuming that an undetected device was used.

### Scores appear as strings

`Context.execute()` converts model and metric output values to strings before returning the run. Convert a value explicitly for downstream analysis:

```python
score = float(result.metrics[0].output["score"])
```

### `Cannot publish context as it contains unpublished ...`

Publish the task, every dataset, every model, and every metric first. Then recreate the context so it snapshots the assigned IDs and versions; there is no context refresh method in the checked client.

### `Cannot publish run as it is generated by an unpublished context`

Publish the context before executing the run. A run created earlier from an in-memory, unpublished context does not gain that context ID retroactively; execute the published context again.

## Publishing safety

- `publish()` is private by default.
- `publish(public=True)` asks for confirmation; answering no still uploads privately.
- publishing an existing ID and version asks before overwrite.
- public components included in public runs and public run records achieve permanence through creating a record and assigning a DOI for the run on Zenodo.

If you are uncertain, publish privately and inspect the uploaded record first. See [Reproducible experiments](reproducibility.md).

## Collect diagnostics for a report

Include:

```bash
python --version
python -c "from importlib.metadata import version; print(version('causalbench-asu'))"
```

Also include your operating system, the component/context IDs and versions, the smallest code sample that fails, and the full error text. Remove credentials, private dataset contents, access tokens, and identifying paths.

Report package defects in the [CausalBench issue tracker](https://github.com/CausalBenchOrg/CausalBench/issues) or contact `support@causalbench.org` for account and service questions.
