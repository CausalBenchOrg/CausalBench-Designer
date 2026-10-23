import { ContextStore } from './context-store.service';
import { hydrateContext } from '../domain/context-import';
import { parseContext } from '../domain/context-reader';
import { serializeYaml } from '../domain/serialize';
import { clone } from '../domain/context';
import { supervisedFixture } from '../../../tests/fixtures/contexts';

describe('Loaded context state', () => {
  it('improves missing metadata as exact catalog versions arrive without changing saved settings', () => {
    const source = supervisedFixture(), store = new ContextStore();
    store.replace(hydrateContext(parseContext(serializeYaml(source)), []), { label: 'Saved context', reference: { id: 9, version: 2 } });
    const mapping = clone(store.draft.datasets[0].mapping), overrides = clone(store.draft.models[0].configurations[0].overrides);
    const pendingEdit = clone(store.draft.models[0]);
    store.hydrateCatalog([{ ...source.task!, provenance: 'registry' }, { ...source.models[0].descriptor, provenance: 'registry' }, { ...source.datasets[0].descriptor, version: 99 }]);
    expect(store.draft.task!.contract).toEqual(source.task!.contract);
    expect(store.draft.datasets[0].descriptor.provenance).toBe('reference');
    expect(store.draft.datasets[0].mapping).toEqual(mapping); expect(store.draft.models[0].configurations[0].overrides).toEqual(overrides);
    pendingEdit.configurations[0].overrides['count'] = 42; store.apply(pendingEdit);
    expect(store.draft.models[0].descriptor.provenance).toBe('registry');
    expect(store.draft.models[0].descriptor.parameters).toBeDefined();
    expect<unknown>(store.draft.models[0].configurations[0].overrides['count']).toBe(42);
  });
  it('copies the loaded draft/source and retains explicit manual metadata over later catalog results', () => {
    const draft = supervisedFixture(), store = new ContextStore(), source = { label: 'Original' };
    store.replace(draft, source); draft.name = 'Changed elsewhere'; source.label = 'Changed elsewhere';
    store.hydrateCatalog([{ ...store.draft.task!, provenance: 'registry', contract: undefined, name: 'Registry name' }]);
    expect(store.draft.name).not.toBe(draft.name); expect(store.source!.label).toBe('Original');
    expect(store.draft.task!.provenance).toBe('manual'); expect(store.draft.task!.contract).toBeDefined();
  });
});
