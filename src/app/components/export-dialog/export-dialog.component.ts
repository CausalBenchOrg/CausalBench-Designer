import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Draft, counts, emptyDraft, validateDraft } from '../../domain/context';
import { serializePython, serializeYaml } from '../../domain/serialize';

@Component({
    selector: 'app-export-dialog', templateUrl: './export-dialog.component.html', styleUrls: ['./export-dialog.component.scss'],
    standalone: false
})
export class ExportDialogComponent implements OnChanges, AfterViewInit {
  @Input() showDialog = false;
  @Input() draft: Draft = emptyDraft();
  @Output() closeDialog = new EventEmitter<void>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  format: 'python' | 'yaml' = 'python';
  get issues() { return validateDraft(this.draft).filter(i => i.severity !== 'runtime'); }
  get summary() { return counts(this.draft); }
  get preview() {
    if (this.issues.length) return '';
    return this.format === 'python' ? serializePython(this.draft) : serializeYaml(this.draft);
  }
  ngOnChanges() { this.syncDialog(); }
  ngAfterViewInit() { this.syncDialog(); }
  private syncDialog() {
    const dialog = this.dialog?.nativeElement;
    if (!dialog) return;
    if (this.showDialog && !dialog.open) dialog.showModal();
    if (!this.showDialog && dialog.open) dialog.close();
  }
  close() { this.dialog.nativeElement.close(); this.closeDialog.emit(); }
  download() {
    if (this.issues.length) return;
    const content = this.preview;
    const url = URL.createObjectURL(new Blob([content], { type: this.format === 'yaml' ? 'application/yaml;charset=utf-8' : 'text/x-python;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = this.format === 'python' ? 'context_export.py' : 'context.yaml';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
