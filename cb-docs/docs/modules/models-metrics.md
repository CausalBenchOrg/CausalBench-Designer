# Authoring models and metrics

This page describes model and metric packages shared by CausalBench.
Both package types contain a manifest and a Python entry point. CausalBench calls
the entry point with task inputs, configured hyperparameters, and task-specific
helpers.

> Examples in these authoring guides demonstrate individual schemas and
> function signatures across different tasks; they are not one runnable set.
> Older manifests can also predate the required `causalbench` block, which the
> corrected examples below include.

## How arguments flow

For each dataset-model scenario, CausalBench assembles keyword arguments in this
order:

```text
task model-data inputs + model hyperparameters + helpers
    -> model execute(...)
    -> model output dictionary

task metric-data inputs + selected model outputs + metric hyperparameters + helpers
    -> metric evaluate(...)
    -> metric output dictionary
```

Names are part of the contract. An `execute` parameter must match either a task
input, a model hyperparameter, or `helpers`. A model output required by a metric
must use the exact name declared by the task. The regression and causal-
discovery fixtures in the upstream source use `prediction`.

## Model packages

A model zip has this layout:

```text
decision_tree/
├── config.yaml
└── decision_tree.py
```

As with every component package, zip the contents so that `config.yaml` is at
the archive root.

### Model manifest

This compact example follows the source-tree decision-tree fixture and includes
the version block required by the current schema (v0.2):

```yaml
causalbench:
  major: '0'
  minor: '2'
  build: '4'
type: model
name: Decision Tree Regressor
source: scikit-learn
url: https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeRegressor.html
description: Decision-tree regression example.
task:
  id: 5
  version: 1
path: decision_tree.py
hyperparameters:
  max_depth:
    data: integer
    description: Maximum depth, or null for no explicit limit.
    value: null
  random_state:
    data: integer
    description: Random seed.
    value: 0
```

The `build: '4'` value illustrates the published 0.2.4 package used to check this guide. Use the full version of the package that creates your component; the current compatibility check compares only `major.minor`.

Replace the task ID and version with the published task this model implements.
They are not labels: the runtime requires both values to exactly match the task
selected by the context.

The following top-level fields are required:

| Field | Meaning |
| --- | --- |
| `causalbench` | String-valued `major`, `minor`, and `build` compatibility version. |
| `type` | Must be `model`. |
| `name`, `source`, `url`, `description` | Required descriptive strings. |
| `task.id`, `task.version` | Exact published task identity. Both are integers. |
| `path` | Python file containing `execute`. |

`hyperparameters` is optional. Each declared hyperparameter requires `data` and
`value`; `description` is optional. Accepted `data` labels are `string`,
`integer`, `decimal`, `boolean`, and `object`. A default `value` can be `null`,
a scalar, an array, or an object.

### Model entry point

`decision_tree.py` can be:

```python
from typing import Any

from sklearn.tree import DecisionTreeRegressor


def execute(data, max_depth, random_state, helpers: Any):
    features = helpers.get_features(data)
    target = helpers.get_target(data)

    estimator = DecisionTreeRegressor(
        max_depth=max_depth,
        random_state=random_state,
    )
    estimator.fit(features, target)

    helpers.set_target(data, estimator.predict(features))
    return {"prediction": data}
```

The runtime dynamically imports `path` and calls its top-level `execute`
function with keyword arguments. The function must return either a `dict` or a
`bunch_py3.Bunch`. CausalBench wraps that value as `response.output`.

The model receives a deep copy of each mapped dataset input. The example can
therefore replace the target column without modifying the copy retained for the
metric. Return types still matter: here, the regression task requires
`prediction` to be a `SpatioTemporalData` object.

Install third-party dependencies such as scikit-learn in the execution
environment. A component zip contains source and configuration; it does not
install imported packages for you.

## Metric packages

A metric has the same two-file shape:

```text
r2_score/
├── config.yaml
└── r2_score_metric.py
```

### Metric manifest

