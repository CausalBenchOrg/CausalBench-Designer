# Authoring tasks

This page describes the task module. A task does not implement a learning algorithm. It defines how datasets, models,
and metrics connect: their named inputs, runtime types, and shared helper
functions.

> Examples in these authoring guides span temporal discovery, static discovery,
> regression, and classification. Treat them as independent patterns unless
> their manifests reference the same published task ID and version.

## Package layout

A task package contains its manifest and an importable Python module:

```text
regression_task/
├── config.yaml
└── regression.py
```

Zip the contents of the directory so that both files are at the archive root:

```bash
cd regression_task
zip -r ../regression_task.zip .
```

## Task manifest

```yaml
causalbench:
  major: '0'
  minor: '2'
  build: '4'
type: task
name: Regression
source: N/A
url: N/A
description: Predict a continuous target from input features.
path: regression.py
class_name: Regression
```

The `build: '4'` value illustrates the published 0.2.4 package used to check this guide. Use the full version of the package that creates your task; the current compatibility check compares only `major.minor`.

All fields shown above are required by the checked 0.2 schema:

| Field | Meaning |
| --- | --- |
| `causalbench` | Compatibility version with string-valued `major`, `minor`, and `build`. The loader compares major and minor with the installed package. |
| `type` | Must be `task`. |
| `name`, `source`, `url`, `description` | Required descriptive strings. Use a string such as `N/A` when a source or URL does not apply. |
| `path` | Python file that defines the task class. |
| `class_name` | Exact name of the class CausalBench imports and instantiates. |

`class_name`, rather than `class`, is the manifest key used by both checked releases.

## Implement the contract

The configured class must inherit `AbstractTask` and implement four methods:

```python
from typing import Any

import pandas as pd

from causalbench.formats import SpatioTemporalData
from causalbench.modules.task import AbstractTask


class Regression(AbstractTask):
    def helpers(self) -> Any:
        return Helpers

    def model_data_inputs(self) -> dict[str, type]:
        return {"data": SpatioTemporalData}

    def metric_data_inputs(self) -> dict[str, type]:
        return {"ground_truth": SpatioTemporalData}

    def metric_model_inputs(self) -> dict[str, type]:
        return {"prediction": SpatioTemporalData}


class Helpers:
    @staticmethod
    def get_features(data: SpatioTemporalData) -> pd.DataFrame:
        return data.data.loc[:, data.data.columns != data.target]

    @staticmethod
    def get_target(data: SpatioTemporalData) -> pd.Series:
        return data.data.loc[:, data.target]

    @staticmethod
    def set_target(data: SpatioTemporalData, target) -> None:
        data.data.loc[:, data.target] = target
```

The methods have distinct roles:

| Method | What its mapping declares |
| --- | --- |
| `model_data_inputs()` | Dataset-derived inputs passed to a model's `execute`. |
| `metric_data_inputs()` | Dataset-derived inputs passed directly to a metric's `evaluate`. |
| `metric_model_inputs()` | Model outputs passed to a metric's `evaluate`. |
| `helpers()` | A class or object passed to both entry points as `helpers`. |

Each input mapping is `name -> Python type`. These names become keyword
arguments, so they must match the corresponding model and metric signatures.
Helper names are task-defined rather than framework-defined; compatible models
and metrics must use the API exposed by their task.

## How mappings are resolved

Suppose the task declares the three inputs in the example above and a dataset
contains `file1`. A supervised-learning context can map both dataset-derived
fields to that file:

```python
dataset_mapping = {
    "data": "file1",
    "ground_truth": "file1",
}
```

The complete flow is:

```text
dataset file1 --mapping["data"]----------> model execute(data=...)
dataset file1 --mapping["ground_truth"]--> metric evaluate(ground_truth=...)

model returns {"prediction": value}
                  |
                  +--> metric evaluate(prediction=value)
```

For every declared dataset input, CausalBench verifies that:

1. the context mapping contains the task field;
2. the mapped dataset alias exists; and
3. the loaded object is an instance of the declared type.

For every declared model input to a metric, it verifies that the model output
contains the same key and has the declared type. Every mapped object is deep
copied before it is passed to component code. There is no context-level rename
for model outputs in the checked 0.2 releases, so `metric_model_inputs()` and the model's returned
dictionary must use identical names.

For a published context, the mapping appears in its dataset entry:

```yaml
datasets:
- id: 1473
  version: 1
  mapping:
    data: file1
    ground_truth: file1
```

## Runtime formats

The checked CausalBench 0.2 releases expose two component-facing formats:

| Class | Payload and semantic indexes |
| --- | --- |
| `SpatioTemporalData` | `.data` is a pandas `DataFrame`; indexes are `target`, `time`, and `location`. |
| `SpatioTemporalGraph` | `.data` is an edge-list `DataFrame`; indexes are `cause`, `effect`, `location_cause`, `location_effect`, `strength`, and `lag`; `.nodes` returns the sorted union of cause/effect values. |

Both formats provide `.copy(deep=True)`. Dataset manifests establish their
semantic indexes; see [Authoring datasets](datasets.md).

A static causal-discovery task, for example, can declare:

```python
from causalbench.formats import SpatioTemporalData, SpatioTemporalGraph

def model_data_inputs(self) -> dict[str, type]:
    return {"data": SpatioTemporalData}

def metric_data_inputs(self) -> dict[str, type]:
    return {"ground_truth": SpatioTemporalGraph}

def metric_model_inputs(self) -> dict[str, type]:
    return {"prediction": SpatioTemporalGraph}
```

The temporal-discovery task fixture in the upstream source uses the same types and names, but its
helpers convert between an edge list and one adjacency matrix per lag. Its graph
rows use these fields:

```text
cause, effect, location_cause, location_effect, strength, lag
```

Keep format conversion in task helpers when multiple models and metrics need the
same behavior. This makes their entry points smaller and gives all compatible
components one representation contract.

## Compatibility uses the published task identity

Every model and metric manifest contains:

```yaml
task:
  id: 5
  version: 1
```

During a context run, both values must exactly match the selected `Task` object's
`module_id` and `version`. A matching class name, description, or input shape is
not sufficient. A new task version therefore needs model and metric packages
that explicitly target that version.

Because a task loaded only from a local ZIP has no published ID/version, use
direct component smoke tests until the task contract is published. After the
task has an identity, you can run an integrated context with compatible local
dataset, model, and metric ZIPs before publishing those components. Publishing
the context itself requires every selected component to have a registry ID.

## Load and validate a local task

Constructing `Task` validates the manifest and its CausalBench version. Calling
`load()` imports `path`, resolves `class_name`, and instantiates the class:

```python
from causalbench.formats import SpatioTemporalData
from causalbench.modules import Task

task_module = Task(zip_file="regression_task.zip")
task = task_module.load()

assert task.model_data_inputs() == {"data": SpatioTemporalData}
assert task.metric_data_inputs() == {"ground_truth": SpatioTemporalData}
assert task.metric_model_inputs() == {"prediction": SpatioTemporalData}

helpers = task.helpers()
print(helpers.get_features)
```

Before publishing, exercise every helper with representative format objects and
run at least one compatible model/metric smoke test. The checked 0.2 task class does
not add logical checks beyond schema validation and dynamic import, so these
tests are where misspelled field names, wrong return types, and incomplete
helpers are caught.

Publishing is authenticated and assigns the identity that compatible component
manifests must reference:

```python
task_module.publish(public=False)
```

See [Authoring models and metrics](models-metrics.md) for direct entry-point
tests and the corresponding manifest contracts.
