import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideNetwork, LucidePlus, LucideUsers, LucideX } from '@lucide/angular';
import { OrgCardField, OrgChartComponent } from './org-chart/org-chart';
import { OrgNode } from './org-chart/org-chart.model';
import { assignParticipant, buildProcessNodes, Cargo, Persona, Proceso, ProcessNodeData } from './process.model';

@Component({
  selector: 'app-process-demo',
  imports: [OrgChartComponent, LucideNetwork, LucidePlus, LucideUsers, LucideX],
  templateUrl: './org-chart-demo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessDemo {
  protected readonly personas: readonly Persona[] = [
    { id: 'ana', nombre: 'Ana Martinez', correo: 'ana@example.com' },
    { id: 'carlos', nombre: 'Carlos Ruiz', correo: 'carlos@example.com' },
    { id: 'laura', nombre: 'Laura Gomez', correo: 'laura@example.com' },
    { id: 'diego', nombre: 'Diego Torres' },
    { id: 'sofia', nombre: 'Sofia Lopez' },
    { id: 'mateo', nombre: 'Mateo Perez' },
  ];
  protected readonly cargos: readonly Cargo[] = [
    { id: 'lider', nombre: 'Lider de proceso' },
    { id: 'analista', nombre: 'Analista' },
    { id: 'desarrollador', nombre: 'Desarrollador' },
    { id: 'disenador', nombre: 'Disenador de producto' },
  ];
  protected readonly procesos = signal<readonly Proceso[]>([
    { id: 'gestion', parentId: null, titulo: 'Gestion empresarial', subtitulo: 'Direccion y estrategia',
      participantes: [{ persona: this.personas[0], cargo: this.cargos[0] }] },
    { id: 'tecnologia', parentId: 'gestion', titulo: 'Tecnologia', subtitulo: 'Productos y servicios digitales',
      participantes: [
        { persona: this.personas[1], cargo: this.cargos[0] },
        { persona: this.personas[3], cargo: this.cargos[2] },
        { persona: this.personas[4], cargo: this.cargos[3] },
      ] },
    { id: 'operaciones', parentId: 'gestion', titulo: 'Operaciones', subtitulo: 'Ejecucion y mejora continua',
      participantes: [
        { persona: this.personas[2], cargo: this.cargos[0] },
        { persona: this.personas[5], cargo: this.cargos[1] },
      ] },
  ]);
  protected readonly nodes = computed(() => buildProcessNodes(this.procesos()));
  protected readonly selectedId = signal('gestion');
  protected readonly selectedProcess = computed(() =>
    this.procesos().find((proceso) => proceso.id === this.selectedId()));
  protected readonly assignmentCount = computed(() =>
    this.procesos().reduce((total, proceso) => total + proceso.participantes.length, 0));
  protected readonly processError = signal<string | null>(null);
  protected readonly assignmentError = signal<string | null>(null);
  protected readonly processCardFields = (node: OrgNode<ProcessNodeData>): readonly OrgCardField[] => {
    const data = node.data;
    if (data?.kind === 'process') return [{ label: 'Tipo', value: 'Proceso' }];
    if (data?.kind === 'participant') return [{ label: 'Tipo', value: 'Participante' }];
    return [];
  };

  protected selectNode(node: OrgNode<ProcessNodeData>): void {
    const data = node.data;
    if (data) this.selectedId.set(data.kind === 'process' ? data.proceso.id : data.procesoId);
  }

  protected addProcess(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const fields = new FormData(form);
    this.processError.set(null);
    try {
      const proceso: Proceso = {
        id: crypto.randomUUID(), parentId: this.field(fields, 'parentId'),
        titulo: this.field(fields, 'titulo'), subtitulo: this.field(fields, 'subtitulo'), participantes: [],
      };
      const updated = [...this.procesos(), proceso];
      buildProcessNodes(updated);
      this.procesos.set(updated);
      this.selectedId.set(proceso.id);
      form.reset();
    } catch (error: unknown) {
      this.processError.set(error instanceof Error ? error.message : 'No se pudo agregar el proceso.');
    }
  }

  protected addParticipant(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const fields = new FormData(form);
    this.assignmentError.set(null);
    const persona = this.personas.find((item) => item.id === this.field(fields, 'personaId'));
    const cargo = this.cargos.find((item) => item.id === this.field(fields, 'cargoId'));
    const procesoId = this.field(fields, 'procesoId');
    if (!persona || !cargo) {
      this.assignmentError.set('Selecciona una persona y un cargo validos.');
      return;
    }
    try {
      this.procesos.update((procesos) => assignParticipant(procesos, procesoId, { persona, cargo }));
      this.selectedId.set(procesoId);
    } catch (error: unknown) {
      this.assignmentError.set(error instanceof Error ? error.message : 'No se pudo asignar el participante.');
    }
  }

  protected removeParticipant(procesoId: string, personaId: string, cargoId: string): void {
    this.procesos.update((procesos) => procesos.map((proceso) => proceso.id === procesoId
      ? { ...proceso, participantes: proceso.participantes.filter((participante) =>
        participante.persona.id !== personaId || participante.cargo.id !== cargoId) }
      : proceso));
    this.assignmentError.set(null);
  }

  private field(fields: FormData, name: string): string {
    const value = fields.get(name);
    return typeof value === 'string' ? value.trim() : '';
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
