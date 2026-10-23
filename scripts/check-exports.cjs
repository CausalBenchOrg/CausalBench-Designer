// Compile only trusted local fixture/domain TypeScript; never component Python.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { supervisedFixture, expandedFixture, discoveryFixture } = require('../tests/fixtures/contexts.ts');
const { contextData, flowLiteral, serializePython, serializeYaml } = require('../src/app/domain/serialize.ts');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'causalbench-exports-'));
[supervisedFixture(), expandedFixture(), discoveryFixture(false), discoveryFixture(true)].forEach((draft, index) => {
  fs.writeFileSync(path.join(target, `${index}.json`), flowLiteral(contextData(draft)));
  fs.writeFileSync(path.join(target, `${index}.py`), serializePython(draft));
  fs.writeFileSync(path.join(target, `${index}.yaml`), serializeYaml(draft));
});
const result = spawnSync('python3', [path.join(__dirname, 'check-exports.py'), target], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
console.log(`Export artifacts: ${target}`);
