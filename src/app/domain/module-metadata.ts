import { parser } from '@lezer/python';
import type { SyntaxNode } from '@lezer/common';
import { parseDocument } from 'yaml';
import { Descriptor, InputContract, isValue } from './context';
import { parseDescriptor } from './descriptors';

export const MAX_METADATA_BYTES = 2 * 1024 * 1024;
export { missingMetadata } from './metadata-requirements';
function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) result.push(child);
  return result;
}
/** Reads only literal declarations. No Python imports, calls, or code are executed. */
export function taskContract(source: string, className: string): InputContract {
  if (new TextEncoder().encode(source).length > MAX_METADATA_BYTES) throw new Error('Task source exceeds the metadata size limit.');
  const tree = parser.parse(source);
  let invalid = false;
  tree.iterate({ enter: node => { if (node.type.isError) invalid = true; } });
  if (invalid) throw new Error('Task Python source could not be parsed.');
  const text = (n: SyntaxNode) => source.slice(n.from, n.to);
  const classes = children(tree.topNode).filter(n => n.name === 'ClassDefinition' && text(n.getChild('VariableName')!) === className);
  if (classes.length !== 1) throw new Error(`Task class ${className} was not found unambiguously.`);
  const imports = children(tree.topNode).filter(n => n.name === 'ImportStatement').map(text).join('\n');
  const resolveType = (node: SyntaxNode): string => {
    const value = text(node).replace(/\s/g, '');
    if (!['VariableName', 'MemberExpression'].includes(node.name) || !/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(value))
      throw new Error('Task input types must be literal type references.');
    const type = value.split('.').pop()!;
    const alias = imports.match(new RegExp(`\\b(SpatioTemporalData|SpatioTemporalGraph)\\s+as\\s+${type}\\b`));
    return alias?.[1] ?? type;
  };
  const read = (method: string): Record<string, string> => {
    const functions = children(classes[0].getChild('Body')!).filter(n => n.name === 'FunctionDefinition' && text(n.getChild('VariableName')!) === method);
    if (functions.length !== 1) throw new Error(`Task ${method}() has no literal declaration. A registry contract is required.`);
    const statements = children(functions[0].getChild('Body')!).filter(n => n.name !== ':' && n.name !== 'Comment' &&
      !(n.name === 'ExpressionStatement' && n.getChild('String')));
    if (statements.length !== 1 || statements[0].name !== 'ReturnStatement')
      throw new Error(`Task ${method}() uses dynamic Python. A registry contract is required.`);
    const dictionary = statements[0].getChild('DictionaryExpression');
    if (!dictionary) throw new Error(`Task ${method}() must return a literal input map.`);
    const parts = children(dictionary).filter(n => !['{', '}', ',', 'Comment'].includes(n.name));
    if (parts.length % 3) throw new Error(`Task ${method}() contains an unsupported input declaration.`);
    const result: Record<string, string> = {};
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i].name !== 'String' || parts[i + 1].name !== ':') throw new Error(`Task ${method}() input names must be literal strings.`);
      const raw = text(parts[i]);
      // Restrict to plain names; escaped/dynamic expressions need an explicit registry contract.
      if (!/^(['"])[^\\\r\n]+\1$/.test(raw)) throw new Error(`Task ${method}() has an unsupported input name.`);
      const name = raw.slice(1, -1);
      if (Object.hasOwn(result, name)) throw new Error(`Task ${method}() declares ${name} twice.`);
      Object.defineProperty(result, name, { value: resolveType(parts[i + 2]), enumerable: true, configurable: true, writable: true });
    }
    return result;
  };
  return { modelData: read('model_data_inputs'), metricData: read('metric_data_inputs'), metricModel: read('metric_model_inputs') };
}

export interface ModuleManifest { descriptor: Descriptor; sourcePath?: string; className?: string; }
export function moduleManifest(text: string, reference: Descriptor): ModuleManifest {
  if (new TextEncoder().encode(text).length > MAX_METADATA_BYTES) throw new Error('Module manifest exceeds the metadata size limit.');
  const document = parseDocument(text, { version: '1.1', uniqueKeys: true, customTags: [] });
  if (document.errors.length || document.warnings.length) throw new Error('Module manifest contains invalid or unsupported YAML.');
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.type !== reference.kind)
    throw new Error(`Package does not contain a ${reference.kind} manifest.`);
  // Module.__init__ initializes causalbench to the installed version before merging
  // manifest fields. Legacy packages can therefore omit this block legitimately.
  if (Object.hasOwn(value, 'causalbench') && (!value.causalbench || String(value.causalbench.major) !== '0' || String(value.causalbench.minor) !== '2'))
    throw new Error(`Module manifest targets CB ${value.causalbench?.major ?? '?'}.${value.causalbench?.minor ?? '?'}; Designer supports CB 0.2.`);
  const fields: any = { kind: reference.kind, id: reference.id, version: reference.version, name: value.name, description: value.description };
  if (reference.kind === 'dataset') {
    if (!value.files || typeof value.files !== 'object' || Array.isArray(value.files)) throw new Error('Dataset manifest does not declare a file alias map.');
    fields.files = Object.entries(value.files).map(([alias, f]: [string, any]) => {
      if (!f || typeof f.data !== 'string' || typeof f.path !== 'string') throw new Error(`Dataset alias ${alias} is missing its format or path.`);
      return { alias, format: f.data, path: f.path };
    });
  } else if (reference.kind === 'model' || reference.kind === 'metric') {
    fields.taskRefs = [value.task];
    fields.parameters = Object.hasOwn(value, 'hyperparameters') ? value.hyperparameters : {};
    if (!isValue(fields.parameters)) throw new Error('Module hyperparameters contain unsupported values; finite JSON defaults are required.');
  } else if (value.contract) fields.contract = value.contract;
  const descriptor = { ...parseDescriptor(JSON.stringify(fields)), provenance: 'package' as const };
  return { descriptor, sourcePath: value.path, className: value.class_name };
}
