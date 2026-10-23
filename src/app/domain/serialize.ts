import { COMPATIBILITY, Draft, Value, validateDraft } from './context';

export function pythonLiteral(value: Value): string {
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'string') return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot serialize a non-finite number.');
    return Object.is(value, -0) ? '-0.0' : String(value);
  }
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`;
  return `{${Object.entries(value).map(([key, val]) => `${pythonLiteral(key)}: ${pythonLiteral(val)}`).join(', ')}}`;
}
export function contextData(draft: Draft) {
  const blockers = validateDraft(draft).filter(issue => issue.severity !== 'runtime');
  if (blockers.length) throw new Error(blockers.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  const task = draft.task!;
  return {
    type: 'context', causalbench: { ...COMPATIBILITY }, name: draft.name, description: draft.description,
    task: { id: task.id, version: task.version },
    datasets: draft.datasets.map(entry => ({ id: entry.descriptor.id, version: entry.descriptor.version, mapping: { ...entry.mapping } })),
    models: draft.models.flatMap(entry => entry.configurations.map(config => ({ id: entry.descriptor.id, version: entry.descriptor.version, hyperparameters: structuredClone(config.overrides) }))),
    metrics: draft.metrics.flatMap(entry => entry.configurations.map(config => ({ id: entry.descriptor.id, version: entry.descriptor.version, hyperparameters: structuredClone(config.overrides) })))
  };
}
export function serializePython(draft: Draft): string {
  const data = contextData(draft);
  const datasets = data.datasets.map(d => `        (Dataset(module_id=${d.id}, version=${d.version}), ${pythonLiteral(d.mapping)}),`).join('\n');
  const modules = (items: typeof data.models, type: string) => items.map(m => `        (${type}(module_id=${m.id}, version=${m.version}), ${pythonLiteral(m.hyperparameters)}),`).join('\n');
  return `# Requires causalbench-asu==0.2.5 and the selected components' Python dependencies.\n# Registry downloads require a local authenticated CausalBench session.\nfrom causalbench.modules import Context, Dataset, Metric, Model, Task\n\ncontext = Context.create(\n    name=${pythonLiteral(data.name)},\n    description=${pythonLiteral(data.description)},\n    task=Task(module_id=${data.task.id}, version=${data.task.version}),\n    datasets=[\n${datasets}\n    ],\n    models=[\n${modules(data.models, 'Model')}\n    ],\n    metrics=[\n${modules(data.metrics, 'Metric')}\n    ],\n)\n\n# Execute locally; the resulting run is unpublished.\nrun = context.execute()\nprint(run)\n\n# Publication is a separate, explicit operation after reviewing the context/run.\n# context.publish()\n# run.publish()\n`;
}
/** Flow collections with scientific notation accepted by Python's YAML 1.1 loader too. */
export function flowLiteral(value: Value): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot serialize a non-finite number.');
    if (Object.is(value, -0)) return '-0.0';
    return String(value).replace(/^(-?\d+)(e[+-]?\d+)$/i, '$1.0$2');
  }
  if (Array.isArray(value)) return `[${value.map(flowLiteral).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}:${flowLiteral(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function serializeYaml(draft: Draft): string {
  const data = contextData(draft);
  return Object.entries(data).map(([key, value]) => `${key}: ${flowLiteral(value)}`).join('\n') + '\n';
}
