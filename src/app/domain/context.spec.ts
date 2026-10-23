import { clone, compatibility, counts, migrateLegacyEntry, newEntry, uniqueId, validateDraft } from './context';
import { contextData, pythonLiteral, serializePython, serializeYaml } from './serialize';
import { normalizeCatalog, parseDescriptor } from './descriptors';
import { ContextStore } from '../services/context-store.service';
import { discoveryFixture, expandedFixture, supervisedFixture } from '../../../tests/fixtures/contexts';

const blockers = (draft = supervisedFixture()) => validateDraft(draft).filter(i => i.severity !== 'runtime');
describe('Context contracts and serialization', () => {
  it('maps arbitrary input names to the same real alias', () => {
    const draft = supervisedFixture();
    expect<unknown>(blockers(draft)).toEqual([]);
    expect<unknown>(contextData(draft).datasets[0].mapping).toEqual({ features: 'observations', labels: 'observations' });
  });
  it('accepts static and temporal graph formats as the documented graph runtime class', () => {
    expect<unknown>(blockers(discoveryFixture(false))).toEqual([]);
    expect<unknown>(blockers(discoveryFixture(true))).toEqual([]);
  });
  it('retains entries but rejects a changed task version and an observed format mismatch', () => {
    const draft = discoveryFixture(false);
    draft.task!.version++;
    draft.datasets[0].mapping['reference_edges'] = 'observations';
    const issues = blockers(draft);
    expect<unknown>(issues.some(i => i.path === 'models[1].task' && i.severity === 'error')).toBeTrue();
    expect<unknown>(issues.some(i => i.path.includes('reference_edges') && i.message.includes('SpatioTemporalGraph'))).toBeTrue();
    expect<unknown>(draft.models.length).toBe(1);
    expect<unknown>(() => serializePython(draft)).toThrow();
  });
  it('reports unknown task identities, aliases, contracts, and parameter declarations', () => {
    const draft = supervisedFixture();
    delete draft.task!.contract;
    delete draft.datasets[0].descriptor.files;
    delete draft.models[0].descriptor.parameters;
    draft.models[0].descriptor.taskRefs = [{ id: draft.task!.id }];
    expect<unknown>(compatibility(draft.models[0].descriptor, draft.task)).toBe('unknown');
    expect<unknown>(blockers(draft).filter(i => i.severity === 'unknown').length).toBe(4);
    expect<unknown>(() => serializeYaml(draft)).toThrow();
  });
  it('does not guess a task, mapping, missing alias, or unknown override', () => {
    const draft = supervisedFixture();
    draft.task = null;
    expect<unknown>(() => serializePython(draft)).toThrow();
    const valid = supervisedFixture();
    delete valid.datasets[0].mapping['features'];
    valid.datasets[0].mapping['labels'] = 'missing';
    valid.models[0].configurations[0].overrides['typo'] = 0;
    expect<unknown>(blockers(valid).map(i => i.path)).toContain('datasets[1].mapping.features');
    expect<unknown>(blockers(valid).some(i => i.message.includes('absent'))).toBeTrue();
    expect<unknown>(blockers(valid).some(i => i.message === 'Unknown override name.')).toBeTrue();
  });
  it('expands explicit sets into six scenarios and 24 evaluations without deduplicating modules or values', () => {
    const draft = expandedFixture();
    expect<unknown>(counts(draft)).toEqual({ datasets: 2, models: 3, metrics: 4, scenarios: 6, evaluations: 24 });
    expect<unknown>(contextData(draft).models.length).toBe(3);
    expect<unknown>(contextData(draft).metrics.length).toBe(4);
    expect<unknown>(contextData(draft).models[1].hyperparameters).toEqual({});
  });
  it('preserves false, zero, null, empty text, collections and quoted multiline strings', () => {
    const draft = supervisedFixture();
    const params = contextData(draft).models[0].hyperparameters;
    expect<unknown>(params['count']).toBe(0); expect<unknown>(params['enabled']).toBeFalse(); expect<unknown>(params['optional']).toBeNull(); expect<unknown>(params['empty']).toBe('');
    expect<unknown>(pythonLiteral([false, 0, null, ''])).toBe('[False, 0, None, ""]');
    expect<unknown>(serializePython(draft)).toContain('Task(module_id=91001, version=2)');
    expect<unknown>(serializeYaml(draft)).toContain('"build":"5"');
    expect<unknown>(serializePython(draft)).toContain('\\n');
  });
  it('isolates temporary edits and applied snapshots, allowing duplicate module references', () => {
    const store = new ContextStore();
    const entry = supervisedFixture().models[0];
    store.apply(entry);
    const temporary = clone(store.draft.models[0]);
    temporary.configurations[0].overrides['settings'] = { changed: true };
    expect<unknown>(store.draft.models[0].configurations[0].overrides['settings']).not.toEqual({ changed: true });
    store.apply(temporary);
    temporary.configurations[0].overrides['count'] = 99;
    expect<unknown>(store.draft.models[0].configurations[0].overrides['count']).toBe(0);
    store.apply(newEntry(entry.descriptor));
    expect<unknown>(store.draft.models.length).toBe(2);
  });
  it('migrates both legacy mapping layouts and isolates nested parameter sets', () => {
    const fixture = supervisedFixture();
    const legacy = { data: { hyperparameter_sets: [{ parameters: { count: { value: '0', data_type: 'integer' }, enabled: { value: 'false', data_type: 'boolean' }, empty: { value: '', data_type: 'string' } } }] } };
    const result = migrateLegacyEntry('model', legacy, fixture.models[0].descriptor);
    expect<unknown>(result.configurations[0].overrides).toEqual({ count: 0, enabled: false, empty: '' });
    result.configurations[0].overrides['count'] = 4;
    expect<unknown>(legacy.data.hyperparameter_sets[0].parameters.count.value).toBe('0');
    expect<unknown>(migrateLegacyEntry('dataset', { file_mappings: { generic_data: 'a', generic_ground_truth: 'b' } }, fixture.datasets[0].descriptor).mapping).toEqual({ data: 'a', ground_truth: 'b' });
    expect<unknown>(migrateLegacyEntry('dataset', { file_mappings: { data_file: 'a', ground_truth_file: 'b' } }, fixture.datasets[0].descriptor).mapping).toEqual({ data: 'a', ground_truth: 'b' });
  });
  it('creates collision-free entry and configuration identities', () => {
    expect<unknown>(new Set(Array.from({ length: 1000 }, uniqueId)).size).toBe(1000);
  });
  it('keeps scientific notation numeric and preserves signed zero for Python YAML loaders', () => {
    const yaml = serializeYaml(supervisedFixture());
    expect<unknown>(yaml).toContain('"tiny":1.0e-7');
    expect<unknown>(yaml).toContain('"large":1.0e+21');
    expect<unknown>(yaml).toContain('"negativeZero":-0.0');
  });
});

