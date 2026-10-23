# CausalBench

CausalBench is an open benchmarking platform for evaluating causal-learning models with reusable datasets, metrics, and experiment definitions. It runs experiments on your own machine, records the software and hardware context, and lets collaborators reproduce a benchmark from versioned components.

!!! info "Beta software"
    CausalBench is under active development. These pages were checked against the published `causalbench-asu` 0.2.5 package. Registry contents and permissions are live service data, so component IDs shown in papers or tutorials may not be available to every account.

## What CausalBench provides

CausalBench has two cooperating parts:

| Part | What it does |
| --- | --- |
| [Web platform](https://causalbench.org) | Browse and design registered datasets, models, metrics, contexts, tasks, and benchmark results. In addition, Causal explanation and recommendation features are provided on the web platform. |
| [Python package](https://github.com/CausalBenchOrg/CausalBench) | Download components, execute scenarios locally, collect results and system metadata, and publish records. |

The platform is organized around a small set of versioned modules:

1. A **task** defines a task, alongside its expected input and outputs.
2. **Datasets**, **models**, and **metrics** implement related components of experiments. Datasets are task-agnostic, while models and metrics are bound to tasks.
3. A benchmark **context** includes a setup consisting of a number of datasets, models and metrics within a selected task, alongside their parameters and hyperparameters.
4. CausalBench expands the context into benchmark **scenarios** and executes them locally.
5. A **run** records the benchmark content, including accuracy, timing and system metric outputs, and execution and environment information.
6. Causal Explanation module provides causality grounded explanations on a selected set of experiment results.
7. Causal Recommendation uses the insights provided by the Causal Explanation module, and recommmends a set of experiments towards benchmark exploration and optimization.

[Learn the CausalBench Experiment Structure](concepts.md) or see the [glossary](basics.md) for precise definitions.

## Start here

If you want to run an existing benchmark:

1. [Install CausalBench and set up authentication](install.md).
2. [Run a published context](quickstart.md).
3. [Inspect, compare, and optionally publish the run](contexts.md#inspect-a-run).

If you want to contribute a module or an experiment:

1. Read [contexts and runs](contexts.md) to understand component compatibility.
2. Package a [dataset](modules/datasets.md), [model or metric](modules/models-metrics.md), or [task](modules/tasks.md).
3. Follow the [pre-publication checklist](reproducibility.md#before-publication).

## Minimal example

After installation, a published context can be fetched and run with four lines:

```python
from causalbench.modules import Context

context = Context(module_id=2, version=1)
run = context.execute()
print(run)
```

Fetching requires a [CausalBench account](https://causalbench.org) and network access. Execution happens on the current machine, including unsandboxed task, model, and metric code downloaded by the context; review those components first. The example deliberately does **not** publish anything; publishing is a separate, explicit step.

In the example above, context `2/1` uses the PC implementation from `gcastle`, which also imports PyTorch; follow the [quickstart prerequisites](quickstart.md#before-you-begin) before running it. Other registry models can require different third-party libraries.

## Resources

- [Browse benchmarks](https://causalbench.org/home/benchmarks)
- [Download the quickstart notebook](files/CausalBench-Quickstart.ipynb)
- [Read the papers](papers.md)
- [Report issues](https://github.com/CausalBenchOrg/CausalBench/issues)
- [Contribute to the documentation](https://github.com/CausalBenchOrg/CausalBench-Docs)

## Demo video

[Watch the CausalBench demo on Google Drive](https://drive.google.com/file/d/1ichCZiSYtXG-4Q1DEVnW0pUR8nZLPo_W/preview).
