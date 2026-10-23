# CausalBench documentation

This repository builds the documentation at [docs.causalbench.org](https://docs.causalbench.org) for the [CausalBench](https://github.com/CausalBenchOrg/CausalBench) benchmarking platform.

The documentation covers:

- installing and authenticating the `causalbench-asu` Python package;
- running, inspecting, and publishing benchmark contexts;
- the dataset, model, metric, task, context, scenario, and run model;
- authoring component packages and connecting their data contracts; and
- reproducibility, versioning, and troubleshooting.

The API and schema documentation is checked against the published `causalbench-asu` 0.2.5 package. Examples that use registry IDs also depend on the contents and permissions of the live CausalBench registry.

## Preview locally

Use Python 3.10 or newer:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --requirement requirements-docs.txt
python scripts/validate_docs.py
mkdocs serve
```

On Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1`.

Open `http://127.0.0.1:8000`. To run the same strict build used for validation:

```bash
python scripts/validate_docs.py
mkdocs build --strict
```

The validator parses notebooks and YAML examples and compiles Python snippets without executing them. The strict build also catches missing pages, malformed configuration, and navigation errors.

## Contributing

Documentation pages live in `docs/`, and navigation is defined in `mkdocs.yml`. Keep examples small, state when a command uploads or publishes data, and distinguish these sources of truth:

1. package behavior and schemas in the [CausalBench source](https://github.com/CausalBenchOrg/CausalBench);
2. platform behavior described by the bundled papers; and
3. point-in-time registry examples, whose IDs and access permissions can differ between accounts.

When an API example changes, update the prose, the [quickstart notebook](docs/files/CausalBench-Quickstart.ipynb), and any related troubleshooting entry together.

## Deployment

Pull requests run the example validator and strict site build. Pushes to `main` run the same checks and, if they pass, publish the MkDocs site to the `gh-pages` branch.
