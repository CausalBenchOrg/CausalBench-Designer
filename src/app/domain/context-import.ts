import { Descriptor, Draft, Entry, EntryKind, Kind, Reference, Value, clone, newConfiguration, newEntry, validIdentity } from './context';

export const MAX_CONTEXT_BYTES = 2 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
export interface ContextRecipe {
  type: 'context';
  causalbench: { major: string; minor: string; build: string };
  name: string;
  description: string;
  task: Reference;
  datasets: (Reference & { mapping: Record<string, string> })[];
  models: (Reference & { hyperparameters: Record<string, Value> })[];
  metrics: (Reference & { hyperparameters: Record<string, Value> })[];
}
export interface SavedContext extends Reference { name: string; description: string; }
export interface ContextSource { label: string; reference?: Reference; }
export interface OpenedContext { recipe: ContextRecipe; source: ContextSource; }

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error(`${path} must be an object.`);
  return value as Record<string, unknown>;
}
export function hydrateContext(recipe: ContextRecipe, descriptors: Descriptor[]): Draft {
  const resolve = (kind: Kind, ref: Reference): Descriptor => clone(descriptors.find(d => d.kind === kind && d.id === ref.id && d.version === ref.version) ??
    { ...ref, kind, name: `${kind[0].toUpperCase()}${kind.slice(1)} #${ref.id}`, provenance: 'reference' });
  const modules = (kind: EntryKind, items: ContextRecipe['models']): Entry[] => {
    const entries: Entry[] = [];
    for (const item of items) {
      // Group only consecutive repeats, retaining serialized order and duplicate configurations.
      let entry = entries[entries.length - 1];
      if (!entry || entry.descriptor.id !== item.id || entry.descriptor.version !== item.version) {
        entry = newEntry(resolve(kind, item)); entry.configurations = []; entries.push(entry);
      }
      entry.configurations.push({ ...newConfiguration(), overrides: clone(item.hyperparameters) });
    }
    return entries;
  };
  return {
    name: recipe.name, description: recipe.description, task: resolve('task', recipe.task),
    datasets: recipe.datasets.map(item => ({ ...newEntry(resolve('dataset', item)), mapping: clone(item.mapping) })),
    models: modules('model', recipe.models), metrics: modules('metric', recipe.metrics)
  };
}

/** Fields confirmed against the public registry frontend's context catalog adapter. */
export function normalizeSavedContexts(items: unknown[]): SavedContext[] {
  return items.flatMap(raw => {
    const group = object(raw, 'Saved context');
    if (!Array.isArray(group['pipeline_version_info']) || !group['pipeline_version_info'].length)
      throw new Error('Unsupported context catalog: expected pipeline_version_info.');
    return group['pipeline_version_info'].map(rawVersion => {
      const version = object(rawVersion, 'Saved context version');
      if (!validIdentity(version['pipeline_id']) || !validIdentity(version['pipeline_version']) || typeof version['pipeline_name'] !== 'string')
        throw new Error('Saved context has no exact ID, version, or name.');
      return { id: version['pipeline_id'], version: version['pipeline_version'], name: version['pipeline_name'],
        description: typeof version['pipeline_description'] === 'string' ? version['pipeline_description'] : '' };
    });
  });
}
