import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Draft, Entry, compatibility, emptyDraft } from '../../domain/context';

@Component({
    selector: 'app-context-view', templateUrl: './context-view.component.html', styleUrls: ['./context-view.component.scss'],
    standalone: false
})
export class ContextViewComponent {
  @Input() draft: Draft = emptyDraft();
  @Input() canvasMode = false;
  @Output() editEntry = new EventEmitter<Entry>();
  get groups() { return [{ label: 'Datasets', entries: this.draft.datasets, className: 'dataset', empty: 'Map file aliases to task inputs.' },
    { label: 'Models', entries: this.draft.models, className: 'model', empty: 'Choose models and enumerate configurations.' },
    { label: 'Metrics', entries: this.draft.metrics, className: 'metric', empty: 'Choose metrics to evaluate every scenario.' }]; }
  match(entry: Entry) { return compatibility(entry.descriptor, this.draft.task); }
  mapping(entry: Entry) { return Object.entries(entry.mapping).map(([input, alias]) => ({ input, alias })); }
  get outputs() { return Object.entries(this.draft.task?.contract?.metricModel ?? {}).map(([name, type]) => ({ name, type })); }
  trackEntry(index: number, entry: Entry) { return entry.entryId; }
  trackGroup(index: number, group: { className: string }) { return group.className; }
  trackMapping(index: number, pair: { input: string }) { return pair.input; }
  trackOutput(index: number, output: { name: string }) { return output.name; }
}
