import { parseDocument } from 'yaml';
import { unzipSync } from 'fflate';
import { COMPATIBILITY, Reference, Value, clone, validIdentity } from './context';
import { ContextRecipe, MAX_ARCHIVE_BYTES, MAX_CONTEXT_BYTES } from './context-import';

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error(`${path} must be an object.`);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], path: string) {
  const unknown = Object.keys(value).find(key => !allowed.includes(key));
  if (unknown) throw new Error(`${path}.${unknown} is not supported by this designer. Nothing was replaced.`);
}
function reference(value: unknown, path: string): Reference {
  const ref = object(value, path);
  if (!validIdentity(ref['id']) || !validIdentity(ref['version'])) throw new Error(`${path} needs positive integer id and version values.`);
  return { id: ref['id'], version: ref['version'] };
}
function jsonValue(value: unknown, depth = 0): value is Value {
  if (depth > 40) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => jsonValue(item, depth + 1));
  return !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(item => jsonValue(item, depth + 1));
}
/** Parses data only. Component code and Python context scripts are never evaluated. */
export function parseContext(text: string): ContextRecipe {
  if (new TextEncoder().encode(text).length > MAX_CONTEXT_BYTES) throw new Error('Context files must be 2 MB or smaller.');
  const document = parseDocument(text, { version: '1.1', uniqueKeys: true, customTags: [] });
  if (document.errors.length || document.warnings.length)
    throw new Error(`Invalid or unsupported YAML/JSON: ${(document.errors[0] ?? document.warnings[0]).message}`);
  let value: unknown;
  try { value = document.toJS({ maxAliasCount: 0 }); }
  catch { throw new Error('YAML aliases are not supported. Use explicit context values.'); }
  const root = object(value, 'context');
  keys(root, ['type', 'causalbench', 'name', 'description', 'task', 'datasets', 'models', 'metrics'], 'context');
  if (root['type'] !== 'context') throw new Error('Select a CausalBench context (type: context). Python scripts and component manifests cannot be opened as contexts.');
  const cb = object(root['causalbench'], 'causalbench');
  keys(cb, ['major', 'minor', 'build'], 'causalbench');
  if (!['major', 'minor', 'build'].every(key => /^(0|[1-9]\d*)$/.test(String(cb[key]))))
    throw new Error('causalbench needs numeric major, minor, and build values.');
  if (String(cb['major']) !== COMPATIBILITY.major || String(cb['minor']) !== COMPATIBILITY.minor)
    throw new Error(`This context targets CB ${cb['major']}.${cb['minor']}; this designer supports CB ${COMPATIBILITY.major}.${COMPATIBILITY.minor}.x.`);
  if (typeof root['name'] !== 'string') throw new Error('Context name must be text.');
  if (root['description'] !== undefined && typeof root['description'] !== 'string') throw new Error('Context description must be text.');
  keys(object(root['task'], 'task'), ['id', 'version'], 'task');
  const task = reference(root['task'], 'task');
  let total = 0;
  const entries = (group: 'datasets' | 'models' | 'metrics') => {
    const array = root[group];
    if (!Array.isArray(array)) throw new Error(`${group} must be an array.`);
    total += array.length;
    if (total > 10000) throw new Error('A context can contain at most 10,000 component entries.');
    return array.map((raw, index) => {
      const path = `${group}[${index + 1}]`, item = object(raw, path);
      const field = group === 'datasets' ? 'mapping' : 'hyperparameters';
      keys(item, ['id', 'version', field], path);
      const ref = reference(item, path), settings = object(item[field] ?? {}, `${path}.${field}`);
      if (group === 'datasets') {
        if (!Object.entries(settings).every(([name, alias]) => name.length > 0 && typeof alias === 'string'))
          throw new Error(`${path}.mapping must map input names to dataset alias strings.`);
      } else if (!Object.keys(settings).every(name => name.length > 0) || !jsonValue(settings))
        throw new Error(`${path}.hyperparameters must contain finite JSON values, at most 40 levels deep.`);
      return { ...ref, [field]: clone(settings) };
    });
  };
  return {
    type: 'context', causalbench: { major: String(cb['major']), minor: String(cb['minor']), build: String(cb['build']) },
    name: root['name'], description: root['description'] as string ?? '', task,
    datasets: entries('datasets') as ContextRecipe['datasets'], models: entries('models') as ContextRecipe['models'], metrics: entries('metrics') as ContextRecipe['metrics']
  };
}

/** Read only config.yaml/config.yml/config.json from a ZIP; never extract files to disk. */
export function readContext(bytes: Uint8Array): ContextRecipe {
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error('Context archives must be 8 MB or smaller.');
  let content = bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    let oversized = false;
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(bytes, { filter: entry => {
        const match = /(^|\/)config\.(ya?ml|json)$/i.test(entry.name);
        if (match && entry.originalSize > MAX_CONTEXT_BYTES) oversized = true;
        return match && entry.originalSize <= MAX_CONTEXT_BYTES;
      } });
    } catch { throw new Error('The context ZIP archive could not be read.'); }
    if (oversized) throw new Error('The context configuration inside the archive exceeds 2 MB.');
    const configurations = Object.values(files);
    if (configurations.length !== 1) throw new Error('Choose an archive containing exactly one config.yaml, config.yml, or config.json.');
    content = configurations[0];
  }
  if (content.length > MAX_CONTEXT_BYTES) throw new Error('Context files must be 2 MB or smaller.');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(content); }
  catch { throw new Error('Context configuration must be UTF-8 YAML or JSON.'); }
  return parseContext(text);
}

