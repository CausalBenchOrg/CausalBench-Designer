import { Injectable } from '@angular/core';
import { Descriptor, Draft, Entry, clone, emptyDraft } from '../domain/context';
import { ContextSource } from '../domain/context-import';

@Injectable({ providedIn: 'root' })
export class ContextStore {
  draft: Draft = emptyDraft();
  showTaskComposition = false;
  source: ContextSource | null = null;
  replace(draft: Draft, source: ContextSource) { this.draft = clone(draft); this.source = clone(source); }
  hydrateCatalog(descriptors: Descriptor[]) {
    const hydrate = (current: Descriptor) => {
      if (current.provenance === 'manual') return current;
      const incoming = descriptors.find(d => d.kind === current.kind && d.id === current.id && d.version === current.version);
      return incoming ? { ...current, ...clone(Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== undefined))) } as Descriptor : current;
    };
    if (this.draft.task) this.draft.task = hydrate(this.draft.task);
    for (const entry of [...this.draft.datasets, ...this.draft.models, ...this.draft.metrics]) entry.descriptor = hydrate(entry.descriptor);
  }
  selectTask(descriptor: Descriptor | null) { this.draft.task = descriptor ? clone(descriptor) : null; }
  apply(entry: Entry) {
    const key = `${entry.kind}s` as 'datasets' | 'models' | 'metrics';
    const index = this.draft[key].findIndex(e => e.entryId === entry.entryId);
    const saved = clone(entry), current = this.draft[key][index];
    // Catalog metadata may arrive while an isolated configuration editor is open.
    if (current && current.descriptor.id === saved.descriptor.id && current.descriptor.version === saved.descriptor.version)
      saved.descriptor = clone(current.descriptor);
    if (index < 0) this.draft[key].push(saved);
    else this.draft[key][index] = saved;
  }
  remove(entry: Entry) {
    const key = `${entry.kind}s` as 'datasets' | 'models' | 'metrics';
    this.draft[key] = this.draft[key].filter(e => e.entryId !== entry.entryId);
  }
  updateMetadata(descriptor: Descriptor) {
    const matches = (d: Descriptor) => d.kind === descriptor.kind && d.id === descriptor.id && d.version === descriptor.version;
    if (this.draft.task && matches(this.draft.task)) this.draft.task = clone(descriptor);
    for (const entry of [...this.draft.datasets, ...this.draft.models, ...this.draft.metrics]) {
      if (matches(entry.descriptor)) entry.descriptor = clone(descriptor);
    }
  }
}
