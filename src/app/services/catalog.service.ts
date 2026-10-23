import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Descriptor, Kind, clone } from '../domain/context';
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
  constructor(private api: ApiService, private tokens: TokenService, private store: ContextStore) {
    this.tokenSubscription = tokens.token$.subscribe(token => {
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
        state.items = [...items.filter(d => !this.manual.some(m => m.kind === d.kind && m.id === d.id && m.version === d.version)), ...this.manual.filter(d => d.kind === kind)];
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
  ngOnDestroy() {
    this.tokenSubscription.unsubscribe();
    for (const request of Object.values(this.requests)) request?.unsubscribe();
  }
}
