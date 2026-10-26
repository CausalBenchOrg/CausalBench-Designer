"""Parse artifacts, inspect Python literals without imports/execution, and compare typed semantics."""
import ast
import json
import math
import pathlib
import sys
import yaml


def assert_same(actual, expected):
    assert type(actual) is type(expected), (type(actual), type(expected), actual, expected)
    if isinstance(actual, dict):
        assert actual.keys() == expected.keys()
        for key in expected:
            assert_same(actual[key], expected[key])
    elif isinstance(actual, list):
        assert len(actual) == len(expected)
        for a, b in zip(actual, expected):
            assert_same(a, b)
    else:
        assert actual == expected, (actual, expected)
        if isinstance(actual, float) and actual == 0:
            assert math.copysign(1, actual) == math.copysign(1, expected)


def reference(node, expected_name):
    assert isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    assert node.func.id == expected_name and not node.args
    keywords = {kw.arg: ast.literal_eval(kw.value) for kw in node.keywords}
    return {"id": keywords["module_id"], "version": keywords["version"]}


for expected_path in sorted(pathlib.Path(sys.argv[1]).glob('*.json')):
    expected = json.loads(expected_path.read_text())
    actual_yaml = yaml.safe_load(expected_path.with_suffix('.yaml').read_text())
    assert_same(actual_yaml, expected)
    tree = ast.parse(expected_path.with_suffix('.py').read_text())
    context = next(n.value for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'context' for t in n.targets))
    assert isinstance(context, ast.Call) and context.func.attr == 'create'
    kwargs = {kw.arg: kw.value for kw in context.keywords}
    actual = {key: ast.literal_eval(kwargs[key]) for key in ['name', 'description']}
    actual['task'] = reference(kwargs['task'], 'Task')
    for group, component, settings in [('datasets', 'Dataset', 'mapping'), ('models', 'Model', 'hyperparameters'), ('metrics', 'Metric', 'hyperparameters')]:
        actual[group] = []
        for item in kwargs[group].elts:
            assert isinstance(item, ast.Tuple) and len(item.elts) == 2
            actual[group].append({**reference(item.elts[0], component), settings: ast.literal_eval(item.elts[1])})
    assert_same(actual, {key: expected[key] for key in actual})
    scenarios = len(actual['datasets']) * len(actual['models'])
    print(f'{expected_path.stem}: Python syntax/literals and YAML round-trip passed; {scenarios} scenarios, {scenarios * len(actual["metrics"])} evaluations')
