import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { strToU8, zipSync } from 'fflate';
import { Descriptor } from '../domain/context';
import { ModuleMetadataService, METADATA_REQUEST_INTERVAL } from './module-metadata.service';
import { REGISTRY_CONFIG } from './api.service';
import { TokenService } from './token.service';

describe('Exact module metadata resolution', () => {
  const token$ = new BehaviorSubject('synthetic-token');
  const tokens = { token$, hasToken: () => !!token$.value };
  const descriptor: Descriptor = { kind: 'metric', id: 99001, version: 3, name: 'Example', provenance: 'registry' };
  const archive = () => zipSync({ 'config.yaml': strToU8('type: metric\nname: Example\ncausalbench: {major: "0", minor: "2", build: "5"}\ntask: {id: 91001, version: 2}\nhyperparameters:\n  flag: {data: boolean, value: True}') });
  let service: ModuleMetadataService;
  beforeEach(() => {
    token$.next('synthetic-token');
    TestBed.configureTestingModule({ providers: [{ provide: TokenService, useValue: tokens },
      { provide: REGISTRY_CONFIG, useValue: { baseUrl: '/registry' } }, { provide: METADATA_REQUEST_INTERVAL, useValue: 0 }] });
    service = TestBed.inject(ModuleMetadataService);
  });
  afterEach(() => service.ngOnDestroy());
  it('deduplicates exact-version downloads, caches package evidence, and preserves manifest defaults', async () => {
    const fetcher = spyOn(window, 'fetch').and.callFake(async (url, init) => {
      expect(String(url)).toBe('/registry/metric_version/download/99001/3');
      expect((init!.headers as Record<string, string>)['Authorization']).toBe('Bearer synthetic-token');
      expect((init!.headers as Record<string, string>)['Range']).toBe('bytes=-65557');
      return new Response(archive(), { status: 200 });
    });
    const first = service.resolve(descriptor), second = service.resolve(descriptor);
    expect(first).toBe(second);
    const resolved = await first;
    expect(resolved!.taskRefs).toEqual([{ id: 91001, version: 2 }]);
    expect(resolved!.parameters!['flag'].value).toBeTrue();
    expect(service.state(descriptor).status).toBe('ready');
    await service.resolve(descriptor); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps denied package access distinct from missing metadata and supports an explicit retry', async () => {
    const fetcher = spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 403 }));
    expect(await service.resolve(descriptor)).toBeUndefined();
    expect(service.state(descriptor).stage).toBe('download');
    expect(service.state(descriptor).error).toContain('HTTP 403');
    fetcher.and.callFake(async () => new Response(archive()));
    await service.resolve(descriptor, true);
    expect(service.state(descriptor).status).toBe('ready');
  });
  it('cancels old session requests and prevents stale metadata from reappearing after reconnect', async () => {
    let finish!: (response: Response) => void;
    const fetcher = spyOn(window, 'fetch').and.callFake(() => new Promise<Response>(resolve => finish = resolve));
    const pending = service.resolve(descriptor);
    while (!fetcher.calls.count()) await new Promise(resolve => setTimeout(resolve, 0));
    token$.next('replacement-token');
    finish(new Response(archive())); await pending;
    expect(service.state(descriptor).status).toBe('idle'); expect(service.states.size).toBe(0);
  });
  it('accepts complete exact registry contracts during authoring while an audit still inspects packages', async () => {
    const complete = { ...descriptor, taskRefs: [{ id: 91001, version: 2 }], parameters: {} };
    const fetcher = spyOn(window, 'fetch').and.callFake(async () => new Response(archive()));
    expect(await service.resolve(complete)).toEqual(complete); expect(fetcher).not.toHaveBeenCalled();
    await service.resolve(complete, false, true);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(service.state(complete).descriptor!.provenance).toBe('package');
  });
});
