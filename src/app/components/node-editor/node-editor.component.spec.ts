import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NodeEditorComponent } from './node-editor.component';
import { BlueprintStore } from '../../services/blueprint-store.service';
import { supervisedFixture } from '../../../../tests/fixtures/contexts';

describe('Restored blueprint canvas interactions', () => {
  let fixture: ComponentFixture<NodeEditorComponent>, component: NodeEditorComponent, state: BlueprintStore;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormsModule, CommonModule], declarations: [NodeEditorComponent] }).compileComponents();
    fixture = TestBed.createComponent(NodeEditorComponent); component = fixture.componentInstance;
    component.draft = supervisedFixture(); fixture.detectChanges(); await fixture.whenStable();
    state = TestBed.inject(BlueprintStore);
  });
  it('drags a node, nudges it with the keyboard, and opens the shared configuration editor with Enter', () => {
    const node = state.nodes.find(n => n.kind === 'model')!, originalX = node.x, originalY = node.y;
    const element = fixture.nativeElement.querySelector('[data-kind="model"]') as SVGElement;
    const rect = component.canvasRef.nativeElement.getBoundingClientRect();
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: rect.left + node.x + 30, clientY: rect.top + node.y + 30 }));
    fixture.detectChanges();
    expect(component.canvasRef.nativeElement.getBoundingClientRect().top).toBe(rect.top);
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + originalX + 70, clientY: rect.top + node.y + 30 }));
    document.dispatchEvent(new PointerEvent('pointerup')); fixture.detectChanges();
    expect(node.x).toBe(originalX + 40);
    expect(node.y).toBe(originalY);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    expect(node.x).toBe(originalX + 60);
    const configure = jasmine.createSpy('configure'); component.configureNode.subscribe(configure);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(configure).toHaveBeenCalledWith(node);
  });
  it('connects ports in either click order, keeps sketches visual, and supports connection deletion', () => {
    const source = fixture.nativeElement.querySelector('[data-kind="dataset"] .blueprint-port') as SVGElement;
    const target = fixture.nativeElement.querySelector('[data-kind="model"] .blueprint-port') as SVGElement;
    // Start from an input, then select the source output.
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); fixture.detectChanges();
    expect(state.edges.length).toBe(1);
    expect(component.draft.datasets[0].mapping).toEqual({ features: 'observations', labels: 'observations' });
    fixture.nativeElement.querySelector('.sketch-edge').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(state.edges.length).toBe(0);
  });
  it('clamps zoom, resets the view, and cancels unfinished port connections', () => {
    component.zoom(100); expect(state.scale).toBe(2.5);
    component.zoom(0.001); expect(state.scale).toBe(0.25);
    component.resetView(); expect(state.scale).toBe(1); expect(state.offset).toEqual({ x: 0, y: 0 });
    component.connectPort(new Event('pointerdown'), state.nodes[0], 'output'); expect(component.connecting).not.toBeNull();
    component.escape(); expect(component.connecting).toBeNull();
  });
});
