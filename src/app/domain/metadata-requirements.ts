import { Descriptor, validIdentity } from './context';

/** Evidence needed to prepare and validate a recipe in Designer. */
export function missingMetadata(d: Descriptor): string[] {
  if (d.kind === 'task') {
    if (!d.contract) return ['task input contract'];
    return Object.entries(d.contract).flatMap(([group, inputs]) => Object.entries(inputs as Record<string, string>).filter(([, type]) =>
      !['SpatioTemporalData', 'SpatioTemporalGraph'].includes(type)).map(([name, type]) => `unsupported runtime type ${type} for ${group}.${name}`));
  }
  if (d.kind === 'dataset') return !d.files?.length ? ['dataset file aliases and formats']
    : d.files.filter(f => !f.format || !['dataframe', 'graph.static', 'graph.temporal'].includes(f.format)).map(f => `supported format for alias ${f.alias}`);
  return [...(!d.taskRefs?.length || d.taskRefs.some(t => !validIdentity(t.id) || !validIdentity(t.version)) ? ['exact task ID/version'] : []),
    ...(d.parameters === undefined ? ['hyperparameter declarations'] : [])];
}
