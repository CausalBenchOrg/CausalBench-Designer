# Run your first benchmark

This guide downloads a published benchmark context, executes every scenario on your machine, and inspects the resulting run. Publishing is deliberately kept as an optional final step.

## Before you begin

You need:

- [CausalBench installed](install.md) in Python 3.10 or newer (Python 3.10 is the reference environment for this older PC example);
- the tutorial model's extra dependencies, `gcastle==1.0.3` and PyTorch;
- an account at [causalbench.org](https://causalbench.org); and
- the ID and version of a context you can access.

Install the extra dependency in the same environment as CausalBench:

```bash
python -m pip install "gcastle==1.0.3" torch
```

The bundled tutorial uses the public **Tuning PC** context (`2`, version `1`), which was fetched and executed end to end on September 21, 2026. Its PC model imports `gcastle`, whose algorithm package also imports PyTorch; model-specific libraries are not installed automatically with `causalbench-asu`. If you need a CUDA-specific build or `pip` cannot select a wheel for your platform, use the [official PyTorch installation selector](https://pytorch.org/get-started/locally/) before installing `gcastle`. Registry permissions and available versions can change, so select another context from the [benchmark catalog](https://causalbench.org/home/benchmarks) if that pair is unavailable and install the dependencies required by its components.

If `gcastle` fails under a newer interpreter, create the tutorial environment with Python 3.10, the version used by CausalBench's upstream reference environment.

!!! warning "Downloaded component code runs locally"
    Task, model, and metric packages can contain contributed Python code. `Context.execute()` imports and runs it unsandboxed with your user account's permissions. Review the component metadata and source, and run unfamiliar components in an isolated environment without secrets or sensitive files.

## 1. Fetch a context

```python
from causalbench.modules import Context

context = Context(module_id=2, version=1)
```

`Context(...)` authenticates and downloads the context definition. If no valid saved credentials exist, CausalBench prompts for your email and password. The context pins each task, dataset, model, and metric by ID and version.

## 2. Execute it locally

```python
run = context.execute()
```

During execution CausalBench:

1. downloads the referenced component versions;
2. builds one scenario for each dataset–model pair;
3. checks that models and metrics reference the context's task ID and version;
4. runs the model and metrics for each scenario; and
5. records timing and system information with the results.

Execution time and resource use depend on the selected context and your machine. A successful execution returns a `Run` object, including the experiment results; exceptions from a model commonly indicate a missing model-specific library or incompatible local environment.

For this context, expect two results for the `abalone` dataset: the PC model runs once with `alpha=0.1` and once with `alpha=0.4`. Each result contains `f1_static` and `precision_static` scores. In the September 21 validation with `causalbench-asu` 0.2.4, the scores were:

| PC `alpha` | F1 | Precision |
| ---: | ---: | ---: |
| `0.1` | 0.2286 | 0.2353 |
| `0.4` | 0.2105 | 0.2000 |

Small timing and profiling differences are normal across machines. If the scenario count or metric names differ, first confirm that you fetched context `2`, version `1`.

## 3. Inspect the run

The compact text view lists each dataset, model, its hyperparameters, and metric scores:

```python
print(run)
```

You can also inspect the structured result objects:

```python
print(run.context.name)
print(run.task.name)

for result in run.results:
    print(f"{result.dataset.name} × {result.model.name}")
    for metric in result.metrics:
        print(f"  {metric.name}: {metric.output['score']}")
```

`Run` exposes top-level attributes such as `run.context`. Its nested result containers are `Bunch` objects, so `run.context.name` and `run.context["name"]` are equivalent. See [Contexts and runs](contexts.md#inspect-a-run) for the result structure.

## 4. Optionally publish the result

Nothing has been uploaded yet. To save the run to your private repository:

```python
run.publish()
```

To request public visibility:

```python
run.publish(public=True)
```

The client asks for confirmation before public publication. Answering **no** changes the upload to private visibility; to cancel the upload, answer **cancel**. Public records are intended to be permanent and, are archived with a DOI. Review the [publishing and reproducibility guidance](reproducibility.md) before confirming.

!!! note
    A run can be published only when it came from a published context. A context, in turn, can be published only after all of its task, dataset, model, and metric components have registry IDs.

## Complete script

```python
from causalbench.modules import Context


def main() -> None:
    context = Context(module_id=2, version=1)
    run = context.execute()
    print(run)

    # Publishing is an explicit external side effect. Uncomment only when ready.
    # run.publish()              # private
    # run.publish(public=True)   # asks for public confirmation


if __name__ == "__main__":
    main()
```

You can also [download the notebook](files/CausalBench-Quickstart.ipynb) or continue to [build a context from selected components](contexts.md#create-a-context-in-python).
