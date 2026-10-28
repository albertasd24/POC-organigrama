import { OrgNode } from './org-chart/org-chart.model';

export type ProcessOptionId = 'X' | 'Y';

export interface Persona {
  readonly id: string;
  readonly nombre: string;
  readonly correo?: string;
}

export interface Cargo {
  readonly id: string;
  readonly nombre: string;
  readonly participantes: readonly Persona[];
}

export interface Area {
  readonly id: string;
  readonly nombre: string;
  readonly cargos: readonly Cargo[];
}

export interface ProcesoOpcion {
  readonly id: ProcessOptionId;
  readonly areas: readonly Area[];
}

export interface Proceso {
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly opciones: readonly ProcesoOpcion[];
}

export type ProcessNodeData =
  | { readonly kind: 'process'; readonly proceso: Proceso }
  | { readonly kind: 'area'; readonly procesoId: string; readonly area: Area }
  | { readonly kind: 'cargo'; readonly procesoId: string; readonly areaId: string; readonly cargo: Cargo };

export function buildProcessNodes(
  proceso: Proceso,
  opcionId: ProcessOptionId,
): OrgNode<ProcessNodeData>[] {
  validateProcess(proceso);
  const opcion = proceso.opciones.find((item) => item.id === opcionId);
  if (!opcion) throw new Error(`La opcion ${opcionId} no existe en el proceso.`);

  const processId = JSON.stringify(['process', proceso.id]);
  const nodes: OrgNode<ProcessNodeData>[] = [{
    id: processId,
    parentId: null,
    name: proceso.titulo,
    role: proceso.subtitulo,
    data: { kind: 'process', proceso },
  }];
  for (const area of opcion.areas) {
    const areaNodeId = JSON.stringify(['area', proceso.id, opcionId, area.id]);
    nodes.push({
      id: areaNodeId,
      parentId: processId,
      name: area.nombre,
      role: 'Area del proceso',
      data: { kind: 'area', procesoId: proceso.id, area },
    });
    for (const cargo of area.cargos) {
      nodes.push({
        id: JSON.stringify(['cargo', proceso.id, opcionId, area.id, cargo.id]),
        parentId: areaNodeId,
        name: cargo.nombre,
        role: cargo.participantes.length ? `${cargo.participantes.length} personas asignadas` : 'Sin asignar',
        data: { kind: 'cargo', procesoId: proceso.id, areaId: area.id, cargo },
      });
    }
  }
  return nodes;
}

export function assignParticipant(
  procesos: readonly Proceso[],
  procesoId: string,
  opcionId: ProcessOptionId,
  areaId: string,
  cargoId: string,
  persona: Persona,
): Proceso[] {
  validatePersona(persona);
  const proceso = procesos.find((item) => item.id === procesoId);
  if (!proceso) throw new Error('Selecciona un proceso existente.');
  const opcion = proceso.opciones.find((item) => item.id === opcionId);
  const area = opcion?.areas.find((item) => item.id === areaId);
  const cargo = area?.cargos.find((item) => item.id === cargoId);
  if (!opcion || !area || !cargo) throw new Error('Selecciona un area y un cargo existentes.');
  if (cargo.participantes.some((item) => item.id === persona.id)) {
    throw new Error('La persona ya esta asignada a ese cargo.');
  }

  return procesos.map((item) => item.id !== procesoId ? item : {
    ...item,
    opciones: item.opciones.map((option) => option.id !== opcionId ? option : {
      ...option,
      areas: option.areas.map((currentArea) => currentArea.id !== areaId ? currentArea : {
        ...currentArea,
        cargos: currentArea.cargos.map((currentCargo) => currentCargo.id !== cargoId ? currentCargo : {
          ...currentCargo,
          participantes: [...currentCargo.participantes, persona],
        }),
      }),
    }),
  });
}

