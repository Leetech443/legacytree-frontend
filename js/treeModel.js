// Pure data helpers for the family tree (no DOM) so they are easy to test.
export function buildTree(rootName, members) {
  const byId = new Map(members.map((m) => [String(m.id), { ...m, id: String(m.id), children: [] }]));
  const roots = [];
  for (const n of byId.values()) {
    const p = n.parent_id != null ? byId.get(String(n.parent_id)) : null;
    (p ? p.children : roots).push(n);
  }
  const root = { id: 'root', name: rootName, generation: 'ROOT', children: roots };
  const count = (n) => (n.total = n.children.reduce((a, c) => a + 1 + count(c), 0));
  count(root);
  return root;
}

export function walk(node, fn, depth = 0, parent = null) {
  fn(node, depth, parent);
  node.children.forEach((c) => walk(c, fn, depth + 1, node));
}

/** Ids of nodes matching q, plus every ancestor of a match (so they can be expanded). */
export function search(root, q) {
  const matches = new Set(), ancestors = new Set(), needle = q.trim().toLowerCase();
  if (!needle) return { matches, ancestors };
  const visit = (n, trail) => {
    if (n.id !== 'root' && n.name.toLowerCase().includes(needle)) { matches.add(n.id); trail.forEach((t) => ancestors.add(t)); }
    n.children.forEach((c) => visit(c, [...trail, n.id]));
  };
  visit(root, []);
  return { matches, ancestors };
}

export function countByGeneration(root) {
  const out = { PARENT: 0, CHILD: 0, GRANDCHILD: 0, GREAT_GRANDCHILD: 0 };
  walk(root, (n) => { if (out[n.generation] !== undefined) out[n.generation]++; });
  return out;
}
