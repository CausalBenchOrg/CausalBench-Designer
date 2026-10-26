import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, PendingTasks, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContextRecipe, ContextSource, MAX_ARCHIVE_BYTES, OpenedContext } from '../../domain/context-import';
import { ContextLibraryService, contextLoadError } from '../../services/context-library.service';
import { TokenService } from '../../services/token.service';

@Component({
    selector: 'app-open-context', templateUrl: './open-context.component.html', styleUrls: ['./open-context.component.scss'],
    standalone: false
})
export class OpenContextComponent implements OnChanges, OnDestroy {
  @Input() showDialog = false;
  @Input() replacesDraft = false;
  @Output() closeDialog = new EventEmitter<void>();
  @Output() contextOpened = new EventEmitter<OpenedContext>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  selection = '';
  search = '';
  text = '';
  loading = false;
  error = '';
  preview: OpenedContext | null = null;
  private generation = 0;
  private download?: Subscription;
  private tokenSubscription: Subscription;
  constructor(public library: ContextLibraryService, public tokens: TokenService,
    private pendingTasks: PendingTasks, private changeDetector: ChangeDetectorRef) {
    this.tokenSubscription = tokens.token$.subscribe(() => {
      if (this.loading || this.preview?.source.reference) this.cancelPreview();
      this.selection = '';
    });
  }
  get options() { const query = this.search.toLowerCase(); return this.library.items.filter(c => `${c.id} ${c.version} ${c.name}`.toLowerCase().includes(query)); }
  key(context: { id: number; version: number }) { return `${context.id}@${context.version}`; }
  refreshLibrary() { this.cancelPreview(); this.selection = ''; this.library.refresh(); }
  ngOnChanges() {
    if (this.showDialog) {
      if (!this.dialog.nativeElement.open) { this.cancelPreview(); this.selection = ''; this.dialog.nativeElement.showModal(); this.library.activate(); }
    } else { this.dialog.nativeElement.close(); this.library.deactivate(); this.cancelPreview(); }
  }
  cancelPreview() { this.download?.unsubscribe(); this.generation++; this.loading = false; this.preview = null; this.error = ''; }
  selectContext() {
    this.cancelPreview();
    const selected = this.library.items.find(c => this.key(c) === this.selection);
    if (!selected) return;
    this.loading = true;
    const generation = this.generation;
    this.download = this.library.download(selected).subscribe({
      next: recipe => { if (generation === this.generation) this.ready(recipe, { label: selected.name, reference: { id: selected.id, version: selected.version } }); },
      error: error => { if (generation === this.generation) { this.loading = false; this.error = contextLoadError(error); } }
    });
  }
  async readFile(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    this.cancelPreview(); this.selection = ''; this.loading = true;
    const generation = this.generation;
    const complete = this.pendingTasks.add();
    try {
      if (file.size > MAX_ARCHIVE_BYTES) throw new Error('Choose a context file or archive no larger than 8 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const reader = await import('../../domain/context-reader');
      const recipe = reader.readContext(bytes);
      if (generation === this.generation) this.ready(recipe, { label: file.name });
    } catch (error) { if (generation === this.generation) { this.loading = false; this.error = contextLoadError(error); } }
    finally { input.value = ''; this.changeDetector.markForCheck(); complete(); }
  }
  async previewText() {
    this.cancelPreview(); this.selection = ''; this.loading = true;
    const generation = this.generation;
    const complete = this.pendingTasks.add();
    try {
      const reader = await import('../../domain/context-reader');
      const recipe = reader.parseContext(this.text);
      if (generation === this.generation) this.ready(recipe, { label: 'Pasted context' });
    } catch (error) { if (generation === this.generation) { this.loading = false; this.error = contextLoadError(error); } }
    finally { this.changeDetector.markForCheck(); complete(); }
  }
  private ready(recipe: ContextRecipe, source: ContextSource) { this.preview = { recipe, source }; this.loading = false; this.error = ''; }
  open() { if (this.preview && !this.loading) this.contextOpened.emit(this.preview); }
  close() { this.dialog.nativeElement.close(); this.library.deactivate(); this.cancelPreview(); this.closeDialog.emit(); }
  ngOnDestroy() { this.library.deactivate(); this.download?.unsubscribe(); this.tokenSubscription.unsubscribe(); this.generation++; }
}
