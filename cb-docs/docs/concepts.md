# How CausalBench Fits Together

CausalBench is infrastructure for constructing, executing, and comparing causal-learning benchmarks. It connects reusable datasets, model implementations, metrics, and task definitions, then records enough information about an execution to make the comparison inspectable.

It is not itself a causal discovery algorithm, and a successful run does not establish that a causal conclusion is valid. The assumptions of the selected model, the quality of the data and ground truth, and the suitability of the metrics still matter.

> **Version note:** This documentation was verified against the published `causalbench-asu` 0.2.5 package. Check your installed version when exact behavior matters.

## The CausalBench Experiment Structure

A useful way to think about CausalBench is as a progression from reusable building blocks to recorded evidence:

```text
Task
    + datasets and file mappings
    + models and model settings
    + metrics and metric settings
              |
              v
           Context
              |
              | expands during execution
              v
 Scenario: one dataset + one model + all selected metrics
              |
              | executes on your hardware and software
              v
 Run: scenario outputs + timing + resource and system metadata
              |
              | optionally publish
              v
     Private or public repository record
```

The [CausalBench paper](files/papers/CausalBench_Unifying.pdf#page=3) expresses the same idea formally: a context is a set of benchmark scenarios, an *instrumented context* couples those scenarios to a particular system, and a run records their outputs.

## The Building Blocks

### Task

A **task** defines the contract shared by the other components. It specifies:

- which typed dataset values a model receives;
- which dataset values a metric receives;
- which model outputs a metric receives; and
- optional helpers that models and metrics can share.

For example, a temporal causal discovery task may send time-series `data` to a model, send a `ground_truth` graph to a metric, and connect the model's `prediction` graph to that metric.

The task describes how components connect. It does not choose a dataset, model, or metric for an experiment.

### Dataset

A **dataset** packages one or more named files with metadata describing how to load them. Depending on the task, those files can include observational data, a static graph, a temporal graph, or ground truth used only during evaluation.

A context maps the task's logical input names to files in the dataset. For example:

```yaml
mapping:
  data: file1
  ground_truth: file2
```

This mapping lets datasets use stable file names while tasks use meaningful input names.

### Model

A **model** is a Python implementation that consumes the inputs defined by its task and produces task-specific output. Its package records the task ID and version it supports, its implementation path, and any declared hyperparameters.

In a causal discovery task, the output is commonly a predicted causal graph. Other tasks can define different contracts.

### Metric

A **metric** is a Python implementation that evaluates model output, often with additional data such as ground truth. Like a model, it declares a compatible task ID and version and can define its own hyperparameters.

Metric scores answer a particular evaluation question; they are not interchangeable. For example, edge-classification scores and structural graph distances emphasize different errors.

### Context

A **context** is the benchmark recipe. It selects:

- one task contract and its identity;
- one or more datasets and their input mappings;
- one or more models and resolved hyperparameter values; and
- one or more metrics and resolved hyperparameter values.

Registered components are identified by ID and version. Local dataset, model, and metric ZIPs can also participate in an unpublished context; identify those artifacts by their source revision and checksum. Integrated execution normally needs a registered task identity because model and metric manifests must reference its numeric ID and version.

A context contains no results until it is executed. Keeping the context separate from the run makes the same recipe reusable on another system.

### Scenario

A **scenario** is one executable dataset-model combination from a context. `Context.execute()` creates one scenario for each selected dataset-model pair. Each scenario runs the model once and evaluates all metrics selected by the context.

Model and metric settings belong to their entries in the context. To compare multiple configurations of the same implementation, include the configurations explicitly in the experiment design rather than treating a single recorded setting as an implicit search space.

### Instrumented Context and Run

The paper calls a context coupled to a particular hardware and software system an **instrumented context**. In practical terms, calling `context.execute()` turns the recipe into work performed on the current machine.

The returned **run** groups:

- the context and task identity;
- one result for every scenario;
- string representations of model outputs and metric scores in the returned run;
- model, metric, scenario, and overall timing; and
- hardware, software, memory, GPU, and disk profiling where available.

The paper groups these outcomes into evaluation values, timing values, and system-resource values. Keeping them distinct is important: two systems can produce the same graph score but take different amounts of time or memory. The checked client stringifies model and metric output values at the end of `Context.execute()`, so inspect or persist structured predictions inside a direct component test or compatible metric when you need the graph itself.

### Run ID and Result ID

These identifiers refer to different levels of a published benchmark:

- A **Run ID** identifies the grouped execution of a context on a system.
- A **Result ID** identifies a finer-grained dataset-model-metric outcome within that run.

A local `Run` object exists before it has a repository Run ID. See [Reproducible Benchmarking](reproducibility.md) for publication and identity details.

## How Compatibility Works

Compatibility has several layers.

### 1. Task Identity

At execution time, the package requires every selected model and metric to declare the same task ID **and task version** as the context. A shared task name alone is not sufficient.

### 2. Named and Typed Inputs

The dataset mapping must provide every input named by the task. The mapped value must also have the expected CausalBench type. For example, a task expecting a temporal graph cannot consume an arbitrary dataframe in its place.

Model outputs are checked in the same way when they are routed into metrics. Missing names and incompatible types stop execution rather than silently changing the experiment.

### 3. Declared Settings

When a context is created through the Python API, model and metric setting names must be declared by their component configurations. Record the resolved values, including defaults, because they are part of the scenario.

### 4. Package Compatibility

Components record the CausalBench package version used to define them. CausalBench compares the package's major and minor version when loading a component. Recording the full package version is still preferable because build-level changes can matter to reproduction.

### Technical Compatibility Is Not Scientific Validity

Passing these checks means that components can exchange values through the selected task. It does not confirm that:

- a model's causal assumptions fit the data-generating process;
- a dataset has complete or reliable ground truth;
- a metric captures the error that matters for the research question; or
- two runs are statistically comparable.

Document these choices alongside the machine-readable context.

## Package and Repository Architecture

CausalBench has two cooperating surfaces:

- The **Python package** downloads or loads components, executes scenarios on local CPU/GPU resources, evaluates metrics, collects profiling data, and submits records.
- The **hosted repository and web interface** register versioned components and contexts, provide discovery and download, and let users browse and compare submitted runs.

Execution is local, so the user's machine is part of the experimental context. Authentication, component retrieval, and publication use the hosted service. A network connection is therefore needed for repository operations, but the expensive model and metric work runs on the local system.

## Product Scope

The framework is designed to support multiple causal-learning tasks through task-specific contracts. The upstream test fixtures and the paper's case studies emphasize:

- static causal discovery; and
- temporal causal discovery, including lag-aware graph evaluation.

The paper also discusses a broader direction covering causal inference, causal interpretability, and causally informed explanation and recommendation under the name CausalBench-ER. Some CausalBench-ER services are presented as future work in the paper. Treat feature availability as version-dependent and verify that the required task and components exist in the repository before designing a study around them.

## Where to Go Next

- [Install and configure CausalBench](install.md).
- [Execute a context in the quickstart](quickstart.md).
- Review the [dataset](modules/datasets.md), [model and metric](modules/models-metrics.md), and [task](modules/tasks.md) authoring guides.
- Use the [reproducibility guide](reproducibility.md) before sharing results.
