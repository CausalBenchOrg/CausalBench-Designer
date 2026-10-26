import { Inject, Injectable, InjectionToken, NgZone, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Descriptor, Draft } from '../domain/context';
import { REGISTRY_CONFIG, RegistryConfig } from './api.service';
import { TokenService } from './token.service';
import { missingMetadata } from '../domain/metadata-requirements';

export interface MetadataState { status: 'idle' | 'loading' | 'ready' | 'error'; descriptor?: Descriptor; missing: string[]; error: string; stage?: string; }
export interface ModuleAuditRow { kind: string; id: number; version: number; name: string; status: string; missing: string[]; error: string; stage?: string; catalogMissing?: string[]; }
export const metadataKey = (d: Descriptor) => `${d.kind}:${d.id}@${d.version}`;
export const METADATA_REQUEST_INTERVAL = new InjectionToken<number>('metadata request interval', { providedIn: 'root', factory: () => 800 });
@Injectable({ providedIn: 'root' })
export class ModuleMetadataService implements OnDestroy {
  readonly states = new Map<string, MetadataState>();
  private pending = new Map<string, Promise<Descriptor | undefined>>();
  private controllers = new Set<AbortController>();
  private subscription: Subscription;
  private generation = 0;
  private nextRequestAt = 0;
  constructor(private tokens: TokenService, private zone: NgZone, @Inject(REGISTRY_CONFIG) private config: RegistryConfig,
    @Inject(METADATA_REQUEST_INTERVAL) private requestInterval: number) {
    this.subscription = tokens.token$.subscribe(() => {
      this.generation++; for (const controller of this.controllers) controller.abort();
      this.controllers.clear(); this.pending.clear(); this.states.clear();
    });
  }
  state(d: Descriptor): MetadataState { return this.states.get(metadataKey(d)) ?? { status: 'idle', missing: [], error: '' }; }
  resolve(d: Descriptor, retry = false, inspectPackage = false): Promise<Descriptor | undefined> {
    if (d.provenance === 'manual' || !this.tokens.hasToken()) return Promise.resolve(undefined);
    const key = metadataKey(d), prior = this.states.get(key);
    if (this.pending.has(key)) return this.pending.get(key)!;
    if (prior && !retry && (!inspectPackage || prior.descriptor?.provenance === 'package')) return Promise.resolve(prior.descriptor);
    if (d.provenance === 'registry' && !missingMetadata(d).length && !inspectPackage) {
      this.states.set(key, { status: 'ready', descriptor: d, missing: [], error: '' });
      return Promise.resolve(d);
    }
    const generation = this.generation, controller = new AbortController(), token = this.tokens.token$.value;
    this.controllers.add(controller);
    this.states.set(key, { status: 'loading', missing: [], error: '' });
    const timeout = setTimeout(() => controller.abort(), retry ? 180000 : 60000);
    const promise = (async () => {
      let stage = 'download';
      try {
        const [{ ModuleArchive, readModuleRange }, { moduleManifest, taskContract, missingMetadata }] = await Promise.all([
          import('../domain/module-archive'), import('../domain/module-metadata')
        ]);
        const endpoint = d.kind === 'task' ? 'tasks' : `${d.kind}_version`;
        const url = `${this.config.baseUrl}/${endpoint}/download/${d.id}/${d.version}`;
        const archive = await ModuleArchive.open(async (range, limit) => {
          const start = Math.max(Date.now(), this.nextRequestAt); this.nextRequestAt = start + this.requestInterval;
          if (start > Date.now()) await new Promise<void>(resolve => setTimeout(resolve, start - Date.now()));
          return readModuleRange(url, token, range, limit, controller.signal);
        });
        const manifestName = archive.manifestName();
        stage = 'manifest';
        const manifest = moduleManifest(await archive.text(manifestName), d);
        if (d.kind === 'task' && d.contract && !manifest.descriptor.contract) manifest.descriptor.contract = d.contract;
        if (d.kind === 'task' && !manifest.descriptor.contract) {
          stage = 'task-source';
          if (typeof manifest.sourcePath !== 'string' || typeof manifest.className !== 'string') throw new Error('Task manifest is missing path or class_name.');
          if (!/^[\w./ -]+\.py$/.test(manifest.sourcePath) || manifest.sourcePath.startsWith('/') || manifest.sourcePath.split('/').includes('..'))
            throw new Error('Task manifest has an unsupported source path.');
          const path = manifestName.slice(0, manifestName.lastIndexOf('/') + 1) + manifest.sourcePath.replace(/^\.\//, '');
          manifest.descriptor.contract = taskContract(await archive.text(path), manifest.className);
        }
        const missing = missingMetadata(manifest.descriptor);
        if (generation !== this.generation) return undefined;
        this.zone.run(() => this.states.set(key, { status: missing.length ? 'error' : 'ready', descriptor: manifest.descriptor, missing, error: '' }));
        return manifest.descriptor;
      } catch (error) {
        if (generation === this.generation) this.zone.run(() => this.states.set(key, { status: 'error', missing: [], stage,
          error: controller.signal.aborted ? 'Module metadata request timed out. Retry the download.' : error instanceof TypeError ? 'Module download was blocked by the network or registry. Metadata has not been inspected; retry later.' : error instanceof Error ? error.message : 'Module metadata could not be resolved.' }));
        return undefined;
      } finally { clearTimeout(timeout); this.controllers.delete(controller); if (generation === this.generation) this.pending.delete(key); }
    })();
    this.pending.set(key, promise);
    return promise;
  }
  draftDescriptors(draft: Draft): Descriptor[] { return [...(draft.task ? [draft.task] : []), ...[...draft.datasets, ...draft.models, ...draft.metrics].map(e => e.descriptor)]; }
  ngOnDestroy() { this.subscription.unsubscribe(); for (const controller of this.controllers) controller.abort(); }
}
