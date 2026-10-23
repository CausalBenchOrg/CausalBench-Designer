import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService, REGISTRY_CONFIG } from './api.service';

const task = (id: number) => ({ task_id: id, task_name: `task ${id}`, task_version_info_list: [{ version: { version_number: 1 } }] });
describe('Registry fetch boundaries', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: REGISTRY_CONFIG, useValue: { baseUrl: '/registry', pageSize: 100, maxPages: 3 } }] });
    api = TestBed.inject(ApiService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('supplies the active session subject only where the live catalog schema requires it', () => {
    const token = `header.${btoa(JSON.stringify({ sub: '9182' }))}.signature`;
    for (const kind of ['model', 'metric'] as const) {
      api.getCatalog(kind, token).subscribe();
      const request = http.expectOne(`/registry/${kind}_version/fetch`);
      expect(request.request.body.user_id).toBe(9182);
      expect(request.request.body.sortField).toBe('Uploaded Date');
      expect(request.request.body.sortState).toBe('desc');
      request.flush({ data: { [kind === 'model' ? 'modl_descriptors' : 'metric_descriptors']: [] } });
    }
    let message = '';
    api.getCatalog('model', 'opaque').subscribe({ error: error => message = error.message });
    expect(message).toContain('numeric subject');
    http.expectNone('/registry/model_version/fetch');
  });
  it('rejects overlapping pages instead of presenting a deduplicated but incomplete catalog', () => {
    let result = false, message = '';
    api.getCatalog('task', 'x').subscribe({ next: () => result = true, error: error => message = error.message });
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [task(1), task(2)] } });
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [task(2), task(3)] } });
    expect(result).toBeFalse(); expect(message).toContain('overlapping pages');
  });
  it('continues through short pages until an empty page, without hardcoded user identity', () => {
    let result: number[] = [];
    api.getCatalog('task', 'synthetic-token').subscribe(items => result = items.map(item => item.id));
    const first = http.expectOne('/registry/tasks/fetch');
    expect(first.request.body.pageNumber).toBe(0);
    expect(first.request.body.user_id).toBeUndefined();
    expect(first.request.headers.get('Authorization')).toBe('Bearer synthetic-token');
    first.flush({ data: { task_descriptors: [task(1)] } });
    const second = http.expectOne('/registry/tasks/fetch'); expect(second.request.body.pageNumber).toBe(1);
    second.flush({ data: { task_descriptors: [task(2)] } });
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [] } });
    expect(result).toEqual([1, 2]);
  });
  it('never returns a partial catalog after repeated pages or pagination exhaustion', () => {
    let result = false, error = '';
    api.getCatalog('task', 'x').subscribe({ next: () => result = true, error: e => error = e.message });
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [task(1)] } });
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [task(1)] } });
    expect(result).toBeFalse(); expect(error).toContain('repeated a page');
    api.getCatalog('task', 'x').subscribe({ next: () => result = true, error: e => error = e.message });
    for (let id = 1; id <= 3; id++) http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [task(id)] } });
    expect(result).toBeFalse(); expect(error).toContain('pagination limit');
  });
  it('distinguishes an empty catalog from unsupported schemas and denied sessions', () => {
    let empty = false, malformed = '', unauthorized = 0;
    api.getCatalog('task', 'x').subscribe(result => empty = result.length === 0);
    http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [] } });
    api.getCatalog('task', 'x').subscribe({ error: e => malformed = e.message });
    http.expectOne('/registry/tasks/fetch').flush({ data: {} });
    api.getCatalog('task', 'x').subscribe({ error: e => unauthorized = e.status });
    http.expectOne('/registry/tasks/fetch').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(empty).toBeTrue(); expect(malformed).toContain('Unsupported'); expect(unauthorized).toBe(401);
  });
  it('cancels in-flight requests when the subscriber is disposed', () => {
    const subscription = api.getCatalog('task', 'x').subscribe();
    const request = http.expectOne('/registry/tasks/fetch');
    subscription.unsubscribe(); expect(request.cancelled).toBeTrue();
  });
  it('recognizes denied-session envelopes even when the HTTP response is 200', () => {
    let status = 0;
    api.getCatalog('task', 'x').subscribe({ error: error => status = error.status });
    http.expectOne('/registry/tasks/fetch').flush({ success: false, status_code: 403 });
    expect(status).toBe(403);
  });
  it('times out stalled pages so the catalog can recover with a retry', fakeAsync(() => {
    let error = '';
    api.getCatalog('task', 'x').subscribe({ error: e => error = e.message });
    const request = http.expectOne('/registry/tasks/fetch');
    tick(20001);
    expect(error).toContain('Timeout'); expect(request.cancelled).toBeTrue();
  }));
});
