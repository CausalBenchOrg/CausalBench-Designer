# Designing Causal-Discovery Benchmarks

A useful causal-discovery benchmark begins with a precise target: which directed edges should be recovered, over which variables and time lags, under which assumptions? Choose the data representation and metrics only after answering those questions.

This guide covers the static and temporal discovery contracts and example components in CausalBench. The implementations discussed below are test fixtures in the source repository; they are excluded from the published package archives and do **not** guarantee that a particular model ID or version is available in the hosted registry. The model names also appear in the [CausalBench paper](files/papers/CausalBench_Unifying.pdf). Verify registry availability and task compatibility before creating a context.

Some fixture ZIP manifests may predate the current required `causalbench` compatibility block or task-reference shape. Treat their Python implementations as design examples, not ready-to-load CausalBench components, unless you update and validate their manifests.

## Choose Static or Temporal Discovery

| Design choice | Static discovery | Temporal discovery |
| --- | --- | --- |
| Observations | Rows of measurements; columns are variables | Time-ordered rows; columns are variables plus a designated time column |
| Target | One directed causal graph | Contemporaneous and lagged directed relationships |
| Ground truth | One adjacency matrix or canonical graph | An edge list carrying a lag for each relationship |
| Metric aggregation | One aligned adjacency matrix | One aligned adjacency matrix per lag, then an average in the repository fixture metrics |

Both discovery task fixtures use the same logical wiring:

```text
dataset "data" ---------> model ---------> "prediction" graph
dataset "ground_truth" ------------------> metric
```

The model receives a `SpatioTemporalData` object. The prediction and ground truth are `SpatioTemporalGraph` objects. A context commonly maps those names to two dataset files:

```python
datasets=[
    (dataset, {"data": "file1", "ground_truth": "file2"}),
]
```

See [Dataset packages](modules/datasets.md) for the CSV formats and [Contexts and runs](contexts.md) for complete context construction.

## Represent Graphs Consistently

CausalBench's canonical graph is an edge list with semantic fields for:

```text
cause, effect, location_cause, location_effect, strength, lag
```

The discovery helpers interpret an adjacency entry at row `cause`, column `effect` as `cause -> effect`.

- A `graph.static` dataset file is a square adjacency matrix. The loader converts each nonzero entry into a canonical edge with lag `0`.
- A `graph.temporal` dataset file is already an edge list. Its manifest maps the CSV columns to the canonical fields.
- The temporal helper converts a graph into one adjacency matrix for every integer lag from the graph's minimum through maximum lag.

Before benchmarking, make prediction and truth agree on:

- node names and spelling;
- edge direction;
- whether lag `0` means a contemporaneous relationship;
- the sign and unit of lag values;
- treatment of self-edges;
- whether an edge is binary or weighted; and
- how uncertain or partially directed edges are encoded.

The repository fixture metrics align prediction and truth to the union of node labels present in their edge rows and fill missing entries with zero. `SpatioTemporalGraph.nodes` is also derived from edge rows, so a variable isolated in **both** graphs does not contribute to the evaluated adjacency matrix. Preserve and validate the intended node universe separately.

The fixture helpers use only `cause` and `effect` when building adjacency matrices; they ignore `location_cause` and `location_effect`. Repeated variable names at different locations therefore collapse into one cell: static strengths are accumulated and temporal values can overwrite one another. Use location-qualified node labels or a location-aware task and metric when location is part of the causal question.

## Paper-Demonstrated Models

The paper uses these models as case studies, not as evidence that one method is universally best.

### Static: PC and GES

**PC** is a constraint-based method that uses conditional-independence tests. The paper notes assumptions including the causal Markov condition, faithfulness, no hidden confounders, and an acyclic causal graph. The repository fixture exposes `variant`, significance level `alpha`, and `ci_test` (`fisherz`, `g2`, or `chi2`). Match the test to the data type and record all three values.

**GES** is a score-based search with forward and backward phases. The repository fixture offers BIC and BDeu scoring, with score-specific settings. Choose a score appropriate for the variables and sample regime, and do not compare it with PC as if their assumptions were identical.

