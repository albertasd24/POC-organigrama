import { addOrgNode, buildOrgNodes, OrgNode, removeOrgNode, updateOrgNode, validateOrgNodes } from './org-chart.model';

describe('Org chart model', () => {
  const root: OrgNode = { id: '1', parentId: null, name: 'Ana', role: 'Directora' };
  const child: OrgNode = { id: '2', parentId: '1', name: 'Luis', role: 'Ingeniero' };

  it('maps API records to typed nodes, independently of their order', () => {
    const result = buildOrgNodes(
      [{ key: '2', manager: '1' }, { key: '1', manager: null }],
      (record) => ({ id: record.key, parentId: record.manager, name: 'Persona', role: 'Cargo', data: record }),
    );
    expect(result[0].data?.manager).toBe('1');
    expect(result).toHaveLength(2);
  });

  it('adds a node without mutating the source', () => {
    const source = Object.freeze([root]);
    expect(addOrgNode(source, child)).toEqual([root, child]);
    expect(source).toEqual([root]);
  });

  it('accepts empty data', () => {
    expect(() => validateOrgNodes([])).not.toThrow();
  });

  it('updates a node without mutating its source and keeps its ID', () => {
    const source = Object.freeze([Object.freeze(root), Object.freeze(child)]);
    const updated = updateOrgNode(source, '2', { name: 'Laura', data: { active: true } });
    expect(updated[1]).toEqual({ ...child, name: 'Laura', data: { active: true } });
    expect(source[1].name).toBe('Luis');
    expect(() => updateOrgNode(source, 'missing', {})).toThrow(/inexistente/);
    expect(() => updateOrgNode(source, '1', { parentId: '2' })).toThrow();
    expect(() => updateOrgNode(source, '2', { parentId: 'missing' })).toThrow(/Padre/);
  });

  it('removes leaves but requires an explicit cascade for branches', () => {
    const source = Object.freeze([root, child, { ...child, id: '3', parentId: '2' }]);
    expect(() => removeOrgNode(source, '2')).toThrow(/hijos/);
    expect(removeOrgNode(source, '2', { cascade: true })).toEqual([root]);
    expect(removeOrgNode(source, '3')).toEqual([root, child]);
    expect(removeOrgNode(source, '1', { cascade: true })).toEqual([]);
    expect(() => removeOrgNode(source, 'missing')).toThrow(/inexistente/);
    expect(source).toHaveLength(3);
  });

  it('rejects duplicate or empty IDs', () => {
    expect(() => addOrgNode([root], root)).toThrow(/duplicado/);
    expect(() => validateOrgNodes([{ ...root, id: ' ' }])).toThrow(/vacio/);
  });

  it('rejects missing parents and multiple roots', () => {
    expect(() => validateOrgNodes([root, { ...child, parentId: 'missing' }])).toThrow(/Padre/);
    expect(() => validateOrgNodes([root, { ...child, parentId: null }])).toThrow(/raiz/);
  });

  it('rejects disconnected cycles and self references', () => {
    expect(() => validateOrgNodes([
      root, { ...child, parentId: '3' }, { ...child, id: '3', parentId: '2' },
    ])).toThrow(/Ciclo/);
    expect(() => validateOrgNodes([root, { ...child, parentId: '2' }])).toThrow(/Ciclo/);
  });
});