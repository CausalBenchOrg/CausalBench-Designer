import { Descriptor, Draft, clone, newConfiguration, newEntry } from '../../src/app/domain/context';

// Synthetic identities. These describe contracts, not available registry assets.
export function supervisedFixture(): Draft {
  const task: Descriptor = { kind: 'task', id: 91001, version: 2, name: 'Synthetic supervised task', provenance: 'manual', contract: {
    modelData: { features: 'SpatioTemporalData' }, metricData: { labels: 'SpatioTemporalData' }, metricModel: { estimated_labels: 'SpatioTemporalData' }
  } };
  const dataset = newEntry({ kind: 'dataset', id: 92001, version: 3, name: 'Synthetic observations', provenance: 'manual', files: [{ alias: 'observations', format: 'dataframe' }] });
  dataset.mapping = { features: 'observations', labels: 'observations' };
  const model = newEntry({ kind: 'model', id: 93001, version: 1, name: 'Synthetic predictor', provenance: 'manual', taskRefs: [{ id: task.id, version: task.version }], parameters: {
    count: { data: 'integer', value: 3 }, enabled: { data: 'boolean', value: true }, optional: { data: 'integer', value: null },
    text: { data: 'string', value: 'default' }, empty: { data: 'string', value: 'default' },
    collection: { data: 'array', value: [] }, settings: { data: 'object', value: {} }, rate: { data: 'decimal', value: 0.05 },
    tiny: { data: 'decimal' }, large: { data: 'decimal' }, negativeZero: { data: 'decimal' }
  } });
  model.configurations[0].overrides = { count: 0, enabled: false, optional: null, text: "quotes: ' and \"; slash: \\; newline:\n雪\tend", empty: '', collection: [false, 0, null, '', { nested: ['x', 2] }], settings: { falseValue: false, quotedNumber: '0', path: 'C:\\data\\file' }, rate: 0.01 };
  Object.assign(model.configurations[0].overrides, { tiny: 1e-7, large: 1e21, negativeZero: -0 });
  const metric = newEntry({ kind: 'metric', id: 94001, version: 1, name: 'Synthetic accuracy', provenance: 'manual', taskRefs: [{ id: task.id, version: task.version }], parameters: {} });
  return { name: 'Synthetic "context"\n\\ path', description: 'Round-trip strings, values, and explicit configuration entries.', task, datasets: [dataset], models: [model], metrics: [metric] };
}
export function expandedFixture(): Draft {
  const draft = supervisedFixture();
  const dataset = clone(draft.datasets[0]); dataset.entryId += '-second';
  draft.datasets.push(dataset);
  draft.models[0].configurations.push(newConfiguration(), newConfiguration());
  draft.metrics[0].configurations.push(newConfiguration(), newConfiguration(), newConfiguration());
  return draft;
}
export function discoveryFixture(temporal: boolean): Draft {
  const draft = supervisedFixture();
  draft.name = `Synthetic ${temporal ? 'temporal' : 'static'} discovery`;
  draft.task!.contract = { modelData: { observations: 'SpatioTemporalData' }, metricData: { reference_edges: 'SpatioTemporalGraph' }, metricModel: { discovered_edges: 'SpatioTemporalGraph' } };
  draft.datasets[0].descriptor.files!.push({ alias: 'edges', format: temporal ? 'graph.temporal' : 'graph.static' });
  draft.datasets[0].mapping = { observations: 'observations', reference_edges: 'edges' };
  return draft;
}
