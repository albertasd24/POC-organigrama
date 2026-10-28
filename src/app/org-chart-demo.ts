import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideRotateCcw, LucideSave, LucideTrash2 } from '@lucide/angular';
import { addOrgNode, OrgCardField, OrgChartComponent, OrgNode, removeOrgNode, updateOrgNode } from './org-chart';

interface DemoData {
  readonly department: string;
  readonly email: string;
}

function initialNodes(): OrgNode<DemoData>[] {
  return [
    { id: 'direccion', parentId: null, name: 'Ana Martinez', role: 'Directora', data: { department: 'Direccion', email: 'ana@example.com' } },
    { id: 'tecnologia', parentId: 'direccion', name: 'Carlos Ruiz', role: 'Lider de tecnologia', data: { department: 'Tecnologia', email: 'carlos@example.com' } },
    { id: 'operaciones', parentId: 'direccion', name: 'Laura Gomez', role: 'Lider de operaciones', data: { department: 'Operaciones', email: 'laura@example.com' } },
  ];
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
    parentId: new FormControl('', { nonNullable: true }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(160)] }),
  });
  readonly cardFields = (node: OrgNode<DemoData>): readonly OrgCardField[] => [
    { label: 'Area', value: node.data?.department },
  ];

  constructor() {
    this.selectNode(this.nodes()[0]);
  }

  selectNode(node: OrgNode<DemoData>): void {
    this.selectedId.set(node.id);
    this.creating.set(false);
    this.error.set(null);
    this.cascade.setValue(false);
    this.form.reset({ name: node.name, role: node.role, parentId: node.parentId ?? '', department: node.data?.department ?? '', email: node.data?.email ?? '' });
  }

  startCreate(): void {
    this.creating.set(true);
    this.error.set(null);
    this.form.reset({ parentId: this.selectedId() ?? this.nodes()[0]?.id ?? '' });
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
        data: { department: values.department.trim(), email: values.email.trim() },
      };
      this.nodes.update((nodes) => this.creating() ? addOrgNode(nodes, node) : updateOrgNode(nodes, node.id, node));
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