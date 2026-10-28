export interface OrgNode<T = unknown> {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly role: string;
  readonly data?: T;
}

export function validateOrgNodes<T>(nodes: readonly OrgNode<T>[]): void {
  if (nodes.length === 0) return;

  const byId = new Map<string, OrgNode<T>>();
  for (const node of nodes) {
    if (!node.id.trim() || byId.has(node.id)) {
      throw new Error(`Identificador vacio o duplicado: ${node.id}`);
    }
    byId.set(node.id, node);
  }

  if (nodes.filter((node) => node.parentId === null).length !== 1) {
    throw new Error('El organigrama debe tener exactamente una raiz.');
  }

  const visited = new Set<string>();
  for (const node of nodes) {
    validateParentChain(node, byId, visited);
  }
}

function validateParentChain<T>(
  node: OrgNode<T>,
  byId: ReadonlyMap<string, OrgNode<T>>,
  visited: Set<string>,
): void {
  const path = new Set<string>();
  let current = node;
  while (!visited.has(current.id)) {
    if (path.has(current.id)) {
      throw new Error(`Ciclo detectado: ${current.id}`);
    }
    path.add(current.id);
    if (current.parentId === null) break;
    const parent = byId.get(current.parentId);
    if (!parent) {
      throw new Error(`Padre inexistente: ${current.parentId}`);
    }
    current = parent;
  }
  for (const id of path) visited.add(id);
}

export function buildOrgNodes<TSource, TData = unknown>(
  items: readonly TSource[],
  mapNode: (item: TSource) => OrgNode<TData>,
): OrgNode<TData>[] {
  const nodes = items.map(mapNode);
  validateOrgNodes(nodes);
  return nodes;
}

export function addOrgNode<T>(
  nodes: readonly OrgNode<T>[],
  node: OrgNode<T>,
): OrgNode<T>[] {
  const result = [...nodes, { ...node }];
  validateOrgNodes(result);
  return result;
}

export function updateOrgNode<T>(
  nodes: readonly OrgNode<T>[],
  id: string,
  changes: Partial<Omit<OrgNode<T>, 'id'>>,
): OrgNode<T>[] {
  if (!nodes.some((node) => node.id === id)) throw new Error(`Nodo inexistente: ${id}`);
  const result = nodes.map((node) => node.id === id ? { ...node, ...changes, id } : node);
  validateOrgNodes(result);
  return result;
}

export function removeOrgNode<T>(
  nodes: readonly OrgNode<T>[],
  id: string,
  options: { readonly cascade?: boolean } = {},
): OrgNode<T>[] {
  validateOrgNodes(nodes);
  if (!nodes.some((node) => node.id === id)) throw new Error(`Nodo inexistente: ${id}`);
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node.id);
    children.set(node.parentId, siblings);
  }
  if (!options.cascade && children.has(id)) {
    throw new Error('El nodo tiene hijos. Usa cascade para eliminar toda la rama.');
  }
  const removed = new Set<string>();
  const pending = [id];
  while (pending.length) {
    const currentId = pending.pop()!;
    removed.add(currentId);
    pending.push(...(children.get(currentId) ?? []));
  }
  const result = nodes.filter((node) => !removed.has(node.id));
  validateOrgNodes(result);
  return result;
}