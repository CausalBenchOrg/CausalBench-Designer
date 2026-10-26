# Requires causalbench-asu==0.2.5 and the selected components' Python dependencies.
# Registry downloads require a local authenticated CausalBench session.
from causalbench.modules import Context, Dataset, Metric, Model, Task

context = Context.create(
    name="Sachs · PC real-data test",
    description="Sachs protein-signaling observations · 7,466 rows, 11 variables. PC defaults and static graph accuracy. Metadata checked against downloaded component packages.",
    task=Task(module_id=1, version=1),
    datasets=[
        (Dataset(module_id=1443, version=1), {"data": "file1", "ground_truth": "file2"}),
    ],
    models=[
        (Model(module_id=3, version=1), {}),
    ],
    metrics=[
        (Metric(module_id=1, version=1), {}),
    ],
)

# Execute locally; the resulting run is unpublished.
run = context.execute()
print(run)

# Publication is a separate, explicit operation after reviewing the context/run.
# context.publish()
# run.publish()
