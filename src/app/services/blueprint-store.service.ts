import { Injectable } from '@angular/core';
import { Draft, Entry, EntryKind, uniqueId } from '../domain/context';

export type BlueprintKind = EntryKind | 'processor';
export interface BlueprintNode { id: string; kind: BlueprintKind; entryId?: string; x: number; y: number; label: string; }
export interface BlueprintEdge { id: string; sourceId: string; targetId: string; label?: string; role?: 'model-data' | 'metric-data' | 'prediction'; }

/** Canvas presentation/sketch state is deliberately separate from executable context data. */
@Injectable({ providedIn: 'root' })
export class BlueprintStore {
  nodes: BlueprintNode[] = [];
  edges: BlueprintEdge[] = [];
  recipeEdges: BlueprintEdge[] = [];
  selectedId: string | null = null;
  pendingNodeId: string | null = null;
  offset = { x: 0, y: 0 };
  scale = 1;
  get selected() { return this.nodes.find(n => n.id === this.selectedId) ?? null; }
  get unconfiguredCount() { return this.nodes.filter(n => n.kind !== 'processor' && !n.entryId).length; }
  reset(draft: Draft) {
    this.nodes = []; this.edges = []; this.selectedId = null; this.pendingNodeId = null;
    this.offset = { x: 0, y: 0 }; this.scale = 1; this.sync(draft);
  }
  sync(draft: Draft) {
    const entries = [...draft.datasets, ...draft.models, ...draft.metrics];
    const ids = new Set(entries.map(entry => entry.entryId));
    this.nodes = this.nodes.filter(node => !node.entryId || ids.has(node.entryId));
    for (const entry of entries) {
      if (!this.nodes.some(node => node.entryId === entry.entryId)) {
        const column = entry.kind === 'dataset' ? 0 : entry.kind === 'model' ? 1 : 2;
        const row = this.nodes.filter(node => node.kind === entry.kind).length;
        this.nodes.push({ id: uniqueId(), entryId: entry.entryId, kind: entry.kind, label: '', x: 45 + column * 290, y: 60 + row * 180 });
      }
    }
    const nodeIds = new Set(this.nodes.map(node => node.id));
    this.edges = this.edges.filter(edge => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));
    const nodeFor = (entry: Entry) => this.nodes.find(n => n.entryId === entry.entryId)!;
    const contract = draft.task?.contract;
    const mappings = (entry: Entry, inputs: Record<string, string>) => Object.keys(inputs).filter(input => entry.mapping[input]).map(input => `${entry.mapping[input]} → ${input}`).join(', ');
    const recipe: BlueprintEdge[] = [];
    const edge = (source: Entry, target: Entry, role: BlueprintEdge['role'], label: string) => recipe.push({
      id: `recipe:${source.entryId}:${target.entryId}:${role}`, sourceId: nodeFor(source).id, targetId: nodeFor(target).id, role, label
    });
    for (const dataset of draft.datasets) {
      for (const model of draft.models) edge(dataset, model, 'model-data', contract ? mappings(dataset, contract.modelData) || 'Dataset × model scenario' : 'Dataset × model · inputs unverified');
      if (contract && Object.keys(contract.metricData).length)
        for (const metric of draft.metrics) edge(dataset, metric, 'metric-data', mappings(dataset, contract.metricData) || 'Dataset metric inputs · mapping incomplete');
    }
    for (const model of draft.models) for (const metric of draft.metrics)
      edge(model, metric, 'prediction', contract ? Object.keys(contract.metricModel).join(', ') || 'Evaluate scenario' : 'Evaluate scenario · outputs unverified');
    this.recipeEdges = recipe;
    if (this.selectedId && !nodeIds.has(this.selectedId)) this.selectedId = null;
    if (this.pendingNodeId && !nodeIds.has(this.pendingNodeId)) this.pendingNodeId = null;
  }
  add(kind: BlueprintKind, x: number, y: number): BlueprintNode {
    const node: BlueprintNode = { id: uniqueId(), kind, x, y, label: '' };
    this.nodes.push(node); this.selectedId = node.id;
    return node;
  }
  attachPending(entry: Entry) {
    const node = this.nodes.find(n => n.id === this.pendingNodeId);
    if (node && !node.entryId && node.kind === entry.kind) { node.entryId = entry.entryId; this.pendingNodeId = null; }
  }
  remove(node: BlueprintNode) {
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.edges = this.edges.filter(edge => edge.sourceId !== node.id && edge.targetId !== node.id);
    if (this.selectedId === node.id) this.selectedId = null;
    if (this.pendingNodeId === node.id) this.pendingNodeId = null;
  }
  connect(source: BlueprintNode, target: BlueprintNode): boolean {
    const allowed = source.id !== target.id && source.kind !== 'metric' && target.kind !== 'dataset' &&
      (source.kind === 'processor' || target.kind === 'processor' || source.kind === 'dataset' || target.kind === 'metric');
    if (!allowed) return false;
    if (!this.edges.some(edge => edge.sourceId === source.id && edge.targetId === target.id))
      this.edges.push({ id: uniqueId(), sourceId: source.id, targetId: target.id });
    return true;
  }
}
