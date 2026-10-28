import { DOCUMENT } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect,
  ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';
import { LucideExpand, LucideMaximize, LucideMinus, LucidePlus, LucideShrink } from '@lucide/angular';
import type { OrgChart as D3OrgChart } from 'd3-org-chart';
import { OrgNode, validateOrgNodes } from './org-chart.model';

export interface OrgCardField {
  readonly label: string;
  readonly value: string | number | boolean | null | undefined;
}

@Component({
  selector: 'app-org-chart',
  imports: [LucideExpand, LucideMaximize, LucideMinus, LucidePlus, LucideShrink],
  templateUrl: './org-chart.html',
  styleUrl: './org-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class OrgChartComponent<T = unknown> {
  readonly nodes = input.required<readonly OrgNode<T>[]>();
  readonly nodeSelected = output<OrgNode<T>>();
  readonly cardFields = input<(node: OrgNode<T>) => readonly OrgCardField[]>(() => []);
  readonly nodeWidth = input(240);
  readonly nodeHeight = input(112);
  readonly height = input(580);
  readonly selectedNodeId = input<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ready = signal(false);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private chart?: D3OrgChart<OrgNode<T>>;
  private nodeById = new Map<string, OrgNode<T>>();

  constructor() {
    afterNextRender(() => { void this.initialize(); });
    effect(() => {
      const nodes = this.nodes();
      const width = this.nodeWidth();
      const nodeHeight = this.nodeHeight();
      const height = this.height();
      const cardFields = this.cardFields();
      const selectedNodeId = this.selectedNodeId();
      if (!this.ready() || !this.chart) return;
      this.error.set(null);
      try {
        validateOrgNodes(nodes);
        this.nodeById = new Map(nodes.map((node) => [node.id, node]));
        this.chart.nodeWidth(() => width).nodeHeight(() => nodeHeight).svgHeight(height);
        this.chart.nodeContent((node) => this.nodeContent(node.data, cardFields(node.data), node.data.id === selectedNodeId));
        this.chart.data(nodes.map((node) => ({ ...node }))).render();
      } catch (error: unknown) {
        this.chart.clear();
        this.error.set(error instanceof Error ? error.message : 'No se pudo dibujar el organigrama.');
      }
    });
    this.destroyRef.onDestroy(() => {
      this.chart?.clear();
      this.host().nativeElement.replaceChildren();
    });
  }

  fit(): void { this.chart?.fit(); }
  zoomIn(): void { this.chart?.zoomIn(); }
  zoomOut(): void { this.chart?.zoomOut(); }
  expandAll(): void { this.chart?.expandAll().fit(); }
  collapseAll(): void { this.chart?.collapseAll().render().fit(); }

  private async initialize(): Promise<void> {
    try {
      const { OrgChart } = await import('d3-org-chart');
      if (this.destroyRef.destroyed) return;
      const containerId = `org-chart-${crypto.randomUUID()}`;
      this.host().nativeElement.id = containerId;
      this.chart = new OrgChart<OrgNode<T>>()
        .container(`#${containerId}`)
        .duration(0)
        .initialExpandLevel(3)
        .onNodeClick((node) => {
          const original = this.nodeById.get(node.data.id);
          if (original) this.nodeSelected.emit(original);
        });
      this.ready.set(true);
    } catch {
      if (!this.destroyRef.destroyed) this.error.set('No se pudo cargar el organigrama.');
    }
  }

  private nodeContent(node: OrgNode<T>, fields: readonly OrgCardField[], selected: boolean): string {
    const card = this.document.createElement('div');
    card.className = 'org-chart-card';
    Object.assign(card.style, {
      boxSizing: 'border-box', display: 'flex', height: '100%', alignItems: 'center', gap: '12px',
      borderRadius: '8px', border: `1px solid ${selected ? '#047857' : '#d4d4d8'}`,
      borderTop: '4px solid #059669', background: selected ? '#ecfdf5' : '#ffffff', padding: '16px',
      fontFamily: 'inherit', color: '#18181b', cursor: 'pointer',
    });
    const avatar = this.document.createElement('span');
    Object.assign(avatar.style, {
      display: 'flex', width: '40px', height: '40px', flexShrink: '0', alignItems: 'center',
      justifyContent: 'center', borderRadius: '50%', background: '#d1fae5', color: '#064e3b', fontWeight: '700', fontSize: '14px',
    });
    avatar.textContent = node.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
    const content = this.document.createElement('div');
    content.style.minWidth = '0';
    const name = this.document.createElement('p');
    Object.assign(name.style, { margin: '0', fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    name.textContent = node.name;
    const role = this.document.createElement('p');
    Object.assign(role.style, { margin: '4px 0 0', fontSize: '12px', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    role.textContent = node.role;
    card.title = `${node.name} - ${node.role}`;
    content.append(name, role);
    for (const field of fields) {
      const row = this.document.createElement('p');
      Object.assign(row.style, { margin: '4px 0 0', fontSize: '12px', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      row.textContent = `${field.label}: ${field.value ?? '-'}`;
      row.title = row.textContent;
      content.append(row);
    }
    card.append(avatar, content);
    return card.outerHTML;
  }
}