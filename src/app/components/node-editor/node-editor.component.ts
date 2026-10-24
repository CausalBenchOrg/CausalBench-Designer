import { Component, DoCheck, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { Draft, Entry, emptyDraft } from '../../domain/context';
import { BlueprintEdge, BlueprintKind, BlueprintNode, BlueprintStore } from '../../services/blueprint-store.service';

/** Restores the original SVG blueprint interactions using the current context editor and theme. */
@Component({ selector: 'app-node-editor', templateUrl: './node-editor.component.html', styleUrls: ['./node-editor.component.scss'] })
export class NodeEditorComponent implements DoCheck {
  @Input() draft: Draft = emptyDraft();
  @Output() configureNode = new EventEmitter<BlueprintNode>();
  @Output() removeEntry = new EventEmitter<Entry>();
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<SVGSVGElement>;
  readonly kinds: BlueprintKind[] = ['dataset', 'processor', 'model', 'metric'];
  readonly width = 220;
  readonly height = 132;
  dragging: BlueprintNode | null = null;
  dragOffset = { x: 0, y: 0 };
  panning = false;
  panStart = { x: 0, y: 0 };
  connecting: { nodeId: string; direction: 'input' | 'output' } | null = null;
  pointer = { x: 0, y: 0 };
  menu: { x: number; y: number; worldX: number; worldY: number } | null = null;
  message = '';
  constructor(public state: BlueprintStore) {}
  ngDoCheck() { this.state.sync(this.draft); }
  get transform() { return `translate(${this.state.offset.x},${this.state.offset.y}) scale(${this.state.scale})`; }
  get zoomPercent() { return Math.round(this.state.scale * 100); }
  entry(node: BlueprintNode): Entry | undefined {
    return [...this.draft.datasets, ...this.draft.models, ...this.draft.metrics].find(entry => entry.entryId === node.entryId);
  }
  title(node: BlueprintNode) { return this.entry(node)?.descriptor.name ?? (node.label || `${node.kind[0].toUpperCase()}${node.kind.slice(1)}`); }
  shortTitle(node: BlueprintNode) { const title = this.title(node); return title.length > 27 ? title.slice(0, 25) + '…' : title; }
  subtitle(node: BlueprintNode) {
    const entry = this.entry(node);
    if (!entry) return node.kind === 'processor' ? 'Design only · excluded from export' : 'Choose a registry component';
    return `#${entry.descriptor.id} · v${entry.descriptor.version}`;
  }
  configurationLabel(node: BlueprintNode) {
    const entry = this.entry(node);
    if (!entry) return 'Unconfigured';
    return node.kind === 'dataset' ? `${Object.keys(entry.mapping).length} input mappings`
      : `${entry.configurations.length} configuration${entry.configurations.length === 1 ? '' : 's'}`;
  }
  color(kind: BlueprintKind) { return `var(--${kind}-color)`; }
  trackNode(index: number, node: BlueprintNode) { return node.id; }
  trackEdge(index: number, edge: BlueprintEdge) { return edge.id; }
  addNode(kind: BlueprintKind) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = this.menu?.worldX ?? (rect.width / 2 - this.state.offset.x) / this.state.scale + (this.state.nodes.length % 5) * 24;
    const y = this.menu?.worldY ?? (rect.height / 2 - this.state.offset.y) / this.state.scale + (this.state.nodes.length % 5) * 24;
    this.state.add(kind, x - this.width / 2, y - this.height / 2); this.menu = null;
  }
  addSample() {
    const y = this.state.nodes.length ? Math.max(...this.state.nodes.map(node => node.y)) + this.height + 80 : 90;
    const nodes = this.kinds.map((kind, index) => this.state.add(kind, 45 + index * 280, y));
    for (let index = 1; index < nodes.length; index++) this.state.connect(nodes[index - 1], nodes[index]);
    this.fitView();
    this.message = 'Sample sketch added. Configure dataset, model, and metric nodes using real registry components.';
  }
  configure(node: BlueprintNode) {
    this.state.selectedId = node.id;
    if (node.kind === 'processor') { this.message = 'Processors are design notes. Their execution semantics are part of the blueprint revision plan.'; return; }
    this.configureNode.emit(node);
  }
  deleteNode(node: BlueprintNode) {
    const entry = this.entry(node);
    if (entry) this.removeEntry.emit(entry);
    this.state.remove(node); this.connecting = null;
  }
  deleteEdge(edge: BlueprintEdge) { this.state.edges = this.state.edges.filter(e => e.id !== edge.id); }
  point(event: { clientX: number; clientY: number }) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: (event.clientX - rect.left - this.state.offset.x) / this.state.scale,
      y: (event.clientY - rect.top - this.state.offset.y) / this.state.scale };
  }
  onNodePointerDown(event: PointerEvent, node: BlueprintNode) {
    event.stopPropagation();
    if (event.button === 1 || event.ctrlKey || event.metaKey) { this.onCanvasPointerDown(event); return; }
    if (event.button !== 0) return;
    this.state.selectedId = node.id; this.menu = null; this.dragging = node;
    const point = this.point(event); this.dragOffset = { x: point.x - node.x, y: point.y - node.y };
    event.preventDefault();
  }
  onCanvasPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.button !== 1) return;
    this.panning = true; this.panStart = { x: event.clientX, y: event.clientY };
    this.menu = null;
    if (!event.ctrlKey && !event.metaKey) this.state.selectedId = null;
    event.preventDefault();
  }
  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (this.panning) {
      this.state.offset.x += event.clientX - this.panStart.x; this.state.offset.y += event.clientY - this.panStart.y;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
    if (this.dragging) {
      const point = this.point(event); this.dragging.x = point.x - this.dragOffset.x; this.dragging.y = point.y - this.dragOffset.y;
    }
    if (this.connecting) this.pointer = this.point(event);
  }
  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  stopDrag() { this.dragging = null; this.panning = false; }
  zoom(factor: number, screen?: { x: number; y: number }) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const center = screen ?? { x: rect.width / 2, y: rect.height / 2 };
    const next = Math.max(0.25, Math.min(2.5, this.state.scale * factor));
    const ratio = next / this.state.scale;
    this.state.offset = { x: center.x - (center.x - this.state.offset.x) * ratio, y: center.y - (center.y - this.state.offset.y) * ratio };
    this.state.scale = next;
  }
  onWheel(event: WheelEvent) {
    event.preventDefault(); const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.zoom(event.deltaY > 0 ? 0.9 : 1.1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }
  resetView() { this.state.scale = 1; this.state.offset = { x: 0, y: 0 }; }
  fitView() {
    if (!this.state.nodes.length) { this.resetView(); return; }
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const left = Math.min(...this.state.nodes.map(n => n.x)), top = Math.min(...this.state.nodes.map(n => n.y));
    const width = Math.max(...this.state.nodes.map(n => n.x)) - left + this.width;
    const height = Math.max(...this.state.nodes.map(n => n.y)) - top + this.height;
    this.state.scale = Math.max(0.25, Math.min(1, (rect.width - 60) / width, (rect.height - 60) / height));
    this.state.offset = { x: (rect.width - width * this.state.scale) / 2 - left * this.state.scale,
      y: (rect.height - height * this.state.scale) / 2 - top * this.state.scale };
  }
  onContextMenu(event: MouseEvent) {
    event.preventDefault(); const rect = this.canvasRef.nativeElement.getBoundingClientRect(); const point = this.point(event);
    this.menu = { x: Math.max(0, Math.min(event.clientX - rect.left, rect.width - 150)), y: Math.max(0, Math.min(event.clientY - rect.top, rect.height - 190)), worldX: point.x, worldY: point.y };
  }
  @HostListener('document:keydown.escape')
  escape() { this.connecting = null; this.menu = null; this.stopDrag(); }
  nudge(event: KeyboardEvent, node: BlueprintNode) {
    const step = event.shiftKey ? 20 : 5;
    const directions: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (directions[event.key]) { event.preventDefault(); const [x, y] = directions[event.key]; node.x += x; node.y += y; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); this.deleteNode(node); }
  }
  port(node: BlueprintNode, direction: 'input' | 'output') { return { x: node.x + (direction === 'output' ? this.width : 0), y: node.y + 98 }; }
  connectPort(event: Event, node: BlueprintNode, direction: 'input' | 'output') {
    event.stopPropagation(); event.preventDefault();
    if (!this.connecting) { this.connecting = { nodeId: node.id, direction }; this.pointer = this.port(node, direction); return; }
    const other = this.state.nodes.find(n => n.id === this.connecting!.nodeId);
    if (other && direction !== this.connecting.direction) {
      const source = direction === 'input' ? other : node, target = direction === 'input' ? node : other;
      this.message = this.state.connect(source, target) ? 'Sketch connection added. Context mappings are edited separately.' : 'These node types cannot be connected in that direction.';
    }
    this.connecting = null;
  }
  curve(source: { x: number; y: number }, target: { x: number; y: number }) {
    const distance = Math.max(40, Math.min(150, Math.abs(target.x - source.x) / 2));
    return `M ${source.x} ${source.y} C ${source.x + distance} ${source.y}, ${target.x - distance} ${target.y}, ${target.x} ${target.y}`;
  }
  edgePath(edge: BlueprintEdge) {
    const source = this.state.nodes.find(node => node.id === edge.sourceId), target = this.state.nodes.find(node => node.id === edge.targetId);
    return source && target ? this.curve(this.port(source, 'output'), this.port(target, 'input')) : '';
  }
  recipePath(edge: BlueprintEdge) {
    const source = this.state.nodes.find(n => n.id === edge.sourceId)!, target = this.state.nodes.find(n => n.id === edge.targetId)!;
    if (edge.role !== 'metric-data') return this.edgePath(edge);
    const y = Math.min(source.y, target.y) - 35;
    return `M ${source.x + this.width / 2} ${source.y} C ${source.x + this.width / 2} ${y}, ${target.x + this.width / 2} ${y}, ${target.x + this.width / 2} ${target.y}`;
  }
  edgeLabel(edge: BlueprintEdge) {
    const source = this.state.nodes.find(n => n.id === edge.sourceId)!, target = this.state.nodes.find(n => n.id === edge.targetId)!;
    return edge.role === 'metric-data' ? { x: (source.x + target.x + this.width) / 2, y: Math.min(source.y, target.y) - 28 }
      : { x: (source.x + this.width + target.x) / 2, y: (source.y + target.y) / 2 + 87 };
  }
  showEdgeLabel(edge: BlueprintEdge) {
    return edge.role !== 'metric-data' || this.state.recipeEdges.find(e => e.role === edge.role && e.sourceId === edge.sourceId)?.id === edge.id;
  }
  get tempPath() {
    const node = this.state.nodes.find(n => n.id === this.connecting?.nodeId);
    if (!node || !this.connecting) return '';
    const port = this.port(node, this.connecting.direction);
    return this.connecting.direction === 'output' ? this.curve(port, this.pointer) : this.curve(this.pointer, port);
  }
}
