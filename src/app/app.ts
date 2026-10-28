import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideNetwork, LucidePlus, LucideUsers, LucideX } from '@lucide/angular';
import { OrgCardField, OrgChartComponent } from './org-chart/org-chart';
import { OrgNode } from './org-chart/org-chart.model';
import {
  addArea, addCargo, assignParticipant, Area, Cargo, Persona, ProcessNodeData,
  ProcessOptionId, Proceso, ProcesoOpcion, buildProcessNodes, removeParticipant,
} from './process.model';

const makeCargo = (id: string, nombre: string, ...participantes: Persona[]): Cargo => ({ id, nombre, participantes });
const makeArea = (id: string, nombre: string, ...cargos: Cargo[]): Area => ({ id, nombre, cargos });
const makeOption = (id: ProcessOptionId, ...areas: Area[]): ProcesoOpcion => ({ id, areas });

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
  protected readonly opciones: readonly ProcessOptionId[] = ['X', 'Y'];
  protected readonly procesos = signal<readonly Proceso[]>([
    {
      id: 'gestion', titulo: 'Gestion empresarial', subtitulo: 'Direccion y estrategia',
      opciones: [
        makeOption('X',
          makeArea('digital', 'Digital', makeCargo('lider-digital', 'Lider de tecnologia', this.personas[0]), makeCargo('desarrollador', 'Desarrollador', this.personas[3])),
          makeArea('financiera', 'Financiera', makeCargo('analista-financiero', 'Analista financiero', this.personas[1])),
          makeArea('humana', 'Gestion Humana', makeCargo('generalista', 'Generalista', this.personas[2])),
        ),
        makeOption('Y',
          makeArea('digital-y', 'Digital', makeCargo('product-owner', 'Product owner', this.personas[4])),
          makeArea('financiera-y', 'Financiera', makeCargo('controller', 'Controller')),
          makeArea('humana-y', 'Gestion Humana', makeCargo('seleccion', 'Analista de seleccion')),
        ),
      ],
    },
    {
      id: 'servicio', titulo: 'Atencion al cliente', subtitulo: 'Soporte y experiencia',
      opciones: [
        makeOption('X', makeArea('soporte', 'Soporte', makeCargo('agente', 'Agente de servicio', this.personas[5]))),
        makeOption('Y', makeArea('experiencia', 'Experiencia', makeCargo('especialista', 'Especialista de experiencia'))),
      ],
    },
    {
      id: 'operaciones', titulo: 'Operaciones', subtitulo: 'Ejecucion y mejora continua',
      opciones: [
        makeOption('X', makeArea('logistica', 'Logistica', makeCargo('coordinacion', 'Coordinador'))),
        makeOption('Y', makeArea('calidad', 'Calidad', makeCargo('auditoria', 'Auditor'))),
      ],
    },
  ]);
  protected readonly selectedId = signal('gestion');
  protected readonly selectedOptionId = signal<ProcessOptionId>('X');
  protected readonly selectedNodeId = signal<string | null>(JSON.stringify(['process', 'gestion']));
  protected readonly selectedAreaId = signal('digital');
  protected readonly selectedProcess = computed(() => this.procesos().find((item) => item.id === this.selectedId()));
  protected readonly selectedOption = computed(() =>
    this.selectedProcess()?.opciones.find((item) => item.id === this.selectedOptionId()));
  protected readonly areas = computed(() => this.selectedOption()?.areas ?? []);
  protected readonly selectedArea = computed(() =>
    this.areas().find((area) => area.id === this.selectedAreaId()) ?? this.areas()[0] ?? null);
  protected readonly cargos = computed(() => this.selectedArea()?.cargos ?? []);
  protected readonly selectedNode = computed(() =>
    this.nodes().find((node) => node.id === this.selectedNodeId()) ?? null);
  protected readonly selectedCargo = computed(() => {
    const data = this.selectedNode()?.data;
    return data?.kind === 'cargo' ? data : null;
  });
  protected readonly nodes = computed(() => {
    const proceso = this.selectedProcess();
    return proceso ? buildProcessNodes(proceso, this.selectedOptionId()) : [];
  });
  protected readonly assignmentCount = computed(() => this.procesos().reduce((total, proceso) =>
    total + proceso.opciones.reduce((optionTotal, opcion) => optionTotal + opcion.areas.reduce((areaTotal, area) =>
      areaTotal + area.cargos.reduce((cargoTotal, cargo) => cargoTotal + cargo.participantes.length, 0), 0), 0), 0));
  protected readonly processError = signal<string | null>(null);
  protected readonly areaError = signal<string | null>(null);
  protected readonly cargoError = signal<string | null>(null);
  protected readonly assignmentError = signal<string | null>(null);
  protected readonly status = signal('');
  protected readonly processCardFields = (node: OrgNode<ProcessNodeData>): readonly OrgCardField[] => {
    const data = node.data;
    if (data?.kind === 'process') return [{ label: 'Tipo', value: 'Proceso' }];
    if (data?.kind === 'area') return [{ label: 'Tipo', value: 'Area' }];
    if (data?.kind === 'cargo') return [
      { label: 'Tipo', value: 'Cargo' },
      { label: 'Personas', value: data.cargo.participantes.length },
    ];
    return [];
  };

  protected selectProcess(procesoId: string): void {
    const proceso = this.procesos().find((item) => item.id === procesoId);
    if (!proceso) return;
    this.selectedId.set(procesoId);
    this.selectedOptionId.set('X');
    this.selectedNodeId.set(JSON.stringify(['process', procesoId]));
    this.selectedAreaId.set(proceso.opciones.find((item) => item.id === 'X')?.areas[0]?.id ?? '');
  }

  protected selectOption(optionId: ProcessOptionId): void {
    this.selectedOptionId.set(optionId);
    this.selectedNodeId.set(JSON.stringify(['process', this.selectedId()]));
    this.selectedAreaId.set(this.selectedProcess()?.opciones.find((item) => item.id === optionId)?.areas[0]?.id ?? '');
  }

  protected selectArea(event: Event): void {
    this.selectedAreaId.set((event.target as HTMLSelectElement).value);
  }

  protected selectNode(node: OrgNode<ProcessNodeData>): void {
    this.selectedNodeId.set(node.id);
    if (node.data?.kind === 'area') this.selectedAreaId.set(node.data.area.id);
    if (node.data?.kind === 'cargo') this.selectedAreaId.set(node.data.areaId);
  }

  protected addProcess(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const fields = new FormData(form);
    const titulo = this.field(fields, 'titulo');
    const subtitulo = this.field(fields, 'subtitulo');
    this.processError.set(null);
    if (!titulo || !subtitulo) {
      this.processError.set('Completa el titulo y el subtitulo del proceso.');
      return;
    }
    const proceso: Proceso = {
      id: crypto.randomUUID(), titulo, subtitulo,
      opciones: [makeOption('X'), makeOption('Y')],
    };
    this.procesos.update((items) => [...items, proceso]);
    this.selectProcess(proceso.id);
    this.status.set('Proceso creado. Agrega areas a sus opciones.');
    form.reset();
  }

  protected addArea(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const nombre = this.field(new FormData(form), 'nombre');
    this.areaError.set(null);
    if (!nombre || !this.selectedProcess()) {
      this.areaError.set('Escribe el nombre del area y selecciona un proceso.');
      return;
    }
    const area: Area = { id: crypto.randomUUID(), nombre, cargos: [] };
    try {
      this.procesos.update((items) => addArea(items, this.selectedId(), this.selectedOptionId(), area));
      this.selectedAreaId.set(area.id);
      this.selectedNodeId.set(JSON.stringify(['area', this.selectedId(), this.selectedOptionId(), area.id]));
      this.status.set('Area agregada.');
      form.reset();
    } catch (error: unknown) {
      this.areaError.set(error instanceof Error ? error.message : 'No se pudo agregar el area.');
    }
  }

  protected addCargo(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const nombre = this.field(new FormData(form), 'nombre');
    const area = this.selectedArea();
    this.cargoError.set(null);
    if (!nombre || !area) {
      this.cargoError.set('Escribe el nombre del cargo y selecciona un area.');
      return;
    }
    const cargo: Cargo = { id: crypto.randomUUID(), nombre, participantes: [] };
    try {
      this.procesos.update((items) => addCargo(items, this.selectedId(), this.selectedOptionId(), area.id, cargo));
      this.selectedNodeId.set(JSON.stringify(['cargo', this.selectedId(), this.selectedOptionId(), area.id, cargo.id]));
      this.status.set('Cargo agregado al area.');
      form.reset();
    } catch (error: unknown) {
      this.cargoError.set(error instanceof Error ? error.message : 'No se pudo agregar el cargo.');
    }
  }

  protected addParticipant(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const fields = new FormData(form);
    this.assignmentError.set(null);
    const persona = this.personas.find((item) => item.id === this.field(fields, 'personaId'));
    const areaId = this.field(fields, 'areaId');
    const cargoId = this.field(fields, 'cargoId');
    if (!persona || !areaId || !cargoId) {
      this.assignmentError.set('Selecciona un area, un cargo y una persona.');
      return;
    }
    try {
      this.procesos.update((items) => assignParticipant(
        items, this.selectedId(), this.selectedOptionId(), areaId, cargoId, persona,
      ));
      this.selectedNodeId.set(JSON.stringify(['cargo', this.selectedId(), this.selectedOptionId(), areaId, cargoId]));
      this.status.set('Persona asignada al cargo.');
      form.reset();
    } catch (error: unknown) {
      this.assignmentError.set(error instanceof Error ? error.message : 'No se pudo asignar la persona.');
    }
  }

  protected removeParticipant(areaId: string, cargoId: string, personaId: string): void {
    this.procesos.update((items) => removeParticipant(
      items, this.selectedId(), this.selectedOptionId(), areaId, cargoId, personaId,
    ));
    this.assignmentError.set(null);
    this.status.set('Asignacion retirada.');
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