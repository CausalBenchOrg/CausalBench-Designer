/** Browser metadata is evidence for authoring, not a substitute for Python execution. */
export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export type Kind = 'task' | 'dataset' | 'model' | 'metric';
export type EntryKind = Exclude<Kind, 'task'>;
export interface Reference { id: number; version: number; }
export interface InputContract {
  modelData: Record<string, string>;
  metricData: Record<string, string>;
  metricModel: Record<string, string>;
}
export interface FileAlias { alias: string; format?: string; path?: string; }
export interface Parameter { data: string; description?: string; value?: Value; }
export interface Descriptor extends Reference {
  kind: Kind;
  name: string;
  description?: string;
  provenance: 'registry' | 'manual' | 'reference';
  taskRefs?: Partial<Reference>[];
  contract?: InputContract;
  files?: FileAlias[];
  parameters?: Record<string, Parameter>;
}
export interface Configuration { id: string; label: string; overrides: Record<string, Value>; }
export interface Entry {
  entryId: string;
  kind: EntryKind;
  descriptor: Descriptor;
  mapping: Record<string, string>;
  configurations: Configuration[];
}
export interface Draft {
  name: string;
  description: string;
  task: Descriptor | null;
  datasets: Entry[];
  models: Entry[];
  metrics: Entry[];
}
export interface Issue { path: string; message: string; severity: 'error' | 'unknown' | 'runtime'; }
export const COMPATIBILITY = { major: '0', minor: '2', build: '5' };
let sequence = 0;
export function uniqueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `entry-${++sequence}`;
}
export function clone<T>(value: T): T { return structuredClone(value); }
export function emptyDraft(): Draft {
  return { name: '', description: '', task: null, datasets: [], models: [], metrics: [] };
}
export function newConfiguration(): Configuration {
  return { id: uniqueId(), label: '', overrides: {} };
}
export function newEntry(descriptor: Descriptor): Entry {
  if (descriptor.kind === 'task') throw new Error('Tasks are selected once per context.');
  return { entryId: uniqueId(), kind: descriptor.kind, descriptor: clone(descriptor), mapping: {},
    configurations: descriptor.kind === 'dataset' ? [] : [newConfiguration()] };
}
export function validIdentity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
export function isValue(value: unknown): value is Value {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isValue);
  return typeof value === 'object' && value !== null &&
    Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(isValue);
}
export function sameReference(a: Partial<Reference>, b: Reference): boolean {
  return a.id === b.id && a.version === b.version;
}
export function compatibility(descriptor: Descriptor, task: Descriptor | null): 'match' | 'mismatch' | 'unknown' {
  if (!task || descriptor.taskRefs === undefined) return 'unknown';
  if (descriptor.taskRefs.some(ref => sameReference(ref, task))) return 'match';
  if (descriptor.taskRefs.some(ref => !validIdentity(ref.id) || !validIdentity(ref.version))) return 'unknown';
  return 'mismatch';
}
export function datasetInputs(contract: InputContract): Record<string, string> {
  return { ...contract.modelData, ...contract.metricData };
}
export function runtimeType(format?: string): string | undefined {
  if (format === 'dataframe') return 'SpatioTemporalData';
  if (format === 'graph.static' || format === 'graph.temporal') return 'SpatioTemporalGraph';
  return undefined;
}
export function counts(draft: Draft): { datasets: number; models: number; metrics: number; scenarios: number; evaluations: number } {
  const datasets = draft.datasets.length;
  const models = draft.models.reduce((sum, entry) => sum + entry.configurations.length, 0);
  const metrics = draft.metrics.reduce((sum, entry) => sum + entry.configurations.length, 0);
  return { datasets, models, metrics, scenarios: datasets * models, evaluations: datasets * models * metrics };
}
export function valueError(value: Value, data: string): string | null {
  if (!isValue(value)) return 'Use a finite JSON value.';
  if (value === null) return null;
  switch (data.toLowerCase()) {
    case 'integer': case 'int': return typeof value === 'number' && Number.isSafeInteger(value) ? null : 'Enter an integer or null.';
    case 'decimal': case 'float': case 'number': return typeof value === 'number' ? null : 'Enter a number or null.';
    case 'boolean': case 'bool': return typeof value === 'boolean' ? null : 'Choose true, false, or null.';
    case 'string': case 'str': return typeof value === 'string' ? null : 'Enter text or null.';
    case 'array': case 'list': return Array.isArray(value) ? null : 'Enter a JSON array or null.';
    case 'object': case 'dict': return !Array.isArray(value) && typeof value === 'object' ? null : 'Enter a JSON object or null.';
    default: return null;
  }
}
export function validateDraft(draft: Draft): Issue[] {
  const issues: Issue[] = [];
  const add = (path: string, message: string, severity: Issue['severity'] = 'error') => issues.push({ path, message, severity });
  if (!draft.name.trim()) add('name', 'Give the context a name.');
  const task = draft.task;
  if (!task) add('task', 'Select exactly one task and version.');
  else {
    if (task.kind !== 'task' || !validIdentity(task.id) || !validIdentity(task.version)) add('task', 'A positive registry ID and version are required.');
    if (!task.contract) add('task.contract', 'Input contract unavailable. Supply task metadata from the task implementation.', 'unknown');
    if (task.contract) {
      for (const [name, type] of Object.entries(task.contract.modelData)) {
        if (Object.hasOwn(task.contract.metricData, name) && task.contract.metricData[name] !== type)
          add(`task.contract.${name}`, 'The model and metric require different types for the same dataset input.');
      }
    }
  }
  for (const group of ['datasets', 'models', 'metrics'] as const) {
    if (!draft[group].length) add(group, `Add at least one ${group.slice(0, -1)} entry.`);
    for (const [index, entry] of draft[group].entries()) {
      const path = `${group}[${index + 1}]`;
      const descriptor = entry.descriptor;
      if (entry.kind !== group.slice(0, -1) || descriptor.kind !== entry.kind) add(path, 'Component kind does not match this entry.');
      if (!validIdentity(descriptor.id) || !validIdentity(descriptor.version)) add(path, 'A positive registry ID and version are required.');
      if (entry.kind === 'dataset') {
        if (descriptor.files === undefined) add(`${path}.files`, 'Dataset aliases unavailable. Supply the manifest file alias map.', 'unknown');
        const inputs = task?.contract ? datasetInputs(task.contract) : {};
        for (const [name, expectedType] of Object.entries(inputs)) {
          const alias = Object.hasOwn(entry.mapping, name) ? entry.mapping[name] : '';
          if (!alias) { add(`${path}.mapping.${name}`, 'Select a dataset file alias.'); continue; }
          if (descriptor.files === undefined) continue;
          const file = descriptor.files.find(f => f.alias === alias);
          if (!file) { add(`${path}.mapping.${name}`, `Alias ${JSON.stringify(alias)} is absent from this dataset version.`); continue; }
          const actualType = runtimeType(file.format);
          if (!actualType || !['SpatioTemporalData', 'SpatioTemporalGraph'].includes(expectedType))
            add(`${path}.mapping.${name}`, 'Format/type metadata cannot prove compatibility; supply a supported contract.', 'unknown');
          else if (actualType !== expectedType) add(`${path}.mapping.${name}`, `${file.format} loads as ${actualType}; this input requires ${expectedType}.`);
        }
        for (const name of Object.keys(entry.mapping)) {
          if (task?.contract && !Object.hasOwn(inputs, name)) add(`${path}.mapping.${name}`, 'This input is not declared by the selected task.');
        }
      } else {
        const match = compatibility(descriptor, task);
        if (task && match !== 'match') add(`${path}.task`, match === 'unknown'
          ? 'Exact task ID/version metadata unavailable. Supply the component manifest task reference.'
          : `Requires a different task. Context uses task ${task.id}, version ${task.version}.`, match === 'unknown' ? 'unknown' : 'error');
        if (descriptor.parameters === undefined) add(`${path}.hyperparameters`, 'Parameter declarations unavailable. Supply manifest hyperparameters ({} if none).', 'unknown');
        if (!entry.configurations.length) add(`${path}.configurations`, 'Add at least one explicit configuration.');
        for (const [configIndex, config] of entry.configurations.entries()) {
          for (const [name, value] of Object.entries(config.overrides)) {
            const settingPath = `${path}.configurations[${configIndex + 1}].${name}`;
            if (!descriptor.parameters) continue;
            if (!Object.hasOwn(descriptor.parameters, name)) add(settingPath, 'Unknown override name.');
            else {
              const error = valueError(value, descriptor.parameters[name].data);
              if (error) add(settingPath, error);
            }
          }
        }
      }
    }
  }
  add('execution', 'Python verifies dataset contents, model output names/types, helpers, and component dependencies. Metadata checks do not establish scientific suitability.', 'runtime');
  return issues;
}

