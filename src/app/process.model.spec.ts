import { assignParticipant, buildProcessNodes, Participante, Proceso } from './process.model';

describe('Process model', () => {
  const participante: Participante = {
    persona: { id: 'ana', nombre: 'Ana Martinez' },
    cargo: { id: 'lider', nombre: 'Lider' },
  };
  const procesos: readonly Proceso[] = [
    { id: 'root', parentId: null, titulo: 'Gestion', subtitulo: 'Estrategia', participantes: [] },
    { id: 'child', parentId: 'root', titulo: 'Compras', subtitulo: 'Abastecimiento', participantes: [] },
  ];

  it('maps titles, hierarchy and original process data', () => {
    const nodes = buildProcessNodes(procesos);
    expect(nodes[1]).toEqual({
      id: JSON.stringify(['process', 'child']), parentId: nodes[0].id,
      name: 'Compras', role: 'Abastecimiento', data: { kind: 'process', proceso: procesos[1] },
    });
  });

  it('renders each assignment as a separate child with stable unique IDs', () => {
    const first = assignParticipant(procesos, 'root', participante);
    const second = assignParticipant(first, 'child', participante);
    const assigned = assignParticipant(second, 'child', {
      ...participante, cargo: { id: 'analista', nombre: 'Analista' },
    });
    const nodes = buildProcessNodes(assigned);
    const people = nodes.filter((node) => node.data?.kind === 'participant');
    expect(nodes).toHaveLength(5);
    expect(new Set(nodes.map((node) => node.id)).size).toBe(5);
    expect(people.map((node) => node.name)).toEqual(['Ana Martinez', 'Ana Martinez', 'Ana Martinez']);
    expect(people.map((node) => node.role)).toEqual(['Lider', 'Lider', 'Analista']);
    for (const person of people) {
      const parent = nodes.find((node) => node.id === person.parentId);
      expect(parent?.data?.kind).toBe('process');
      if (person.data?.kind === 'participant' && parent?.data?.kind === 'process') {
        expect(parent.data.proceso.id).toBe(person.data.procesoId);
      }
    }
    expect(buildProcessNodes(assigned).map((node) => node.id)).toEqual(nodes.map((node) => node.id));
  });

  it('assigns without mutating the source and allows participation in different processes', () => {
    const first = assignParticipant(procesos, 'root', participante);
    const second = assignParticipant(first, 'child', participante);
    expect(procesos[0].participantes).toEqual([]);
    expect(first[1]).toBe(procesos[1]);
    expect(second.map((proceso) => proceso.participantes.length)).toEqual([1, 1]);
  });

  it('rejects duplicate assignments but allows a different role for the same person', () => {
    const assigned = assignParticipant(procesos, 'root', participante);
    expect(() => assignParticipant(assigned, 'root', participante)).toThrowError(/ya tiene ese cargo/);
    expect(assignParticipant(assigned, 'root', {
      ...participante, cargo: { id: 'analista', nombre: 'Analista' },
    })[0].participantes).toHaveLength(2);
  });

  it('rejects missing processes, invalid participants, blank titles and invalid hierarchy', () => {
    expect(() => assignParticipant(procesos, 'missing', participante)).toThrowError(/existente/);
    expect(() => assignParticipant(procesos, 'root', {
      ...participante, persona: { id: '', nombre: ' ' },
    })).toThrowError(/validos/);
    expect(() => buildProcessNodes([{ ...procesos[0], titulo: ' ' }])).toThrowError(/titulo/);
    expect(() => buildProcessNodes([{ ...procesos[0], subtitulo: ' ' }])).toThrowError(/subtitulo/);
    expect(() => buildProcessNodes([{ ...procesos[1], parentId: 'missing' }, procesos[0]]))
      .toThrowError(/Padre inexistente/);
  });
});