// Family tree page: Mr. Pamba Patelo at the top, then mothers, children, grandchildren, great-grandchildren.
import { getTree } from './api.js';
import { $, $$, esc, renderHeader } from './ui.js';
import { buildTree, walk, search, countByGeneration } from './treeModel.js';

renderHeader('tree');
const app = $('#app');
const STYLE = {
  ROOT: ['Father - (Family)', 'bg-slate-900 text-white border-slate-900'],
  PARENT: ['Mother', 'bg-green-50 text-green-900 border-green-400'],
  CHILD: ['Child', 'bg-emerald-50 text-emerald-900 border-emerald-400'],
  GRANDCHILD: ['Grandchild', 'bg-teal-50 text-teal-900 border-teal-400'],
  GREAT_GRANDCHILD: ['Great-grandchild', 'bg-sky-50 text-sky-900 border-sky-400'],
};
const DOT = { YES: ['bg-green-500', 'Attending'], MAYBE: ['bg-amber-400', 'Not sure yet'], NO: ['bg-red-400', 'Not attending'] };

let root, collapsed = new Set(), hits = new Set(), zoom = 1, isAdmin = false;

function nodeHtml(n) {
  const [label, cls] = STYLE[n.generation];
  const dot = n.status && DOT[n.status] ? `<i class="inline-block w-2 h-2 rounded-full ${DOT[n.status][0]} mr-1" title="${DOT[n.status][1]}"></i>` : '';
  const kids = n.children.length;
  const open = !collapsed.has(n.id);
  return `<li><div class="tnode ${cls} ${hits.has(n.id) ? 'hit' : ''}" data-node="${n.id}">
      <b>${dot}${esc(n.name)}</b><span class="tg">${label}${n.generation !== 'ROOT' && n.lineage_side ? ' · ' + n.lineage_side : ''}</span>
      ${n.friends > 0 ? `<span class="tg" style="color:#6d28d9;font-weight:700;opacity:1">🤝 +${n.friends} friend${n.friends > 1 ? 's' : ''}</span>` : ''}
      ${kids ? `<button class="ttoggle" data-toggle="${n.id}" title="${open ? 'Collapse' : 'Expand'}">${open ? '−' : '+ ' + n.total}</button>` : ''}</div>
    ${kids && open ? `<ul>${n.children.map(nodeHtml).join('')}</ul>` : ''}</li>`;
}

function draw() {
  $('#tree').innerHTML = `<ul>${nodeHtml(root)}</ul>`;
  $('#tree').style.zoom = zoom;
  $$('[data-toggle]').forEach((b) => (b.onclick = () => { collapsed.has(b.dataset.toggle) ? collapsed.delete(b.dataset.toggle) : collapsed.add(b.dataset.toggle); draw(); }));
}

function collapseAll() { walk(root, (n) => { if (n.id !== 'root' && n.children.length) collapsed.add(n.id); }); }

async function init() {
  let data;
  try { data = await getTree(); }
  catch (e) {
    app.innerHTML = e.status === 401
      ? `<div class="card max-w-md mx-auto text-center space-y-3 mt-10"><div class="text-4xl">🔒</div><h2 class="text-xl font-bold">Family tree is private</h2>
         <p class="text-sm text-slate-500">${esc(e.message)}</p><a href="admin.html" class="btn inline-block bg-slate-900 text-white">Admin login</a></div>`
      : `<p class="err">Could not load the tree: ${esc(e.message)}</p>`;
    return;
  }
  isAdmin = data.admin;
  root = buildTree(data.root, data.members);
  const c = countByGeneration(root);
  if (root.total > 60) walk(root, (n, d) => { if (d >= 2 && n.children.length) collapsed.add(n.id); });

  app.innerHTML = `<div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><h1 class="text-2xl font-extrabold">Family tree</h1>
      <p class="text-xs text-slate-500">${c.PARENT} mothers · ${c.CHILD} children · ${c.GRANDCHILD} grandchildren · ${c.GREAT_GRANDCHILD} great-grandchildren. Click − / + on a person to collapse or expand their branch.</p></div>
      <div class="flex flex-wrap gap-2 items-center">
        <input id="q" class="inp w-52" placeholder="Find a person…">
        <button id="exp" class="btn bg-white border border-slate-300">Expand all</button><button id="col" class="btn bg-white border border-slate-300">Collapse all</button>
        <button id="zo" class="btn bg-white border border-slate-300" title="Zoom out">A−</button><button id="zi" class="btn bg-white border border-slate-300" title="Zoom in">A+</button></div></div>
    <div class="flex flex-wrap gap-3 text-[11px] text-slate-600">${Object.entries(STYLE).map(([k, [l, cls]]) => `<span><i class="inline-block w-3 h-3 rounded border ${cls}"></i> ${l}</span>`).join('')}
      ${isAdmin ? '<span><b style="color:#6d28d9">🤝 +n</b> family friends coming</span>' : ''}
      ${isAdmin ? Object.values(DOT).map(([bg, l]) => `<span><i class="inline-block w-2 h-2 rounded-full ${bg}"></i> ${l}</span>`).join('') : ''}</div>
    <div class="tree-wrap"><div class="tree" id="tree"></div></div></div>`;

  $('#exp').onclick = () => { collapsed.clear(); draw(); };
  $('#col').onclick = () => { collapseAll(); draw(); };
  $('#zi').onclick = () => { zoom = Math.min(1.6, zoom + 0.15); draw(); };
  $('#zo').onclick = () => { zoom = Math.max(0.4, zoom - 0.15); draw(); };
  $('#q').oninput = (e) => {
    const r = search(root, e.target.value);
    hits = r.matches; r.ancestors.forEach((id) => collapsed.delete(id)); draw();
    document.querySelector('.tnode.hit')?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  };
  draw();
}
init();
