import { BlueprintStore } from './blueprint-store.service';
import { contextData } from '../domain/serialize';
import { clone } from '../domain/context';
import { supervisedFixture } from '../../../tests/fixtures/contexts';

describe('Experimental blueprint presentation state', () => {
  it('keeps positions stable and distinguishes repeated entries of one module', () => {
    const draft = supervisedFixture(), state = new BlueprintStore();
    const duplicate = clone(draft.models[0]); duplicate.entryId += '-second'; draft.models.push(duplicate);
    state.sync(draft); state.nodes[0].x = 321;
    const ids = state.nodes.map(n => n.id);
    state.sync(draft);
    expect(state.nodes.map(n => n.id)).toEqual(ids); expect(state.nodes[0].x).toBe(321);
    expect(state.nodes.filter(n => n.kind === 'model').length).toBe(2);
  });
  it('attaches a configured placeholder once and blocks counting it as complete before Apply', () => {
    const state = new BlueprintStore(), draft = supervisedFixture();
    const placeholder = state.add('model', 80, 100); state.pendingNodeId = placeholder.id;
    expect(state.unconfiguredCount).toBe(1);
    state.attachPending(draft.models[0]); state.sync(draft);
    expect(state.unconfiguredCount).toBe(0);
    expect(state.nodes.filter(n => n.entryId === draft.models[0].entryId).length).toBe(1);
    expect(state.nodes.find(n => n.id === placeholder.id)!.x).toBe(80);
  });
  it('retains visual connections separately from executable mappings and cleans removed nodes', () => {
    const draft = supervisedFixture(), state = new BlueprintStore(); state.sync(draft);
    const before = contextData(draft), dataset = state.nodes[0], model = state.nodes[1], metric = state.nodes[2];
    const processor = state.add('processor', 300, 120);
    expect(state.connect(dataset, processor)).toBeTrue(); expect(state.connect(processor, model)).toBeTrue(); expect(state.connect(model, metric)).toBeTrue();
    expect(state.connect(metric, dataset)).toBeFalse(); expect(state.connect(model, model)).toBeFalse();
    state.connect(model, metric); expect(state.edges.length).toBe(3);
    expect<unknown>(contextData(draft)).toEqual(before);
    state.remove(processor); expect(state.edges.length).toBe(1);
    draft.metrics = []; state.sync(draft); expect(state.edges.length).toBe(0);
  });
  it('uses unique IDs during rapid sketch creation and keeps processors explicitly outside the recipe', () => {
    const state = new BlueprintStore();
    for (let i = 0; i < 100; i++) state.add('processor', i, i);
    expect(new Set(state.nodes.map(n => n.id)).size).toBe(100);
    expect(state.unconfiguredCount).toBe(0);
  });
  it('reconstructs recipe arrows on open and updates labels after mappings or task metadata change', () => {
    const draft = supervisedFixture(), state = new BlueprintStore();
    state.reset(draft);
    expect(state.edges.length).toBe(0); expect(state.recipeEdges.length).toBe(3);
    expect(state.recipeEdges.find(e => e.role === 'model-data')!.label).toContain('observations → features');
    expect(state.recipeEdges.find(e => e.role === 'metric-data')!.label).toContain('observations → labels');
    const ids = state.recipeEdges.map(e => e.id);
    draft.datasets[0].mapping['features'] = 'another'; state.sync(draft);
    expect(state.recipeEdges.map(e => e.id)).toEqual(ids);
    expect(state.recipeEdges.find(e => e.role === 'model-data')!.label).toContain('another → features');
    draft.task!.contract = undefined; state.sync(draft);
    expect(state.recipeEdges.length).toBe(2); expect(state.recipeEdges[0].label).toContain('unverified');
    draft.metrics = []; state.sync(draft); expect(state.recipeEdges.length).toBe(1);
  });
});
