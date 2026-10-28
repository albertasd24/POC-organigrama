import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideRotateCcw, LucideSave, LucideTrash2 } from '@lucide/angular';
import { addOrgNode, OrgCardField, OrgChartComponent, OrgNode, removeOrgNode, updateOrgNode } from './org-chart';

type DemoNodeKind = 'process' | 'area' | 'cargo';

interface DemoData {
  readonly kind: DemoNodeKind;
  readonly email: string;
}

function initialNodes(): OrgNode<DemoData>[] {
  return [
    { id: 'proceso', parentId: null, name: 'Gestion empresarial', role: 'Direccion y estrategia', data: { kind: 'process', email: '' } },
    { id: 'area-digital', parentId: 'proceso', name: 'Digital', role: 'Area del proceso', data: { kind: 'area', email: '' } },
    { id: 'area-financiera', parentId: 'proceso', name: 'Financiera', role: 'Area del proceso', data: { kind: 'area', email: '' } },
    { id: 'area-humana', parentId: 'proceso', name: 'Gestion Humana', role: 'Area del proceso', data: { kind: 'area', email: '' } },
    { id: 'cargo-desarrollo', parentId: 'area-digital', name: 'Desarrollador', role: 'Cargo del area', data: { kind: 'cargo', email: 'carlos@example.com' } },
    { id: 'cargo-lider', parentId: 'area-digital', name: 'Lider de tecnologia', role: 'Cargo del area', data: { kind: 'cargo', email: 'ana@example.com' } },
    { id: 'cargo-analista', parentId: 'area-financiera', name: 'Analista financiero', role: 'Cargo del area', data: { kind: 'cargo', email: 'laura@example.com' } },
  ];
}

function validateDemoHierarchy(nodes: readonly OrgNode<DemoData>[]): void {
  if (!nodes.length) return;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const valid = node.data?.kind === 'process'
      ? node.parentId === null
      : node.data?.kind === 'area'
        ? parent?.data?.kind === 'process'
        : node.data?.kind === 'cargo' && parent?.data?.kind === 'area';
    if (!valid) throw new Error('La jerarquia permitida es proceso > area > cargo.');
  }
  if (nodes.filter((node) => node.data?.kind === 'process').length !== 1) {
    throw new Error('El organigrama debe tener exactamente un nodo de proceso raiz.');
  }
}

@Component({
  selector: 'app-org-chart-demo',
  imports: [OrgChartComponent, ReactiveFormsModule, RouterLink, LucidePlus, LucideRotateCcw, LucideSave, LucideTrash2],
  templateUrl: './org-chart-playground.html',
  styleUrl: './org-chart-playground.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartDemo {
  readonly nodes = signal<readonly OrgNode<DemoData>[]>(initialNodes());
  readonly selectedId = signal<string | null>('direccion');
  readonly selected = computed(() => this.nodes().find((node) => node.id === this.selectedId()));
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal('');
  readonly cascade = new FormControl(false, { nonNullable: true });
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    role: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    kind: new FormControl<DemoNodeKind>('area', { nonNullable: true }),
    parentId: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(160)] }),
  });
  readonly nodeKinds: readonly { readonly value: DemoNodeKind; readonly label: string }[] = [
    { value: 'process', label: 'Proceso' },
    { value: 'area', label: 'Area' },
    { value: 'cargo', label: 'Cargo' },
  ];
  readonly cardFields = (node: OrgNode<DemoData>): readonly OrgCardField[] => [
    { label: 'Tipo', value: this.kindLabel(node.data?.kind) },
  ];

  constructor() {
    this.selectNode(this.nodes()[0]);
  }

  selectNode(node: OrgNode<DemoData>): void {
    this.selectedId.set(node.id);
    this.creating.set(false);
    this.error.set(null);
    this.cascade.setValue(false);
    this.form.reset({ name: node.name, role: node.role, kind: node.data?.kind ?? 'cargo', parentId: node.parentId ?? '', email: node.data?.email ?? '' });
  }

  startCreate(): void {
    this.creating.set(true);
    this.error.set(null);
    const selected = this.selected();
    const kind: DemoNodeKind = !this.nodes().length ? 'process' : selected?.data?.kind === 'process' ? 'area' : 'cargo';
    const parentId = kind === 'cargo' && selected?.data?.kind === 'cargo' ? selected.parentId ?? '' : selected?.id ?? '';
    this.form.reset({ name: '', role: '', kind, parentId, email: '' });
  }

  parentNodes(): readonly OrgNode<DemoData>[] {
    const kind = this.form.controls.kind.value;
    return this.nodes().filter((node) => this.canBeParent(kind, node) && (!this.creating() || node.id !== this.selectedId()));
  }

  typeChanged(): void {
    this.form.controls.parentId.setValue(this.parentNodes()[0]?.id ?? '');
  }

  kindLabel(kind: DemoNodeKind | undefined): string {
    return this.nodeKinds.find((item) => item.value === kind)?.label ?? '-';
  }

  parentName(node: OrgNode<DemoData>): string {
    return this.nodes().find((item) => item.id === node.parentId)?.name ?? '-';
  }

  private canBeParent(kind: DemoNodeKind, node: OrgNode<DemoData>): boolean {
    if (kind === 'area') return node.data?.kind === 'process';
    if (kind === 'cargo') return node.data?.kind === 'area';
    return false;
  }

  save(): void {
    const values = this.form.getRawValue();
    if (this.form.invalid || !values.name.trim() || !values.role.trim()) {
      this.form.markAllAsTouched();
      this.error.set('Completa nombre y cargo, y usa un correo valido.');
      return;
    }
    try {
      const node: OrgNode<DemoData> = {
        id: this.creating() ? crypto.randomUUID() : this.selectedId()!,
        parentId: values.parentId || null,
        name: values.name.trim(), role: values.role.trim(),
        data: { kind: values.kind, email: values.email.trim() },
      };
      this.nodes.update((nodes) => {
        const updated = this.creating() ? addOrgNode(nodes, node) : updateOrgNode(nodes, node.id, node);
        validateDemoHierarchy(updated);
        return updated;
      });
      this.status.set(this.creating() ? 'Nodo creado.' : 'Nodo actualizado.');
      this.selectNode(node);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el nodo.');
    }
  }

  remove(): void {
    const selected = this.selected();
    if (!selected) return;
    try {
      this.nodes.update((nodes) => removeOrgNode(nodes, selected.id, { cascade: this.cascade.value }));
      this.status.set('Nodo eliminado.');
      const next = this.nodes().find((node) => node.id === selected.parentId) ?? this.nodes()[0];
      if (next) this.selectNode(next);
      else {
        this.selectedId.set(null);
        this.startCreate();
      }
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar el nodo.');
    }
  }

  reset(): void {
    this.nodes.set(initialNodes());
    this.selectNode(this.nodes()[0]);
    this.status.set('Datos restablecidos.');
  }
}