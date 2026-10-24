import { strToU8, zipSync } from 'fflate';
import { Descriptor } from './context';
import { ModuleArchive, RangeReader } from './module-archive';
import { moduleManifest, taskContract } from './module-metadata';

const taskSource = `from causalbench.formats import SpatioTemporalData as Data, SpatioTemporalGraph
class Other:
    def model_data_inputs(self):
        return {'wrong': SpatioTemporalGraph}
class MyTask:
    def model_data_inputs(self):
        return {'features': Data}
    def metric_data_inputs(self):
        return {'target': SpatioTemporalGraph}
    def metric_model_inputs(self):
        return {'prediction': SpatioTemporalGraph}
`;
const ref = (kind: Descriptor['kind']): Descriptor => ({ kind, id: 9001, version: 2, name: 'Catalog name', provenance: 'registry' });
describe('Automatic package metadata', () => {
  it('reads the exact task class and renamed imports without executing contributed Python', () => {
    const contract = taskContract(taskSource, 'MyTask');
    expect(contract.modelData).toEqual({ features: 'SpatioTemporalData' });
    expect(contract.metricData).toEqual({ target: 'SpatioTemporalGraph' });
    expect(contract.metricModel).toEqual({ prediction: 'SpatioTemporalGraph' });
  });
  it('rejects dynamic, conditional, missing, and malformed task contracts rather than inventing input declarations', () => {
    for (const body of ["if enabled:\n            return {'features': Data}\n        return {}", "return make_inputs()", "return {'features': get_type()}"])
      expect(() => taskContract(taskSource.replace("return {'features': Data}", body), 'MyTask')).toThrow();
    expect(() => taskContract(taskSource, 'Missing')).toThrow();
    expect(() => taskContract(taskSource + '\nclass !!!', 'MyTask')).toThrow();
  });
  it('gets dataset aliases and actual formats from the manifest and uses exact external identities', () => {
    const result = moduleManifest('type: dataset\nname: Dataset\ncausalbench: {major: "0", minor: "2", build: "5"}\nfiles:\n  measurements: {data: dataframe, path: data.csv}', ref('dataset')).descriptor;
    expect(result.id).toBe(9001); expect(result.version).toBe(2); expect(result.provenance).toBe('package');
    expect(result.files).toEqual([{ alias: 'measurements', format: 'dataframe', path: 'data.csv' }]);
  });
  it('reads exact task references, typed defaults including YAML booleans, and omitted parameter declarations', () => {
    const manifest = 'type: metric\nname: Metric\ncausalbench: {major: "0", minor: "2", build: "5"}\ntask: {id: 44, version: 7}';
    expect(moduleManifest(manifest, ref('metric')).descriptor.parameters).toEqual({});
    const result = moduleManifest(manifest + '\nhyperparameters:\n  enabled: {data: boolean, value: True}', ref('metric')).descriptor;
    expect(result.taskRefs).toEqual([{ id: 44, version: 7 }]); expect(result.parameters!['enabled'].value).toBeTrue();
    expect(() => moduleManifest(manifest.replace(', version: 7', ''), ref('metric'))).toThrow();
    expect(() => moduleManifest(manifest, ref('model'))).toThrow();
    expect(moduleManifest(manifest.replace('causalbench: {major: "0", minor: "2", build: "5"}\n', ''), ref('metric')).descriptor.taskRefs).toEqual([{ id: 44, version: 7 }]);
    expect(() => moduleManifest(manifest.replace('major: "0"', 'major: "1"'), ref('metric'))).toThrowError(/targets CB/);
    expect(() => moduleManifest(manifest + '\nhyperparameters: null', ref('metric'))).toThrow();
    expect(() => moduleManifest(manifest + '\nhyperparameters:\n  invalid: {data: decimal, value: .inf}', ref('metric'))).toThrow();
  });
  it('does not silently accept missing dataset formats or YAML aliases/duplicate keys', () => {
    const manifest = 'type: dataset\nname: Dataset\ncausalbench: {major: "0", minor: "2", build: "5"}\nfiles:\n  observations: {path: data.csv}';
    expect(() => moduleManifest(manifest, ref('dataset'))).toThrow();
    expect(() => moduleManifest(manifest + '\nname: Other', ref('dataset'))).toThrow();
  });
  it('reads small full archives and verifies content without inflating dataset files', async () => {
    const bytes = zipSync({ 'config.yaml': strToU8('manifest'), 'data.csv': strToU8('data') });
    const archive = await ModuleArchive.open(async () => ({ bytes, partial: false }));
    expect(await archive.text(archive.manifestName())).toBe('manifest');
    await expectAsync(archive.text('missing.py')).toBeRejected();
  });
  it('uses byte ranges for large packages and returns only the selected manifest', async () => {
    const data = new Uint8Array(200000); for (let i = 0; i < data.length; i++) data[i] = i % 251;
    const bytes = zipSync({ 'config.yaml': strToU8('only metadata'), 'data.csv': [data, { level: 0 }] });
    let downloaded = 0;
    const reader: RangeReader = async range => {
      const [start, end] = range.slice(6).split('-');
      const part = start ? bytes.slice(Number(start), Number(end) + 1) : bytes.slice(-Number(end));
      downloaded += part.length; return { bytes: part, partial: true };
    };
    const archive = await ModuleArchive.open(reader);
    expect(await archive.text('config.yaml')).toBe('only metadata');
    expect(downloaded).toBeLessThan(66000);
  });
  it('rejects ambiguous manifests, malformed ZIPs, and oversized metadata entries', async () => {
    await expectAsync(ModuleArchive.open(async () => ({ bytes: strToU8('not a zip'), partial: false }))).toBeRejected();
    const bytes = zipSync({ 'a/config.yaml': strToU8('a'), 'b/config.yaml': strToU8('b') });
    const archive = await ModuleArchive.open(async () => ({ bytes, partial: false }));
    expect(() => archive.manifestName()).toThrow();
  });
});