PC can represent an equivalence class or leave some directions unresolved. The repository fixture metrics compare directed adjacency entries exactly. Decide how partially directed or ambiguous edges will be encoded before using a fully directed ground truth; otherwise orientation uncertainty can be scored as model error without being identifiable from the data.

### Temporal: VAR-LiNGAM and PCMCIplus

**VAR-LiNGAM** combines vector autoregression with linear, non-Gaussian causal discovery. Its model assumes linearity, non-Gaussian continuous errors (with at most one exception), acyclic contemporaneous relations, and no hidden common causes, as summarized in the [official VARLiNGAM model documentation](https://lingam.readthedocs.io/en/stable/tutorial/var.html#model). The repository fixture exposes the lag limit, model-selection criterion, pruning, and random seed. Its output can contain weighted coefficients, so define pruning or an edge threshold before applying binary edge metrics.

!!! warning "Check VAR-LiNGAM orientation"
    The task helper interprets matrix row `cause`, column `effect`, while the [VARLiNGAM model equation](https://lingam.readthedocs.io/en/stable/tutorial/var.html#model) uses row `effect`, column `cause`. The repository adapter also reorders fitted matrices. Independently verify orientation and node order against a known graph, transposing or remapping as necessary, before treating its output as a valid edge list.

**PCMCIplus** uses conditional-independence testing across contemporaneous and lagged relationships. The [official PCMCIplus documentation](https://jakobrunge.github.io/tigramite/#tigramite.pcmci.PCMCI.run_pcmciplus) states that its contemporaneous result is identified only up to a Markov equivalence class under causal sufficiency, faithfulness, and the causal Markov condition. The repository fixture uses `ParCorr(significance="analytic")`, a test based on [linear OLS residuals and Pearson correlation](https://jakobrunge.github.io/tigramite/_modules/tigramite/independence_tests/parcorr.html), and exposes `tau_min`, `tau_max`, `alpha`, conditioning limits, collider and conflict rules, and false-discovery-rate handling. The fixture adapter turns oriented `-->` and `<--` marks into binary directed edges; it drops unoriented, ambiguous, or conflicting marks rather than proving those adjacencies absent.

Both temporal model fixtures remove the column identified by `data.time` and pass the remaining rows to the estimator in their existing order. Sort observations chronologically, declare the time index correctly, and document sampling intervals, gaps, missingness, and any preprocessing. The package does not make an irregular or nonstationary series suitable for a method merely by accepting its shape.

## Interpret the Graph Metrics

With binary graphs, each directed adjacency entry is treated as an edge-classification decision.

| Metric | Direction | Current example interpretation |
| --- | --- | --- |
| Accuracy | Higher is better; `1` is exact | Fraction of all adjacency cells where prediction equals truth. Sparse graphs can score highly because true negatives dominate. |
| Precision | Higher is better; `1` is exact | `TP / (TP + FP)`: how many predicted directed edges are correct. Returns `0` when no positive edge is predicted. |
| Recall | Higher is better; `1` is exact | `TP / (TP + FN)`: how many true directed edges are recovered. Returns `0` when the truth contains no positive edge. |
| F1 | Higher is better; `1` is exact | Harmonic mean of precision and recall. Returns `0` when both contribute no positive score. |
| SHD | Lower is better; `0` is exact | Sum of absolute differences between binary directed adjacency cells. In this implementation, reversing one edge normally contributes two differences: one missing edge and one extra edge. |

Report precision, recall, or F1 alongside accuracy for sparse graphs. SHD is not normalized by graph size, so do not compare raw SHD across datasets with different numbers of variables as though the scale were identical.

For two completely edgeless static graphs, the fixture has no node universe: accuracy computes a mean over an empty matrix and returns `NaN`, precision/recall/F1 return `0`, and SHD returns `0`. Define the node universe outside the edge list or use a metric designed for empty graphs instead of interpreting those values as an ordinary comparison.

With `binarize: true`, the static examples treat every nonzero strength as an edge. With `binarize: false`, behavior depends on the individual metric and should not be described as ordinary binary precision, recall, F1, or SHD.

!!! warning "Weighted temporal graphs"
    The checked temporal metric examples convert adjacency values to integers **before** checking whether to binarize them. Fractional strengths can therefore be truncated to zero. This matters for weighted output such as VAR-LiNGAM coefficients. Supply already-binary presence graphs or use a metric with an explicit, documented threshold; do not use these examples to assess edge-strength accuracy.

## Understand Temporal Averaging

The repository's temporal accuracy, precision, recall, F1, and SHD fixtures follow the same pattern:

1. Convert prediction and truth into a list of adjacency matrices, one per lag.
2. Align the node set in every matrix.
3. If the lists have different lengths, append all-zero matrices to the shorter list.
4. Compute the metric independently at each aligned list position.
5. Return the unweighted arithmetic mean of the per-lag scores.

This is a **macro-average over lags**, not one confusion matrix pooled across all lags. A lag with few or no edges receives the same weight as a dense lag. For precision, recall, and F1, a zero denominator contributes `0` for that lag. Temporal SHD sums cell differences within each lag and then averages those sums.

!!! warning "Completely edgeless temporal graphs"
    The fixture helper derives its lag range from the minimum and maximum lag present in edge rows. A graph with no edge rows has neither value and fails before metric denominators are reached. These fixtures therefore do not support a wholly edgeless temporal prediction or truth, nor can they preserve its node universe; use a task/metric with an explicit node and lag domain for that case.

The helper constructs each list from that graph's own minimum to maximum lag and aligns lists by position. Use the same explicit lag origin and range in prediction and truth—preferably including lag `0` when it is part of the task—to avoid comparing different physical lags at the same list position. Report both the evaluated lag range and the aggregation rule.

If macro-averaging does not match the research question, publish a separate compatible metric that implements the intended weighting rather than relabeling the fixture score.

## Ground Truth and Assumptions

Graph metrics are meaningful only to the extent that the reference graph is meaningful.

- **Synthetic data:** record the data-generating process, sample size, noise, interventions, latent variables, and whether the supplied graph is the exact generating graph.
- **Real data:** state whether ground truth is experimentally supported, curated, assumed, or incomplete. An unrecorded edge is not always evidence of no causal relationship.
- **Latent confounding:** do not interpret poor recovery as algorithm failure when the benchmark violates the model's causal-sufficiency assumptions without acknowledging that mismatch.
- **Equivalence and orientation:** distinguish skeleton recovery from exact arrow recovery when directions are not identifiable.
- **Temporal data:** justify the maximum lag and sampling interval. A correct dependency outside the evaluated lag window cannot be recovered, while an overly wide window changes both search difficulty and metric averaging.
- **Leakage:** ground truth may be used by metrics but must not enter model inputs unless the experimental design explicitly permits it.

Treat the paper's case-study scores as demonstrations tied to their datasets, implementations, hyperparameters, and machines—not as a ranking that automatically transfers to a new dataset.

## Design Checklist

- [ ] Choose static or temporal discovery and state the causal question.
- [ ] Define the complete node universe, edge direction, self-edge policy, and, for temporal work, lag convention and range.
- [ ] Map observational data only to the model's `data` input and reference structure to the metric's `ground_truth` input.
- [ ] Check each model's assumptions against the data and record all hyperparameters, conditional-independence tests, scores, seeds, pruning, and thresholds.
- [ ] Make prediction and truth use the same binary or weighted edge semantics before evaluation.
- [ ] For weighted temporal output, avoid the example metrics' integer-truncation behavior or replace them with a threshold-aware metric.
- [ ] Use precision, recall, or F1 with accuracy on sparse graphs; interpret SHD relative to graph size.
- [ ] For temporal metrics, verify lag-by-lag alignment and decide whether equal weighting across lags answers the research question.
- [ ] Include both simulated and credible real-world data when making broad performance claims, and disclose ground-truth limitations.
- [ ] Repeat stochastic runs, pin registered component IDs and versions (or record local package revisions and checksums), and retain the system profile and dependency versions.
- [ ] Inspect predicted graphs during a direct model test or inside a compatible metric, and retain them separately when needed; the checked `Context.execute()` stringifies outputs before returning the run.

Use [How CausalBench Fits Together](concepts.md) for the execution model and [Reproducible Benchmarking](reproducibility.md) before reporting or publishing results.