export function removeParticipant(
  procesos: readonly Proceso[],
  procesoId: string,
  opcionId: ProcessOptionId,
  areaId: string,
  cargoId: string,
  personaId: string,
): Proceso[] {
  return procesos.map((proceso) => proceso.id !== procesoId ? proceso : {
    ...proceso,
    opciones: proceso.opciones.map((opcion) => opcion.id !== opcionId ? opcion : {
      ...opcion,
      areas: opcion.areas.map((area) => area.id !== areaId ? area : {
        ...area,
        cargos: area.cargos.map((cargo) => cargo.id !== cargoId ? cargo : {
          ...cargo,
          participantes: cargo.participantes.filter((persona) => persona.id !== personaId),
        }),
      }),
    }),
  });
}

function validateProcess(proceso: Proceso): void {
  if (!proceso.id.trim() || !proceso.titulo.trim() || !proceso.subtitulo.trim()) {
    throw new Error('Completa el identificador, titulo y subtitulo del proceso.');
  }
  if (proceso.opciones.length !== 2 || new Set(proceso.opciones.map((item) => item.id)).size !== 2
    || !proceso.opciones.some((item) => item.id === 'X') || !proceso.opciones.some((item) => item.id === 'Y')) {
    throw new Error('Cada proceso debe tener las opciones X e Y.');
  }
  for (const opcion of proceso.opciones) {
    const areaIds = new Set<string>();
    for (const area of opcion.areas) {
      if (!area.id.trim() || !area.nombre.trim() || areaIds.has(area.id)) {
        throw new Error('Cada area debe tener un identificador y nombre unicos.');
      }
      areaIds.add(area.id);
      const cargoIds = new Set<string>();
      for (const cargo of area.cargos) {
        if (!cargo.id.trim() || !cargo.nombre.trim() || cargoIds.has(cargo.id)) {
          throw new Error('Cada cargo debe tener un identificador y nombre unicos dentro de su area.');
        }
        cargoIds.add(cargo.id);
        const participantIds = new Set<string>();
        for (const persona of cargo.participantes) {
          validatePersona(persona);
          if (participantIds.has(persona.id)) throw new Error('La persona ya esta asignada a ese cargo.');
          participantIds.add(persona.id);
        }
      }
    }
  }
}

function validatePersona(persona: Persona): void {
  if (!persona.id.trim() || !persona.nombre.trim()) {
    throw new Error('Selecciona una persona valida.');
  }
}

export function addArea(
  procesos: readonly Proceso[],
  procesoId: string,
  opcionId: ProcessOptionId,
  area: Area,
): Proceso[] {
  const proceso = procesos.find((item) => item.id === procesoId);
  const opcion = proceso?.opciones.find((item) => item.id === opcionId);
  if (!proceso || !opcion) throw new Error('Selecciona un proceso y una opcion existentes.');
  if (!area.id.trim() || !area.nombre.trim() || opcion.areas.some((item) => item.id === area.id)) {
    throw new Error('El area debe tener un identificador y nombre unicos.');
  }
  return procesos.map((item) => item.id !== procesoId ? item : {
    ...item,
    opciones: item.opciones.map((option) => option.id !== opcionId ? option : {
      ...option,
      areas: [...option.areas, area],
    }),
  });
}

export function addCargo(
  procesos: readonly Proceso[],
  procesoId: string,
  opcionId: ProcessOptionId,
  areaId: string,
  cargo: Cargo,
): Proceso[] {
  const proceso = procesos.find((item) => item.id === procesoId);
  const opcion = proceso?.opciones.find((item) => item.id === opcionId);
  const area = opcion?.areas.find((item) => item.id === areaId);
  if (!proceso || !opcion || !area) throw new Error('Selecciona un area existente.');
  if (!cargo.id.trim() || !cargo.nombre.trim() || area.cargos.some((item) => item.id === cargo.id)) {
    throw new Error('El cargo debe tener un identificador y nombre unicos en el area.');
  }
  return procesos.map((item) => item.id !== procesoId ? item : {
    ...item,
    opciones: item.opciones.map((option) => option.id !== opcionId ? option : {
      ...option,
      areas: option.areas.map((currentArea) => currentArea.id !== areaId ? currentArea : {
        ...currentArea,
        cargos: [...currentArea.cargos, cargo],
      }),
    }),
  });
}