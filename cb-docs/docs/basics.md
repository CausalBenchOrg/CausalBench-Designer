# Glossary

This glossary uses the terminology in the CausalBench framework paper and existing `causalbench-asu` releases (0.2.5).

## Benchmark

A general term for the evaluation process. In precise instructions, prefer **context** for the experiment recipe, **scenario** for one dataset–model execution, and **run** for recorded execution results.

## Component

A versioned CausalBench building block: a task, dataset, model, metric, or context. Dataset, model, metric, and task packages contain a `config.yaml` manifest plus any referenced payload files.

## Context

A reusable benchmark recipe that selects one task, datasets and their file mappings, models and their resolved hyperparameters, and metrics and their resolved hyperparameters. A context contains no measured results until it is executed.

## Dataset

One or more data files plus metadata that tells CausalBench how to load them. A dataset can expose tabular data, a static graph, a temporal graph, or multiple named files. Context mappings connect these file aliases to task inputs.

## DOI

A Digital Object Identifier for a durable research record. The CausalBench paper states that public benchmark runs are registered with Zenodo and assigned DOIs. Verify that the hosted service actually assigned and resolved a DOI before citing it.

## Ground truth

Reference information used by a metric to evaluate a model output. For causal discovery this is often a known causal graph. Ground truth can be incomplete, uncertain, or unavailable for real-world data, so its provenance and limitations are part of the experiment.

## Hyperparameter

A named setting declared by a model or metric. Its component manifest records metadata and a default under `value`; a context records the value selected for a particular experiment.

## Instrumented context

The paper's term for a context coupled to the hardware and software system on which its scenarios execute. The system is part of the experimental conditions, especially for timing and resource comparisons.

## Mapping

A dictionary that connects task input names to dataset file aliases. For example, `{"data": "file1", "ground_truth": "file2"}` sends two files from a dataset to the inputs declared by a task.

## Metric

A Python evaluator that consumes model output and, when required by the task, dataset-derived values such as ground truth. A metric package declares its compatible task ID/version and optional hyperparameters. The upstream metric fixtures conventionally return `{"score": value}`.

## Model

A Python implementation whose top-level `execute(...)` function consumes task-defined inputs and produces task-defined outputs. A model package declares the exact task ID and version it implements and any configurable hyperparameters.

## Module ID

The registry identifier exposed as `module_id` in the Python API. Pair a component ID with its version when identifying a task, dataset, model, metric, or context.

## Registry

The hosted CausalBench service used to discover, download, and publish components, contexts, and runs. Registry operations require authentication and network access; model and metric execution happens locally.

## Result

The record produced by one scenario inside a run, including its dataset and model identity, model execution details, and metric evaluations. The paper also uses **Result ID** for a registered fine-grained dataset–model–metric outcome.

## Run

The record returned by `Context.execute()`. It groups all scenario results with context/task identity, overall timing, and system profiling. A local run has no registry Run ID until it is published.

## Scenario

One dataset–model combination expanded from a context, evaluated with all metrics selected by that context. The scenario count is the number of dataset entries multiplied by the number of model entries.

## Task

The contract connecting datasets, models, and metrics. A task declares named, typed dataset inputs for models and metrics, named model outputs for metrics, and shared helper functions. Compatibility is tied to the task's registry ID and version, not only its name.

## Version

A registry component revision. This is distinct from the installed `causalbench-asu` package version. Component manifests also include a `causalbench` compatibility block; CausalBench compares its major and minor values while loading.

## Visibility

Whether a published record is private or public. `publish()` defaults to private; `publish(public=True)` asks for interactive confirmation. Public publication can carry disclosure, permanence, and DOI implications.

For the relationships among these terms, see [Core concepts](concepts.md). To author a component, start with the [dataset](modules/datasets.md), [model and metric](modules/models-metrics.md), or [task](modules/tasks.md) guide.
