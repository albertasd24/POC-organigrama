import { assignParticipant, buildProcessNodes, Proceso, removeParticipant } from './process.model';

describe('Process model', () => {
  const persona = { id: 'ana', nombre: 'Ana Martinez' };
  const proceso: Proceso = {
    id: 'gestion', titulo: 'Gestion empresarial', subtitulo: 'Direccion y estrategia',
    opciones: [
      { id: 'X', areas: [{ id: 'digital', nombre: 'Digital', cargos: [{ id: 'lider', nombre: 'Lider', participantes: [] }] }] },
      { id: 'Y', areas: [{ id: 'finanzas', nombre: 'Financiera', cargos: [{ id: 'analista', nombre: 'Analista', participantes: [] }] }] },
    ],
  };

  it('builds a process root with areas and cargo children, keeping options out of the tree', () => {
    const nodes = buildProcessNodes(proceso, 'X');
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toEqual({
      id: JSON.stringify(['process', 'gestion']), parentId: null,
      name: 'Gestion empresarial', role: 'Direccion y estrategia',
      data: { kind: 'process', proceso },
    });
    expect(nodes[1].data?.kind).toBe('area');
    expect(nodes[1].parentId).toBe(nodes[0].id);
    expect(nodes[2].data?.kind).toBe('cargo');
    expect(nodes[2].parentId).toBe(nodes[1].id);
    expect(nodes.some((node) => node.name === 'Y')).toBe(false);
    expect(buildProcessNodes(proceso, 'Y')[1].name).toBe('Financiera');
  });

  it('assigns a person to a cargo without adding a visual node and removes them immutably', () => {
    const assigned = assignParticipant([proceso], 'gestion', 'X', 'digital', 'lider', persona);
    const cargo = assigned[0].opciones[0].areas[0].cargos[0];
    expect(cargo.participantes).toEqual([persona]);
    expect(buildProcessNodes(assigned[0], 'X')).toHaveLength(3);
    expect(proceso.opciones[0].areas[0].cargos[0].participantes).toEqual([]);
    const removed = removeParticipant(assigned, 'gestion', 'X', 'digital', 'lider', 'ana');
    expect(removed[0].opciones[0].areas[0].cargos[0].participantes).toEqual([]);
  });

  it('rejects duplicate assignments, invalid hierarchy choices and incomplete option sets', () => {
    const assigned = assignParticipant([proceso], 'gestion', 'X', 'digital', 'lider', persona);
    expect(() => assignParticipant(assigned, 'gestion', 'X', 'digital', 'lider', persona))
      .toThrowError(/ya esta asignada/);
    expect(() => assignParticipant([proceso], 'gestion', 'Y', 'digital', 'lider', persona))
      .toThrowError(/existentes/);
    expect(() => buildProcessNodes({ ...proceso, opciones: [proceso.opciones[0]] }, 'X'))
      .toThrowError(/opciones X e Y/);
  });
});