import { Inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, EMPTY, expand, map, reduce, throwError, timeout } from 'rxjs';
import { Kind, Descriptor } from '../domain/context';
import { normalizeCatalog } from '../domain/descriptors';

export interface RegistryConfig { baseUrl: string; pageSize: number; maxPages: number; }
export const REGISTRY_CONFIG = new InjectionToken<RegistryConfig>('registry configuration', {
  providedIn: 'root', factory: () => ({ baseUrl: 'https://causalbench.org/api', pageSize: 1000, maxPages: 100 })
});
const ENDPOINTS: Record<Kind, [string, string]> = {
  dataset: ['dataset_version/fetch', 'dataset_descriptors'], model: ['model_version/fetch', 'modl_descriptors'],
  metric: ['metric_version/fetch', 'metric_descriptors'], task: ['tasks/fetch', 'task_descriptors']
};
// The live model/metric fetch schema requires this request hint. The server still
// authenticates the bearer token; an unverified browser claim grants no access.
export function registryUserId(token: string): number | undefined {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claim = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).sub;
    const id = typeof claim === 'number' || typeof claim === 'string' && /^\d+$/.test(claim) ? Number(claim) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  } catch { return undefined; }
}
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, @Inject(REGISTRY_CONFIG) private config: RegistryConfig) {}
  getCatalog(kind: Kind, token: string): Observable<Descriptor[]> {
    const [endpoint, key] = ENDPOINTS[kind];
    const userId = registryUserId(token);
    if ((kind === 'model' || kind === 'metric') && userId === undefined)
      return throwError(() => new Error('This registry catalog requires a session token with a numeric subject. Reconnect with a current CausalBench session.'));
    return new Observable<Descriptor[]>(subscriber => {
      const seen = new Set<string>();
      const seenIds = new Set<number>();
      const page = (number: number) => this.http.post<any>(`${this.config.baseUrl}/${endpoint}`, {
        showOnlyUserData: false, searchText: '', sortField: kind === 'task' ? '' : 'Uploaded Date', sortState: kind === 'task' ? '' : 'desc', pageNumber: number, pageSize: this.config.pageSize, filters: [],
        ...((kind === 'model' || kind === 'metric') ? { user_id: userId } : {})
      }, { headers: new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }) }).pipe(timeout(20000), map(response => {
        if ([401, 403].includes(Number(response?.status_code))) throw new HttpErrorResponse({ status: Number(response.status_code), statusText: 'Registry denied the session' });
        if (response?.success === false || Number(response?.status_code) >= 400) throw new Error(`Registry rejected the ${kind} request${response?.status_code ? ` (${response.status_code})` : ''}.`);
        const items = response?.data?.[key];
        if (!Array.isArray(items)) throw new Error(`Unsupported ${kind} response: expected data.${key}. No partial catalog was loaded.`);
        if (items.length) {
          const fingerprint = JSON.stringify(items);
          if (seen.has(fingerprint)) throw new Error('Registry repeated a page. Pagination is unresolved; no partial catalog was loaded.');
          seen.add(fingerprint);
          const idKey = `${kind === 'model' ? 'modl' : kind}_id`;
          for (const item of items) {
            const id = Number(item?.[idKey]);
            if (seenIds.has(id)) throw new Error('Registry returned overlapping pages. Retry the catalog; no partial catalog was loaded.');
            if (Number.isSafeInteger(id) && id > 0) seenIds.add(id);
          }
        }
        return { number, items };
      }));
      const subscription = page(0).pipe(
        expand(result => !result.items.length ? EMPTY : result.number + 1 >= this.config.maxPages
          ? throwError(() => new Error('Registry pagination limit reached. Narrow the catalog or verify server pagination; no partial catalog was loaded.'))
          : page(result.number + 1), 1),
        reduce((items, result) => [...items, ...result.items], [] as unknown[]),
        map(items => {
          const byIdentity = new Map<string, Descriptor>();
          for (const descriptor of normalizeCatalog(kind, items)) byIdentity.set(`${descriptor.id}@${descriptor.version}`, descriptor);
          return [...byIdentity.values()];
        })
      ).subscribe(subscriber);
      return () => subscription.unsubscribe();
    });
  }
}
