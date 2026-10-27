import { Component, DoCheck, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ContextStore } from '../../services/context-store.service';
import { TokenService } from '../../services/token.service';
import { ThemeService } from '../../services/theme.service';
import { Descriptor, Entry, EntryKind, clone, compatibility, counts, newEntry, validateDraft } from '../../domain/context';
import { descriptorExample, parseDescriptor } from '../../domain/descriptors';
import { BlueprintNode, BlueprintStore } from '../../services/blueprint-store.service';
import { OpenedContext, hydrateContext } from '../../domain/context-import';

@Component({
    selector: 'app-context-designer',
    templateUrl: './context-designer.component.html',
    styleUrls: ['./context-designer.component.scss'],
    standalone: false
})
export class ContextDesignerComponent implements DoCheck {
  readonly blueprintMode: boolean;
  @ViewChild('metadataDialog', { static: true }) metadataDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('catalogSelect', { static: true }) catalogSelect!: ElementRef<HTMLSelectElement>;
  readonly kinds: EntryKind[] = ['dataset', 'model', 'metric'];
  selectedKind: EntryKind = 'dataset';
  selection = '';
  search = '';
  editing: Entry | null = null;
  showExport = false;
  showOpenContext = false;
  tokenInput = '';
  tokenError = '';
  metadataText = '';
  metadataError = '';
  notice = '';
  constructor(public catalog: CatalogService, public store: ContextStore, public tokens: TokenService,
    public blueprint: BlueprintStore, public theme: ThemeService, route: ActivatedRoute) { this.blueprintMode = route.snapshot.data['blueprint'] === true; }
  ngDoCheck() {
    const descriptors = [...this.catalog.metadata.draftDescriptors(this.draft), ...(this.selectedDescriptor ? [this.selectedDescriptor] : []), ...(this.editing ? [this.editing.descriptor] : [])];
    if (this.tokens.hasToken()) for (const descriptor of descriptors)
      if (descriptor.provenance !== 'manual' && this.catalog.metadata.state(descriptor).status === 'idle') void this.resolveMetadata(descriptor);
    if (this.editing) {
      const resolved = this.catalog.metadata.state(this.editing.descriptor).descriptor;
      if (resolved && this.editing.descriptor.provenance !== 'manual' && this.editing.descriptor !== resolved)
        this.editing = { ...this.editing, descriptor: resolved };
    }
  }
  async resolveMetadata(descriptor: Descriptor, retry = false) { await this.catalog.resolve(descriptor, retry); }
  get draft() { return this.store.draft; }
  get summary() { return counts(this.draft); }
  get issues() { return validateDraft(this.draft); }
  get blockers() { return this.issues.filter(i => i.severity !== 'runtime'); }
  get selectedTaskKey() { return this.draft.task ? this.key(this.draft.task) : ''; }
  get taskMissingFromCatalog() { return this.draft.task && !this.catalog.states.task.items.some(d => this.key(d) === this.selectedTaskKey); }
  get hasCurrentWork() { return !!(this.draft.name || this.draft.description || this.draft.task || this.summary.datasets || this.summary.models || this.summary.metrics || this.editing || this.blueprint.nodes.length); }
  openExistingContext(opened: OpenedContext) {
    const descriptors = this.catalog.kinds.flatMap(kind => this.catalog.states[kind].items);
    const draft = hydrateContext(opened.recipe, descriptors);
    this.store.replace(draft, opened.source);
    this.blueprint.reset(this.draft);
    this.editing = null; this.showExport = false; this.showOpenContext = false;
    this.selection = ''; this.search = '';
    this.notice = 'Context opened. Saved mappings and configurations are restored. Review validation before exporting your edits.';
  }
  get options() {
    const query = this.search.toLowerCase();
    return this.catalog.states[this.selectedKind].items.filter(d => `${d.id} ${d.name}`.toLowerCase().includes(query));
  }
  get selectedDescriptor() { return this.catalog.states[this.selectedKind].items.find(d => this.key(d) === this.selection); }
  get selectionCompatibility() { return this.selectedDescriptor ? compatibility(this.selectedDescriptor, this.draft.task) : 'unknown'; }
  key(d: Descriptor) { return `${d.id}@${d.version}`; }
  setKind(kind: EntryKind) { this.selectedKind = kind; this.selection = ''; this.search = ''; }
  selectTask(key: string) {
    const task = this.catalog.states.task.items.find(d => this.key(d) === key) ?? (this.selectedTaskKey === key ? this.draft.task : null);
    this.store.selectTask(task);
    this.notice = 'Task selection updated. Existing entries are retained and revalidated.';
  }
  addSelected() {
    const descriptor = this.selectedDescriptor;
    if (!descriptor) return;
    if (descriptor.kind !== 'dataset' && compatibility(descriptor, this.draft.task) === 'mismatch') return;
    this.editing = newEntry(descriptor);
  }
  edit(entry: Entry) { this.editing = clone(entry); }
  apply(entry: Entry) {
    this.store.apply(entry);
    if (this.blueprintMode) this.blueprint.attachPending(entry);
    this.editing = null; this.notice = 'Configuration applied to the context.';
  }
  configureBlueprintNode(node: BlueprintNode) {
    const entry = [...this.draft.datasets, ...this.draft.models, ...this.draft.metrics].find(e => e.entryId === node.entryId);
    if (entry) { this.blueprint.pendingNodeId = null; this.edit(entry); }
    else if (node.kind !== 'processor') {
      this.editing = null;
      this.blueprint.pendingNodeId = node.id;
      this.setKind(node.kind);
      this.notice = `Choose a ${node.kind} from the catalog and apply it to this blueprint node.`;
      this.catalogSelect.nativeElement.focus();
    }
  }
  remove(entry: Entry) { this.store.remove(entry); this.editing = null; this.notice = 'Entry removed from the context.'; }
  connect() {
    this.tokenError = this.tokens.setToken(this.tokenInput) ? '' : 'Enter a nonempty session token without whitespace.';
    this.tokenInput = '';
  }
  openMetadata(descriptor?: Descriptor) {
    this.metadataText = descriptor ? JSON.stringify(descriptor, null, 2) : descriptorExample(this.selectedKind);
    this.metadataError = '';
    this.metadataDialog.nativeElement.showModal();
  }
  closeMetadata() { this.metadataDialog.nativeElement.close(); }
  saveMetadata() {
    try {
      const descriptor = parseDescriptor(this.metadataText);
      this.catalog.upsert(descriptor);
      this.store.updateMetadata(descriptor);
      if (this.editing && this.editing.kind === descriptor.kind && this.key(this.editing.descriptor) === this.key(descriptor))
        this.editing = { ...this.editing, descriptor: clone(descriptor) };
      this.search = '';
      if (descriptor.kind !== 'task') { this.selectedKind = descriptor.kind; this.selection = this.key(descriptor); }
      this.notice = 'Manual descriptor saved. Check its identity and contract against the actual component.';
      this.closeMetadata();
    } catch (error) { this.metadataError = error instanceof Error ? error.message : 'Invalid descriptor.'; }
  }
}
