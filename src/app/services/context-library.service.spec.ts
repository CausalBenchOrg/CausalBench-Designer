import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ContextLibraryService } from './context-library.service';
import { TokenService } from './token.service';
import { REGISTRY_CONFIG } from './api.service';
import { serializeYaml } from '../domain/serialize';
import { supervisedFixture } from '../../../tests/fixtures/contexts';

const token = `header.${btoa(JSON.stringify({ sub: '9182' }))}.signature`;
const record = (version: number) => ({ pipeline_version_info: [{ pipeline_id: 8, pipeline_version: version, pipeline_name: `Saved v${version}` }] });
describe('Saved-context registry boundary', () => {
  let library: ContextLibraryService, http: HttpTestingController, session: BehaviorSubject<string>;
  beforeEach(() => {
    session = new BehaviorSubject(token);
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      { provide: REGISTRY_CONFIG, useValue: { baseUrl: '/registry', pageSize: 100, maxPages: 3 } },
      { provide: TokenService, useValue: { token$: session } }
    ] });
    library = TestBed.inject(ContextLibraryService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { library.ngOnDestroy(); http.verify(); });
  it('loads every version only when opened, using the documented session hint and pagination body', () => {
    http.expectNone('/registry/pipelines/fetch');
    library.activate();
    const first = http.expectOne('/registry/pipelines/fetch');
    expect(first.request.body.user_id).toBe(9182); expect(first.request.body.versionFilters).toEqual([]);
    expect(first.request.body.sortField).toBe('Creation Time');
    first.flush({ data: { pipelines: [record(1)] } });
    const second = http.expectOne('/registry/pipelines/fetch'); expect(second.request.body.pageNumber).toBe(1);
    second.flush({ data: { pipelines: [record(2)] } });
    http.expectOne('/registry/pipelines/fetch').flush({ data: { pipelines: [] } });
    expect(library.items.map(item => item.version)).toEqual([1, 2]); expect(library.status).toBe('ready');
    library.deactivate(); library.activate(); http.expectNone('/registry/pipelines/fetch');
  });
  it('downloads the pinned recipe with authorization and reads the file without executing code', async () => {
    const result = firstValueFrom(library.download({ id: 8, version: 2, name: 'Saved', description: '' }));
    const request = http.expectOne('/registry/pipelines/download/8/2');
    expect(request.request.method).toBe('GET'); expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush(new TextEncoder().encode(serializeYaml(supervisedFixture())).buffer);
    expect((await result).name).toBe(supervisedFixture().name);
  });
  it('cancels old-session requests and distinguishes denied sessions, malformed data, and an empty list', () => {
    library.activate(); const old = http.expectOne('/registry/pipelines/fetch');
    session.next(''); expect(old.cancelled).toBeTrue(); expect(library.status).toBe('disconnected');
    session.next(token); http.expectOne('/registry/pipelines/fetch').flush({}, { status: 401, statusText: 'Denied' });
    expect(library.error).toContain('Reconnect');
    library.refresh(); http.expectOne('/registry/pipelines/fetch').flush({ data: {} }); expect(library.error).toContain('Unsupported');
    library.refresh(); http.expectOne('/registry/pipelines/fetch').flush({ data: { pipelines: [] } });
    expect(library.status).toBe('ready'); expect(library.items).toEqual([]);
  });
  it('never presents a partial list after overlapping or repeated pages', () => {
    library.activate(); http.expectOne('/registry/pipelines/fetch').flush({ data: { pipelines: [record(1)] } });
    http.expectOne('/registry/pipelines/fetch').flush({ data: { pipelines: [record(1), record(2)] } });
    expect(library.status).toBe('error'); expect(library.items).toEqual([]); expect(library.error).toContain('overlapping');
  });
});
