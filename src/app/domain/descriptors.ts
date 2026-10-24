import { Descriptor, FileAlias, InputContract, Kind, Parameter, isValue, validIdentity } from './context';

function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function inputMap(value: unknown): value is Record<string, string> {
  return record(value) && Object.entries(value).every(([key, type]) => key.length > 0 && typeof type === 'string' && type.length > 0);
}
function contract(value: any): InputContract | undefined {
  if (!record(value)) return undefined;
  const result = {
    modelData: value['modelData'] ?? value['model_data_inputs'],
    metricData: value['metricData'] ?? value['metric_data_inputs'],
    metricModel: value['metricModel'] ?? value['metric_model_inputs']
  };
  return Object.values(result).every(inputMap) ? result : undefined;
}
/** Strict public shape for the manual metadata fallback. Never imports or runs Python. */
export function parseDescriptor(text: string): Descriptor {
  const raw = JSON.parse(text);
  if (!record(raw) || !['task', 'dataset', 'model', 'metric'].includes(raw['kind'])) throw new Error('kind must be task, dataset, model, or metric.');
  if (!validIdentity(raw['id']) || !validIdentity(raw['version'])) throw new Error('id and version must be positive safe integers.');
  if (typeof raw['name'] !== 'string' || !raw['name'].trim()) throw new Error('name must be a nonempty string.');
  const result: Descriptor = { kind: raw['kind'], id: raw['id'], version: raw['version'], name: raw['name'], provenance: 'manual' };
  if (typeof raw['description'] === 'string') result.description = raw['description'];
  if (Object.hasOwn(raw, 'contract')) {
    result.contract = contract(raw['contract']);
    if (!result.contract) throw new Error('contract needs modelData, metricData, and metricModel objects mapping input names to runtime type names.');
  }
  if (Object.hasOwn(raw, 'files')) {
    if (!Array.isArray(raw['files']) || !raw['files'].every((file: any) => record(file) && typeof file['alias'] === 'string' && file['alias'].length > 0 &&
      (file['format'] === undefined || typeof file['format'] === 'string') && (file['path'] === undefined || typeof file['path'] === 'string')))
      throw new Error('files must be an array of {alias, format?, path?}. Use manifest aliases, not guessed filenames.');
    if (new Set(raw['files'].map((f: any) => f.alias)).size !== raw['files'].length) throw new Error('Dataset aliases must be unique.');
    result.files = raw['files'];
  }
  if (Object.hasOwn(raw, 'taskRefs')) {
    if (!Array.isArray(raw['taskRefs']) || !raw['taskRefs'].every((ref: any) => record(ref) && validIdentity(ref['id']) && validIdentity(ref['version'])))
      throw new Error('taskRefs must contain exact {id, version} pairs.');
    result.taskRefs = raw['taskRefs'];
  }
  if (Object.hasOwn(raw, 'parameters')) {
    if (!record(raw['parameters']) || !Object.entries(raw['parameters']).every(([name, p]: [string, any]) => name.length > 0 && record(p) &&
      typeof p['data'] === 'string' && p['data'].length > 0 && (!Object.hasOwn(p, 'value') || isValue(p['value']))))
      throw new Error('parameters must map names to {data, value?, description?} declarations with finite JSON defaults.');
    result.parameters = raw['parameters'];
  }
  return result;
}
function positiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const number = Number(value);
  return validIdentity(number) ? number : undefined;
}
function normalizeFiles(value: unknown): FileAlias[] | undefined {
  // A manifest's object keys are aliases. A feature's filename or file_type is not alias evidence.
  if (record(value)) return Object.entries(value).map(([alias, file]) => ({ alias, format: typeof file?.data === 'string' ? file.data : undefined,
    path: typeof file?.path === 'string' ? file.path : undefined }));
  if (Array.isArray(value) && value.every(file => record(file) && typeof file['alias'] === 'string'))
    return value.map(file => ({ alias: file.alias, format: file.format ?? file.data, path: file.path }));
  return undefined;
}
function normalizeParameters(value: unknown): Record<string, Parameter> | undefined {
  if (record(value)) {
    if (!Object.values(value).every(p => record(p) && typeof p['data'] === 'string')) return undefined;
    return Object.fromEntries(Object.entries(value).map(([key, p]) => [key, { data: p.data, description: p.description,
      ...(Object.hasOwn(p, 'value') && isValue(p.value) ? { value: p.value } : {}) }]));
  }
  if (!Array.isArray(value)) return undefined;
  const pairs: [string, Parameter][] = [];
  for (const p of value) {
    if (!record(p) || typeof p['hyperparameter_name'] !== 'string' || typeof p['hyperparameter_data_type'] !== 'string') return undefined;
    const parameter: Parameter = { data: p['hyperparameter_data_type'], description: p['hyperparameter_description'] };
    if (Object.hasOwn(p, 'hyperparameter_value')) {
      let defaultValue: unknown = p['hyperparameter_value'];
      if (typeof defaultValue === 'string' && !['string', 'str'].includes(parameter.data)) {
        if (defaultValue === 'True') defaultValue = true;
        else if (defaultValue === 'False') defaultValue = false;
        else if (defaultValue === 'None') defaultValue = null;
        else try { defaultValue = JSON.parse(defaultValue); } catch { /* Do not infer unclear encodings. */ }
      }
      if (isValue(defaultValue)) parameter.value = defaultValue;
    }
    pairs.push([p['hyperparameter_name'], parameter]);
  }
  return Object.fromEntries(pairs);
}
/** Adapts explicit legacy fields; absent information stays unknown. */
export function normalizeCatalog(kind: Kind, items: unknown[]): Descriptor[] {
  const prefix = kind === 'model' ? 'modl' : kind;
  const results: Descriptor[] = [];
  for (const item of items) {
    if (!record(item)) throw new Error(`Unsupported ${kind} catalog item.`);
    const id = positiveNumber(item[`${prefix}_id`]);
    const list = item[`${prefix}_version_info_list`];
    if (!id || !Array.isArray(list) || !list.length) throw new Error(`${kind} descriptor is missing its ID or version list. Supply explicit metadata or check the API contract.`);
    for (const info of list) {
      const version = positiveNumber(info?.version?.version_number ?? info?.version_number);
      if (!version) throw new Error(`${kind} ${id} has no exact version number.`);
      const v = info.version ?? info;
      const descriptor: Descriptor = { kind, id, version, name: info[prefix]?.[`${prefix}_name`] ?? item[`${prefix}_name`] ?? `${kind} ${id}`, provenance: 'registry',
        description: info.description?.description_text };
      if (kind === 'task') descriptor.contract = contract(v.contract ?? v);
      if (kind === 'dataset') descriptor.files = normalizeFiles(v.files ?? info.files);
      if (kind === 'model' || kind === 'metric') {
        if (record(v.task)) descriptor.taskRefs = [{ id: positiveNumber(v.task.id), version: positiveNumber(v.task.version) }];
        else if (Array.isArray(v.tasks)) descriptor.taskRefs = v.tasks.map((task: any) => ({
          id: positiveNumber(task?.task_id ?? task?.taskId), version: positiveNumber(task?.task_version ?? task?.version_number ?? task?.version)
        }));
        descriptor.parameters = normalizeParameters(v.hyperparameters);
      }
      results.push(descriptor);
    }
  }
  return results;
}
export function descriptorExample(kind: Kind): string {
  const common = { kind, id: 10001, version: 1, name: `My ${kind}` };
  const extra = kind === 'task' ? { contract: { modelData: { features: 'SpatioTemporalData' }, metricData: { target: 'SpatioTemporalData' }, metricModel: { prediction: 'SpatioTemporalData' } } }
    : kind === 'dataset' ? { files: [{ alias: 'observations', format: 'dataframe', path: 'observations.csv' }] }
    : { taskRefs: [{ id: 10001, version: 1 }], parameters: { setting: { data: 'integer', value: 0 } } };
  return JSON.stringify({ ...common, ...extra }, null, 2);
}
