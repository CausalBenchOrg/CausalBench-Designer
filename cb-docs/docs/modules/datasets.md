# Authoring datasets

This page describes the dataset package format shared by the published version of CausalBench (0.2.4).
A dataset package combines a YAML manifest with one or more CSV files. When it is
loaded, CausalBench converts each CSV into one of its runtime data formats and
checks the declared columns.

> Examples in these authoring guides intentionally cover several different
> tasks. A classification dataset is not automatically compatible with a
> discovery task or regression component; connect packages only when they share
> a published task contract.

## Package layout

Place `config.yaml` and every referenced data file at the root of a directory:

```text
breast_cancer_small/
├── config.yaml
└── breast_cancer_small.csv
```

Zip the *contents* of that directory, not the directory itself. `config.yaml`
must therefore be at the archive root:

```bash
cd breast_cancer_small
zip -r ../breast_cancer_small.zip .
```

Paths in `config.yaml` are relative to the package root.

## A minimal tabular dataset

For example, `breast_cancer_small.csv` could contain:

```csv
mean radius,target
17.99,0
13.54,1
```

Its manifest is:

```yaml
causalbench:
  major: '0'
  minor: '2'
  build: '4'
type: dataset
name: breast_cancer_small
source: sklearn
url: https://scikit-learn.org/stable/datasets/toy_dataset.html#breast-cancer-wisconsin-diagnostic-dataset
description: Small classification example derived from the Wisconsin breast-cancer dataset.
files:
  file1:
    type: csv
    data: dataframe
    path: breast_cancer_small.csv
    headers: true
    index:
      target: target
    columns:
      mean_radius:
        header: mean radius
        type: ratio
        data: decimal
      target:
        header: target
        type: nominal
        data: integer
        labels: [0, 1]
```

A larger classification dataset can extend the same pattern with additional
decimal feature declarations and one integer target.

The `build: '4'` value illustrates the published 0.2.4 package used to check this guide. Record the full version of the package used to create your component instead of copying that build value blindly; the current loader enforces equality only for `major.minor`.

## Manifest reference

Current CausalBench (v0.2.4) schema requires these top-level fields:

| Field | Meaning |
| --- | --- |
| `causalbench` | Compatibility version. `major`, `minor`, and `build` are strings. The loader requires the installed package to have the same major and minor versions. |
| `type` | Must be `dataset`. |
| `name` | Dataset name displayed by CausalBench. |
| `source` | Source or publisher as a string. |
| `url` | Source URL as a string. |
| `description` | Human-readable description. |
| `files` | Mapping from logical file aliases to file definitions. |

Each entry below `files` requires:

| Field | Accepted values or purpose |
| --- | --- |
| `type` | `csv` |
| `data` | `dataframe`, `graph.static`, or `graph.temporal`. |
| `path` | Relative path to the CSV. |
| `columns` | Logical column names and their declarations. |

The schema makes `headers` optional, but the checked 0.2 implementation's
headerless path expects fields that the schema does not define and its numeric
validation still looks up headers. Treat `headers: true` plus a `header` for
every declared column as required until that mismatch is fixed.

Every column declaration requires `data`, with one of these values:

| Value | Loader behavior |
| --- | --- |
| `integer` | Requires a pandas integer dtype. |
| `decimal` | Requires a pandas floating-point dtype. |
| `string` | Loads the column without an additional dtype check. |

A column may also declare:

- `header`: the exact CSV header used by the loader;
- `type`: descriptive metadata such as `ratio` or `nominal`;
- `unit`: descriptive unit metadata;
- `labels`: the complete set of allowed integer labels;
- `range.start` and `range.end`: inclusive numeric bounds (include both whenever `range` is present); and
- `index`: a zero-based position represented in the schema, although headered


For integer and decimal columns, `labels` must exactly match the distinct values
present in the CSV. A declared range must contain both the observed minimum and
maximum. Be aware that missing values can cause pandas to infer a floating-point
dtype for an otherwise integer column.

## Runtime formats and indexes

The file-level `data` value controls what `Dataset.load()` returns:

| `data` value | CSV shape | Runtime object | Relevant indexes |
| --- | --- | --- | --- |
| `dataframe` | Ordinary rows and columns | `SpatioTemporalData` | `target`, `time`, `location` |
| `graph.static` | Square adjacency matrix; rows are causes, columns are effects, and the first CSV column contains row labels | `SpatioTemporalGraph` | Converted to canonical graph fields automatically |
| `graph.temporal` | Edge-list table | `SpatioTemporalGraph` | `cause`, `effect`, `location_cause`, `location_effect`, `strength`, `lag` |

!!! warning "Static graph row order"
    The checked loader reads the first CSV column as the pandas row index, but builds both cause and effect names from the remaining column headers. It does not verify the discarded row labels. Make the matrix square and order its rows exactly like its columns, or edges can be assigned to the wrong causes.

An `index` maps a semantic role to a logical name from `columns`. For example:

```yaml
index:
  target: outcome
columns:
  outcome:
    header: diagnosis
    data: integer
```

The resulting `SpatioTemporalData.target` is `"diagnosis"`, the actual pandas
column name. A temporal graph commonly uses:

```yaml
index:
  cause: cause
  effect: effect
  location_cause: location_cause
  location_effect: location_effect
  strength: strength
  lag: lag
```

The task and its models or metrics determine which indexes they actually need.

## File aliases and context mappings

Aliases such as `file1` are deliberately independent of task input names. A
context connects the two:

```python
datasets=[
    (dataset, {"data": "file1", "ground_truth": "file2"}),
]
```

Here, `data` and `ground_truth` are fields declared by the task, while `file1`
and `file2` are aliases from the dataset manifest. CausalBench checks that every
required field is mapped, that the alias exists, and that the loaded value has
the type declared by the task. It gives each consumer a deep copy of the mapped
object.

For supervised learning, a task can map both fields to the same file because the
model and metric receive separate copies:

```python
(dataset, {"data": "file1", "ground_truth": "file1"})
```

See [Authoring tasks](tasks.md) for the other half of this contract.

## Load and validate a local zip

Constructing `Dataset` validates `config.yaml` and its CausalBench version.
Calling `load()` reads the CSV files, creates runtime objects, and validates the
declared dtypes, labels, and ranges:

```python
from causalbench.modules import Dataset

dataset = Dataset(zip_file="breast_cancer_small.zip")
files = dataset.load()

observations = files.file1
print(observations.data.head())
print(observations.target)  # Actual target-column header
```

Before publishing, also confirm that:

- the archive opens with `config.yaml` at its root;
- every configured relative path exists;
- every context mapping names a real file alias; and
- every mapped object has the format required by the target task.

Publishing is a separate, authenticated operation:

```python
dataset.publish(public=False)
```

Passing `public=True` prompts for confirmation before requesting public
visibility.
