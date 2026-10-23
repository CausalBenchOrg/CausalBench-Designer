import { strToU8, zipSync } from 'fflate';
import { parseContext, readContext } from './context-reader';
import { hydrateContext, normalizeSavedContexts } from './context-import';
import { clone, validateDraft } from './context';
import { contextData, flowLiteral, serializeYaml } from './serialize';
import { expandedFixture, supervisedFixture } from '../../../tests/fixtures/contexts';

describe('Opening existing context recipes', () => {
  const descriptors = () => { const draft = expandedFixture(); return [draft.task!, ...draft.datasets.map(e => e.descriptor), ...draft.models.map(e => e.descriptor), ...draft.metrics.map(e => e.descriptor)]; };
  it('round-trips names, descriptions, exact versions, alias reuse, and every explicit configuration', () => {
    const draft = expandedFixture(), data = contextData(draft);
    for (const text of [serializeYaml(draft), flowLiteral(data)]) {
      const restored = hydrateContext(parseContext(text), descriptors());
      expect<unknown>(contextData(restored)).toEqual(data);
      expect(restored.models[0].configurations.length).toBe(3);
      expect(restored.metrics[0].configurations.length).toBe(4);
      expect(restored.datasets[0].entryId).not.toBe(restored.datasets[1].entryId);
      restored.datasets[0].mapping['features'] = 'changed';
      expect(draft.datasets[0].mapping['features']).toBe('observations');
    }
  });
  it('preserves zero, false, null, multiline strings, arrays, objects, scientific notation, and negative zero', () => {
    const draft = supervisedFixture();
    draft.models[0].configurations[0].overrides['settings'] = { array: [false, null, 0, '', 'a\nb', 1e-9, -0] };
    const restored = hydrateContext(parseContext(serializeYaml(draft)), descriptors());
    const values = restored.models[0].configurations[0].overrides['settings'] as { array: unknown[] };
    expect(values.array.slice(0, 6)).toEqual([false, null, 0, '', 'a\nb', 1e-9]);
    expect(Object.is(values.array[6], -0)).toBeTrue();
  });
  it('retains adjacent duplicates and interleaved module order without merging distinct versions', () => {
    const data = contextData(supervisedFixture());
    data.models = [data.models[0], clone(data.models[0]), { ...clone(data.models[0]), version: 2 }, clone(data.models[0])];
    const restored = hydrateContext(parseContext(JSON.stringify(data)), descriptors());
    expect(restored.models.map(e => [e.descriptor.version, e.configurations.length])).toEqual([[1, 2], [2, 1], [1, 1]]);
    expect(new Set(restored.models.flatMap(e => e.configurations.map(c => c.id))).size).toBe(4);
  });
  it('retains unresolved references and saved settings instead of dropping unavailable modules', () => {
    const data = contextData(supervisedFixture());
    const restored = hydrateContext(parseContext(flowLiteral(data)), []);
    expect(restored.task!.id).toBe(data.task.id);
    expect(restored.task!.provenance).toBe('reference');
    expect(restored.models[0].configurations[0].overrides).toEqual(data.models[0].hyperparameters);
    expect(restored.datasets[0].mapping).toEqual(data.datasets[0].mapping);
    expect(validateDraft(restored).some(issue => issue.severity === 'unknown')).toBeTrue();
  });
  it('reads only the configuration from a registry ZIP and rejects ambiguous or oversized configurations', () => {
    const text = serializeYaml(supervisedFixture());
    expect(readContext(zipSync({ 'package/config.yaml': strToU8(text), 'ignored.py': strToU8('raise Exception()') })).name).toBe(supervisedFixture().name);
    expect(() => readContext(zipSync({ 'a/config.yaml': strToU8(text), 'b/config.yaml': strToU8(text) }))).toThrowError(/exactly one/);
    expect(() => readContext(zipSync({ 'config.yaml': strToU8('x'.repeat(2 * 1024 * 1024 + 1)) }))).toThrowError(/exceeds 2 MB/);
    expect(() => readContext(zipSync({ 'other.yaml': strToU8(text) }))).toThrowError(/exactly one/);
  });
  it('rejects incompatible, malformed, or unsupported fields instead of silently losing them', () => {
    const source = contextData(supervisedFixture());
    expect(() => parseContext('name: one\nname: two')).toThrowError(/YAML/);
    expect(() => parseContext('from causalbench.modules import Context')).toThrow();
    expect(() => parseContext(JSON.stringify({ ...source, causalbench: { major: '1', minor: '0', build: '0' } }))).toThrowError(/supports CB/);
    expect(() => parseContext(JSON.stringify({ ...source, task: { id: 1, version: null } }))).toThrowError(/positive integer/);
    expect(() => parseContext(JSON.stringify({ ...source, datasets: [{ ...source.datasets[0], files: { a: {} } }] }))).toThrowError(/not supported/);
    expect(() => parseContext(JSON.stringify({ ...source, models: [{ ...source.models[0], hyperparameters: [] }] }))).toThrowError(/must be an object/);
    expect(() => parseContext('type: context\nname: &a [*a]')).toThrowError(/aliases/);
  });
  it('adapts the saved-context version list and rejects missing identities', () => {
    expect(normalizeSavedContexts([{ pipeline_version_info: [
      { pipeline_id: 9, pipeline_version: 1, pipeline_name: 'Old', pipeline_description: 'First' },
      { pipeline_id: 9, pipeline_version: 2, pipeline_name: 'New' }
    ] }])).toEqual([{ id: 9, version: 1, name: 'Old', description: 'First' }, { id: 9, version: 2, name: 'New', description: '' }]);
    expect(() => normalizeSavedContexts([{ pipeline_version_info: [{ pipeline_id: 9, pipeline_name: 'No version' }] }])).toThrow();
  });
});