```yaml
causalbench:
  major: '0'
  minor: '2'
  build: '4'
type: metric
name: r2score_regression
source: scikit-learn
url: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.r2_score.html
description: Coefficient of determination for regression; higher is better.
task:
  id: 5
  version: 1
path: r2_score_metric.py
hyperparameters:
  sample_weight:
    data: object
    description: Optional sample weights.
    value: null
  multioutput:
    data: object
    description: Multi-output aggregation mode or output weights.
    value: uniform_average
```

The required top-level fields are the same as for a model, except `type` must be
`metric`. Its `task` reference is checked just as strictly. The hyperparameter
schema and default-value rules are also the same.

### Metric entry point

`r2_score_metric.py` can be:

```python
from typing import Any

from sklearn.metrics import r2_score


def evaluate(
    prediction,
    ground_truth,
    sample_weight,
    multioutput,
    helpers: Any,
):
    predicted_target = helpers.get_target(prediction)
    true_target = helpers.get_target(ground_truth)

    score = r2_score(
        true_target,
        predicted_target,
        sample_weight=sample_weight,
        multioutput=multioutput,
    )
    return {"score": score}
```

CausalBench dynamically imports `path` and calls the top-level `evaluate`
function. It must return a `dict` or `Bunch`; `{"score": value}` is the standard
shape used by the source-tree metric fixtures. Keep the metric's description aligned with
what its implementation actually computes, and explicitly define edge-case
behavior such as an undefined denominator.

## Defaults and context overrides

A component manifest describes each hyperparameter and supplies its default
under `value`. A context stores only the selected runtime values:

```python
models=[
    (model, {"max_depth": 4, "random_state": 42}),
]
metrics=[
    (metric, {"multioutput": "uniform_average"}),
]
```

`Context.create()` starts with every manifest default and applies these
overrides. It rejects unknown hyperparameter names. The entry-point signature
must accept every resulting name. Current context construction checks names but
does not enforce the manifest's declared `data` type, so validate values in your
own smoke tests and, where appropriate, in the component code.

## Task compatibility

At scenario execution time, CausalBench requires:

```text
model.task.id      == context task module_id
model.task.version == context task version
metric.task.id      == context task module_id
metric.task.version == context task version
```

It then type-checks mapped dataset inputs and model outputs against the runtime
classes returned by the task's contract methods. Matching names alone are not
enough. See [Authoring tasks](tasks.md) for a complete mapping example.

## Load and smoke-test local zips

Constructing a component from `zip_file` extracts it into a temporary directory,
validates its manifest, and checks CausalBench major/minor compatibility:

```python
from causalbench.modules import Metric, Model

model = Model(zip_file="decision_tree.zip")
metric = Metric(zip_file="r2_score.zip")
```

In both checked releases, `Metric` also checks that its configured Python file exists. The model
class does not perform that additional path check during construction, so verify
the path by running a smoke test.

You can test model and metric entry points directly without publishing a
context:

```python
from bunch_py3 import Bunch
from causalbench.modules import Dataset, Metric, Model, Task

task = Task(zip_file="regression_task.zip").load()
files = Dataset(zip_file="regression_data.zip").load()
model = Model(zip_file="decision_tree.zip")
metric = Metric(zip_file="r2_score.zip")

ground_truth = files.file1.copy(deep=True)

model_result = model.execute(Bunch(
    data=files.file1.copy(deep=True),
    max_depth=4,
    random_state=42,
    helpers=task.helpers(),
))

metric_result = metric.evaluate(Bunch(
    prediction=model_result.output.prediction,
    ground_truth=ground_truth,
    sample_weight=None,
    multioutput="uniform_average",
    helpers=task.helpers(),
))

print(metric_result.output.score)
```

This direct test exercises the package code and data-format contract. For an
integrated `Context.execute()` test, select a `Task` with a published ID/version
matching the `task` references in the local model and metric manifests. The
dataset, model, and metric objects may still come from local ZIPs. They need
registry IDs only when you intend to publish the context.
