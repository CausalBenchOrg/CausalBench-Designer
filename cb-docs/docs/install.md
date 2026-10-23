# Install CausalBench

The [PyPI distribution](https://pypi.org/project/causalbench-asu/) is named `causalbench-asu`; Python code imports it as `causalbench`.

## Requirements

- Python 3.10 or newer
- a [CausalBench account](https://causalbench.org) for registry operations
- network access when downloading or publishing components
- enough local CPU, memory, and disk space for the context you plan to run

Individual tasks, models, and metrics can import libraries beyond the core package dependencies. Check their source and metadata before running an unfamiliar component; component code executes locally without a sandbox.

For example, the context used by this documentation's quickstart requires `gcastle==1.0.3` and PyTorch; the [quickstart](quickstart.md#before-you-begin) installs them explicitly and notes platform and Python-version considerations.

## Install in a virtual environment

Using a dedicated environment keeps benchmark dependencies separate from other projects.

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install causalbench-asu
```

### Windows PowerShell

```powershell
py -3.10 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install causalbench-asu
```

To upgrade an existing environment:

```bash
python -m pip install --upgrade causalbench-asu
```

## Verify the installation

```bash
python -c "from importlib.metadata import version; print(version('causalbench-asu'))"
python -c "from causalbench.modules import Context; print('CausalBench import succeeded')"
```

The first command prints the installed release.

## Authenticate

Authentication is retained: the first operation that talks to the registry authenticates and, if no valid saved credentials exist, prompts for your email and password. For example, constructing a context by ID triggers a download and therefore authentication:

```python
from causalbench.modules import Context

context = Context(module_id=2, version=1)
```

The client stores the submitted credentials in `config.yaml` under your home-directory CausalBench folder:

```text
~/.causalbench/config.yaml
```

On Windows, `~` means your user profile directory. Treat this file as a secret: do not commit, paste, or share it. On macOS and Linux, you can restrict it to your account after it is created:

```bash
chmod 600 ~/.causalbench/config.yaml
```

The generated file has this shape:

```yaml
email: researcher@example.org
password: "your-password"
```

Prefer the interactive prompt so the password is not placed in shell history or a notebook cell.

## Local storage

CausalBench uses `~/.causalbench/` for configuration and extracted component packages. A fetched component is stored below a directory for its type, ID, and version. Do not rely on this internal layout as a stable API; load components through the Python classes instead.

## Next step

[Run your first published context](quickstart.md). If installation or login fails, see [Troubleshooting](troubleshooting.md).
