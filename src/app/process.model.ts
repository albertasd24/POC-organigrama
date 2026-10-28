import { buildOrgNodes, OrgNode } from './org-chart/org-chart.model';

export interface Persona {
  readonly id: string;
  readonly nombre: string;
  readonly correo?: string;
}

export interface Cargo {
  readonly id: string;
  readonly nombre: string;
}

export interface Participante {
  readonly persona: Persona;
  readonly cargo: Cargo;
}

export interface Proceso {
  readonly id: string;
  readonly parentId: string | null;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly participantes: readonly Participante[];
}

export type ProcessNodeData =
  | { readonly kind: 'process'; readonly proceso: Proceso }
  | { readonly kind: 'participant'; readonly procesoId: string; readonly participante: Participante };

export function buildProcessNodes(procesos: readonly Proceso[]): OrgNode<ProcessNodeData>[] {
  for (const proceso of procesos) {
    if (!proceso.titulo.trim() || !proceso.subtitulo.trim()) {
      throw new Error('Completa el titulo y el subtitulo del proceso.');
    }
    const asignaciones = new Map<string, Set<string>>();
    for (const participante of proceso.participantes) {
      validateParticipant(participante);
      const cargos = asignaciones.get(participante.persona.id) ?? new Set<string>();
      if (cargos.has(participante.cargo.id)) {
        throw new Error('La persona ya tiene ese cargo en el proceso.');
      }
      cargos.add(participante.cargo.id);
      asignaciones.set(participante.persona.id, cargos);
    }
  }
  const processNodes = buildOrgNodes(procesos, (proceso): OrgNode<ProcessNodeData> => ({
    id: proceso.id,
    parentId: proceso.parentId,
    name: proceso.titulo,
    role: proceso.subtitulo,
    data: { kind: 'process', proceso },
  }));
  const nodes = processNodes.flatMap((node, index): OrgNode<ProcessNodeData>[] => {
    const proceso = procesos[index];
    const processId = JSON.stringify(['process', proceso.id]);
    return [
      {
        ...node,
        id: processId,
        parentId: proceso.parentId === null ? null : JSON.stringify(['process', proceso.parentId]),
      },
      ...proceso.participantes.map((participante): OrgNode<ProcessNodeData> => ({
        id: JSON.stringify(['participant', proceso.id, participante.persona.id, participante.cargo.id]),
        parentId: processId,
        name: participante.persona.nombre,
        role: participante.cargo.nombre,
        data: { kind: 'participant', procesoId: proceso.id, participante },
      })),
    ];
  });
  return buildOrgNodes(nodes, (node) => node);
}

export function assignParticipant(
  procesos: readonly Proceso[],
  procesoId: string,
  participante: Participante,
): Proceso[] {
  if (!procesos.some((proceso) => proceso.id === procesoId)) {
    throw new Error('Selecciona un proceso existente.');
  }
  const updated = procesos.map((proceso) => proceso.id === procesoId
    ? { ...proceso, participantes: [...proceso.participantes, participante] }
    : proceso);
  buildProcessNodes(updated);
  return updated;
}

function validateParticipant(participante: Participante): void {
  if (!participante.persona.id.trim() || !participante.persona.nombre.trim()
    || !participante.cargo.id.trim() || !participante.cargo.nombre.trim()) {
    throw new Error('Selecciona una persona y un cargo validos.');
  }
}