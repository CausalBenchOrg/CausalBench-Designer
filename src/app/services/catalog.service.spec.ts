import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { TokenService } from './token.service';
import { REGISTRY_CONFIG } from './api.service';
import { supervisedFixture } from '../../../tests/fixtures/contexts';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Catalog session lifecycle', () => {
  let catalog: CatalogService, tokens: TokenService, http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.removeItem('token');
    TestBed.configureTestingModule({ imports: [], providers: [{ provide: REGISTRY_CONFIG, useValue: { baseUrl: '/registry', pageSize: 100, maxPages: 3 } }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()] });
    tokens = TestBed.inject(TokenService); catalog = TestBed.inject(CatalogService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { catalog.ngOnDestroy(); tokens.ngOnDestroy(); sessionStorage.removeItem('token'); http.verify(); });
  it('exposes denied/empty/failed states and supports retry without hiding manual descriptors', () => {
    catalog.upsert(supervisedFixture().task!);
    tokens.setToken(`header.${btoa(JSON.stringify({ sub: '9182' }))}.signature`);
    expect(catalog.states.task.status).toBe('loading');
    http.expectOne('/registry/tasks/fetch').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/registry/dataset_version/fetch').flush({ data: { dataset_descriptors: [] } });
    http.expectOne('/registry/model_version/fetch').flush({}, { status: 500, statusText: 'Failure' });
    http.expectOne('/registry/metric_version/fetch').flush({ data: { metric_descriptors: [] } });
    expect(catalog.states.task.status).toBe('unauthorized'); expect(catalog.states.task.items.length).toBe(1);
    expect(catalog.states.dataset.status).toBe('ready'); expect(catalog.states.dataset.items).toEqual([]);
    expect(catalog.states.model.status).toBe('error');
    catalog.load('task'); http.expectOne('/registry/tasks/fetch').flush({ data: { task_descriptors: [] } });
    expect(catalog.states.task.status).toBe('ready'); expect(catalog.states.task.error).toBe('');
    tokens.clearToken(); expect(catalog.states.task.status).toBe('disconnected'); expect(catalog.states.task.items.length).toBe(1);
  });
});
