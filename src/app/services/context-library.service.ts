import { Inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable, Subscription, expand, map, reduce, switchMap, throwError, timeout } from 'rxjs';
import { ContextRecipe, SavedContext, normalizeSavedContexts } from '../domain/context-import';
import { REGISTRY_CONFIG, RegistryConfig, registryUserId } from './api.service';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class ContextLibraryService implements OnDestroy {
  status: 'disconnected' | 'idle' | 'loading' | 'ready' | 'error' = 'disconnected';
  items: SavedContext[] = [];
  error = '';
  private active = false;
  private request?: Subscription;
  private tokenSubscription: Subscription;
  constructor(private http: HttpClient, private tokens: TokenService, @Inject(REGISTRY_CONFIG) private config: RegistryConfig) {
    this.tokenSubscription = tokens.token$.subscribe(token => {
      this.request?.unsubscribe(); this.items = []; this.error = ''; this.status = token ? 'idle' : 'disconnected';
      if (this.active) this.refresh();
    });
  }
  activate() { this.active = true; if (this.status !== 'ready' && this.status !== 'loading') this.refresh(); }
  deactivate() { this.active = false; this.request?.unsubscribe(); if (this.status === 'loading') this.status = 'idle'; }
  refresh() {
    this.request?.unsubscribe(); this.error = ''; this.items = [];
    const token = this.tokens.token$.value;
    if (!token) { this.status = 'disconnected'; return; }
    const userId = registryUserId(token);
    if (!userId) { this.status = 'error'; this.error = 'Reconnect with a current CausalBench session to browse saved contexts.'; return; }
    this.status = 'loading';
    const seenPages = new Set<string>(), seenVersions = new Set<string>();
    const page = (number: number) => this.http.post<unknown>(`${this.config.baseUrl}/pipelines/fetch`, {
      user_id: userId, searchText: '', sortField: 'Creation Time', sortState: 'desc', pageNumber: number,
      pageSize: this.config.pageSize, showOnlyUserData: false, versionFilters: [], filters: []
    }, { headers: this.headers(token) }).pipe(timeout(20000), map((raw: any) => {
      if ([401, 403].includes(Number(raw?.status_code))) throw new HttpErrorResponse({ status: Number(raw.status_code) });
      if (raw?.success === false || Number(raw?.status_code) >= 400) throw new Error('The registry rejected the saved-context request.');
      if (!Array.isArray(raw?.data?.pipelines)) throw new Error('Unsupported saved-context response: expected data.pipelines.');
      const fingerprint = JSON.stringify(raw.data.pipelines), items = normalizeSavedContexts(raw.data.pipelines);
      if (items.length) {
        if (seenPages.has(fingerprint)) throw new Error('The registry repeated a context page. Retry; no partial list was loaded.');
        seenPages.add(fingerprint);
        for (const item of items) {
          const key = `${item.id}@${item.version}`;
          if (seenVersions.has(key)) throw new Error('The registry returned overlapping context pages. Retry; no partial list was loaded.');
          seenVersions.add(key);
        }
      }
      return { number, items };
    }));
    this.request = page(0).pipe(
      expand(result => !result.items.length ? EMPTY : result.number + 1 >= this.config.maxPages
        ? throwError(() => new Error('Saved-context pagination limit reached. No partial list was loaded.')) : page(result.number + 1), 1),
      reduce((items, result) => [...items, ...result.items], [] as SavedContext[])
    ).subscribe({ next: items => { this.items = items; this.status = 'ready'; },
      error: error => { this.status = 'error'; this.error = contextLoadError(error); } });
  }
  download(context: SavedContext): Observable<ContextRecipe> {
    const token = this.tokens.token$.value;
    if (!token) return throwError(() => new Error('Connect a current registry session before opening this context.'));
    return this.http.get(`${this.config.baseUrl}/pipelines/download/${context.id}/${context.version}`, {
      headers: this.headers(token), responseType: 'arraybuffer'
    }).pipe(timeout(20000), switchMap(bytes => import('../domain/context-reader').then(reader => reader.readContext(new Uint8Array(bytes)))));
  }
  private headers(token: string) { return new HttpHeaders({ Authorization: `Bearer ${token}` }); }
  ngOnDestroy() { this.request?.unsubscribe(); this.tokenSubscription.unsubscribe(); }
}

export function contextLoadError(error: unknown): string {
  if (error instanceof HttpErrorResponse) return [401, 403].includes(error.status)
    ? 'Registry denied this session. Reconnect with a current token, then retry.'
    : `Context request failed (${error.status || 'network unavailable'}). Retry or open a saved file.`;
  if (error instanceof Error && error.name === 'TimeoutError') return 'The context request timed out. Retry or open a saved file.';
  return error instanceof Error ? error.message : 'The context could not be opened. The current draft was retained.';
}
