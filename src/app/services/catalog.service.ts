import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Descriptor, Kind, clone } from '../domain/context';
import { ModuleAuditRow, ModuleMetadataService, metadataKey } from './module-metadata.service';
import { missingMetadata } from '../domain/metadata-requirements';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { ContextStore } from './context-store.service';

export interface CatalogState { status: 'disconnected' | 'loading' | 'ready' | 'error' | 'unauthorized'; items: Descriptor[]; error: string; }
@Injectable({ providedIn: 'root' })
export class CatalogService implements OnDestroy {
  readonly kinds: Kind[] = ['task', 'dataset', 'model', 'metric'];
  readonly states: Record<Kind, CatalogState> = {
    task: { status: 'disconnected', items: [], error: '' }, dataset: { status: 'disconnected', items: [], error: '' },
    model: { status: 'disconnected', items: [], error: '' }, metric: { status: 'disconnected', items: [], error: '' }
  };
  private tokenSubscription: Subscription;
  private requests: Partial<Record<Kind, Subscription>> = {};
  private manual: Descriptor[] = [];
  private catalogGaps = new Map<string, string[]>();
  audit = { running: false, completed: 0, total: 0, rows: [] as ModuleAuditRow[] };
  private auditGeneration = 0;
  constructor(private api: ApiService, private tokens: TokenService, private store: ContextStore, public metadata: ModuleMetadataService) {
    this.tokenSubscription = tokens.token$.subscribe(token => {
      this.auditGeneration++; this.audit = { running: false, completed: 0, total: 0, rows: [] };
      this.catalogGaps.clear();
      for (const kind of this.kinds) {
        this.requests[kind]?.unsubscribe();
        this.states[kind] = { status: 'disconnected', items: this.manual.filter(d => d.kind === kind), error: '' };
      }
      if (token) for (const kind of this.kinds) this.load(kind);
    });
  }
  load(kind: Kind) {
    const token = this.tokens.token$.value;
    if (!token) return;
    this.requests[kind]?.unsubscribe();
    const state = this.states[kind];
    state.status = 'loading'; state.error = '';
    this.requests[kind] = this.api.getCatalog(kind, token).subscribe({
      next: items => {
        for (const item of items) this.catalogGaps.set(metadataKey(item), missingMetadata(item));
        state.items = [...items.filter(d => !this.manual.some(m => m.kind === d.kind && m.id === d.id && m.version === d.version)).map(d => this.metadata.state(d).descriptor ?? d), ...this.manual.filter(d => d.kind === kind)];
        state.status = 'ready';
        this.store.hydrateCatalog(state.items);
      },
      error: (error: unknown) => {
        const unauthorized = error instanceof HttpErrorResponse && [401, 403].includes(error.status);
        state.status = unauthorized ? 'unauthorized' : 'error';
        state.error = unauthorized ? 'Registry denied this session. Reconnect with current credentials.'
          : error instanceof HttpErrorResponse ? `Registry request failed (${error.status || 'network unavailable'}). Retry or supply descriptor metadata.`
          : error instanceof Error ? error.message : 'Registry request failed. Retry or supply descriptor metadata.';
      }
    });
  }
  upsert(descriptor: Descriptor) {
    const matches = (d: Descriptor) => d.kind === descriptor.kind && d.id === descriptor.id && d.version === descriptor.version;
    this.manual = [...this.manual.filter(d => !matches(d)), clone(descriptor)];
    const state = this.states[descriptor.kind];
    state.items = [...state.items.filter(d => !matches(d)), clone(descriptor)];
  }
  async resolve(descriptor: Descriptor, retry = false, inspectPackage = false) {
    const token = this.tokens.token$.value;
    const resolved = await this.metadata.resolve(descriptor, retry, inspectPackage);
    if (!resolved || token !== this.tokens.token$.value) return;
    const items = this.states[resolved.kind].items;
    const index = items.findIndex(d => metadataKey(d) === metadataKey(resolved));
    if (index >= 0 && items[index].provenance === 'manual') return;
    if (index < 0) items.push(resolved); else items[index] = resolved;
    this.store.hydrateCatalog([resolved]);
    return resolved;
  }
  async auditModules() {
    if (this.audit.running || !this.tokens.hasToken()) return;
    const items = [...this.states.task.items, ...this.states.model.items, ...this.states.metric.items, ...this.states.dataset.items];
    const generation = ++this.auditGeneration;
    this.audit = { running: true, completed: 0, total: items.length, rows: [] };
    let next = 0;
    const worker = async () => {
      while (next < items.length && generation === this.auditGeneration) {
        const item = items[next++];
        await this.resolve(item, this.metadata.state(item).status === 'error', true);
        if (generation !== this.auditGeneration) return;
        const state = this.metadata.state(item);
        this.audit.rows.push({ kind: item.kind, id: item.id, version: item.version, name: item.name,
          status: item.provenance === 'manual' ? 'manual' : state.status, missing: state.missing, error: state.error, stage: state.stage,
          catalogMissing: this.catalogGaps.get(metadataKey(item)) ?? missingMetadata(item) });
        this.audit.completed++;
      }
    };
    await Promise.all(Array.from({ length: 4 }, () => worker()));
    if (generation === this.auditGeneration) {
      this.audit.rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id || a.version - b.version);
      this.audit.running = false;
    }
  }
  get auditProblems() { return this.audit.rows.filter(row => row.status !== 'ready'); }
  get auditVerified() { return this.audit.rows.filter(row => row.status === 'ready').length; }
  cancelAudit() { this.auditGeneration++; this.audit.running = false; }
  downloadAudit() {
    const content = JSON.stringify({ generatedAt: new Date().toISOString(), complete: !this.audit.running && this.audit.completed === this.audit.total,
      attempted: this.audit.completed, verified: this.auditVerified, total: this.audit.total, modules: this.audit.rows }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'causalbench-module-audit.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  ngOnDestroy() {
    this.auditGeneration++;
    this.tokenSubscription.unsubscribe();
    for (const request of Object.values(this.requests)) request?.unsubscribe();
  }
}
