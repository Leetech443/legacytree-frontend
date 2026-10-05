// Pure data helpers for the family tree (no DOM) so they are easy to test.
export function buildTree(rootName, members) {
  const byId = new Map(members.map((m) => [String(m.id), { ...m, id: String(m.id), spouses: m.spouses || [], children: [] }]));
  const roots = [];
  for (const n of byId.values()) {
    const p = n.parent_id != null ? byId.get(String(n.parent_id)) : null;
    (p ? p.children : roots).push(n);
  }
  const root = { id: 'root', name: rootName, generation: 'ROOT', spouses: [], children: roots };
  groupByWives(root);
  // totals count real people only (a "wife" branch is a grouping, not a family member)
  const count = (n) => (n.total = n.children.reduce((a, c) => a + (c.generation === 'WIFE' ? 0 : 1) + count(c), 0));
  count(root);
  return root;
}

/** A man with MORE than one wife: each wife becomes her own branch, with her children underneath.
 *  (One wife = unchanged: she is shown inside his card and the children hang from him.) */
function groupByWives(n) {
  n.children.forEach(groupByWives);
  if (n.id === 'root' || n.spouses.length < 2) return;
  const branches = n.spouses.map((s, i) => ({ id: `w${s.id}`, sid: String(s.id), name: s.name, generation: 'WIFE', gender: 'Female', husband: n.name, order: i + 1, spouses: [], children: [] }));
  const loose = [];
  for (const c of n.children) {
    const b = branches.find((x) => x.sid === String(c.parent_spouse_id));
    (b ? b.children : loose).push(c);
  }
  if (loose.length) branches.push({ id: `wu${n.id}`, name: 'Mother not specified', generation: 'WIFE', husband: n.name, order: null, spouses: [], children: loose });
  n.children = branches;
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
    if (n.id !== 'root' && [n.name, ...(n.spouses || []).map((x) => x.name)].some((v) => (v || '').toLowerCase().includes(needle))) { matches.add(n.id); trail.forEach((t) => ancestors.add(t)); }
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