describe('Descriptor boundaries', () => {
  it('requires explicit aliases and task versions rather than using filenames or component IDs', () => {
    const dataset = normalizeCatalog('dataset', [{ dataset_id: 1, dataset_version_info_list: [{ version: { version_number: 1, features: [{ file_name: 'test.csv', file_type: 'file1' }] } }] }])[0];
    expect<unknown>(dataset.files).toBeUndefined();
    const model = normalizeCatalog('model', [{ modl_id: 3, modl_version_info_list: [{ version: { version_number: 1, tasks: [{ id: 3, task_id: 2 }], hyperparameters: [] } }] }])[0];
    expect<unknown>(model.taskRefs).toEqual([{ id: 2, version: undefined }]);
    expect<unknown>(model.parameters).toEqual({});
  });
  it('normalizes manifest aliases and typed false/zero/null defaults without wrappers', () => {
    const model = normalizeCatalog('model', [{ modl_id: 3, modl_version_info_list: [{ version: { version_number: 2, task: { id: 2, version: 1 }, hyperparameters: [{ hyperparameter_name: 'enabled', hyperparameter_data_type: 'boolean', hyperparameter_value: 'false' }] } }] }])[0];
    expect<unknown>(model.taskRefs).toEqual([{ id: 2, version: 1 }]);
    expect<unknown>(model.parameters?.['enabled'].value).toBeFalse();
    const d = normalizeCatalog('dataset', [{ dataset_id: 1, dataset_version_info_list: [{ version: { version_number: 1, files: { observations: { data: 'dataframe', path: 'x.csv' } } } }] }])[0];
    expect<unknown>(d.files).toEqual([{ alias: 'observations', format: 'dataframe', path: 'x.csv' }]);
  });
  it('fails unsupported schemas and malformed manual metadata clearly', () => {
    expect<unknown>(() => normalizeCatalog('task', [{ task_id: 1 }])).toThrow();
    expect<unknown>(() => parseDescriptor('{"kind":"task","id":1,"version":1,"name":"X","contract":{}}')).toThrow();
    expect<unknown>(() => parseDescriptor('{"kind":"model","id":1,"version":1,"name":"X","taskRefs":[{"id":1}]}')).toThrow();
    expect<unknown>(() => parseDescriptor('{"kind":"dataset","id":1,"version":1,"name":"X","files":[{"alias":"a"},{"alias":"a"}]}')).toThrow();
  });
});