/** Explicit adapter for the previous UI's parameter sets and two mapping storage variants. */
export function migrateLegacyEntry(kind: EntryKind, legacy: any, descriptor: Descriptor): Entry {
  const entry = newEntry(descriptor);
  const data = legacy.data ?? legacy;
  const mappings = data.file_mappings ?? {};
  if (kind === 'dataset') {
    for (const [input, keys] of Object.entries({ data: ['generic_data', 'data', 'data_file'], ground_truth: ['generic_ground_truth', 'ground_truth', 'ground_truth_file'] })) {
      const key = keys.find(k => Object.hasOwn(mappings, k));
      if (key) entry.mapping[input] = mappings[key];
    }
  } else if (data.hyperparameter_sets?.length) {
    entry.configurations = data.hyperparameter_sets.map((set: any) => ({ id: uniqueId(), label: set.label ?? '', overrides:
      Object.fromEntries(Object.entries(set.parameters ?? {}).map(([name, parameter]: [string, any]) => {
        let value = parameter && typeof parameter === 'object' && Object.hasOwn(parameter, 'value') ? parameter.value : parameter;
        const type = parameter?.data_type ?? descriptor.parameters?.[name]?.data ?? 'string';
        if (typeof value === 'string' && !['string', 'str'].includes(type)) {
          try { value = JSON.parse(value); } catch { /* Preserve unparseable legacy values; validation reports them. */ }
        }
        return [name, clone(value)];
      })) }));
  }
  return entry;
}
