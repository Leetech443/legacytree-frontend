// Family tree page: Mr. Pamba Patelo at the top, then mothers, children, grandchildren, great-grandchildren.
import { getTree } from './api.js';
import { $, $$, esc, renderHeader, ordinal } from './ui.js';
import { buildTree, walk, search, countByGeneration } from './treeModel.js';

renderHeader('tree');
const app = $('#app');
const STYLE = {
  ROOT: ['Father', 'bg-slate-900 text-white border-slate-900'],
  WIFE: ['Wife', 'wife bg-white text-slate-700 border-slate-300'],
  PARENT: ['Mother', 'bg-green-50 text-green-900 border-green-400'],
  CHILD: ['Child', 'bg-emerald-50 text-emerald-900 border-emerald-400'],
  GRANDCHILD: ['Grandchild', 'bg-teal-50 text-teal-900 border-teal-400'],
  GREAT_GRANDCHILD: ['Great-grandchild', 'bg-sky-50 text-sky-900 border-sky-400'],
};
const pl = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const DOT = { YES: ['bg-green-500', 'Attending'], MAYBE: ['bg-amber-400', 'Not sure yet'], NO: ['bg-red-400', 'Not attending'] };

let root, collapsed = new Set(), hits = new Set(), zoom = 1, autoFit = true, naturalW = 0, isAdmin = false;

function nodeHtml(n) {
  const [label, cls] = STYLE[n.generation];
  const isWife = n.generation === 'WIFE';
  const dot = n.status && DOT[n.status] ? `<i class="inline-block w-2 h-2 rounded-full ${DOT[n.status][0]} mr-1" title="${DOT[n.status][1]}"></i>` : '';
  const kids = n.children.length;
  const open = !collapsed.has(n.id);
  const toggle = kids ? `<button class="ttoggle" data-toggle="${n.id}" title="${open ? 'Collapse' : 'Expand'}">${open ? '−' : '+ ' + n.total}</button>` : '';
  const hit = hits.has(n.id) ? 'hit' : '';
  const branch = kids && open ? `<ul>${n.children.map(nodeHtml).join('')}</ul>` : '';

  // A wife who has her own branch (her husband has several wives) uses EXACTLY the same markup/styling
  // as the spouse strip shown inside a card when a man has one wife.
  if (isWife) {
    const sub = n.order ? `Wife ${n.order}` : `Children of ${esc((n.husband || '').split(' ')[0])}`;
    return `<li><div class="tnode ${cls} ${hit}" data-node="${n.id}"><div class="tsp"><div><span class="th">♥</span> <b>${esc(n.name)}</b></div><span class="tg">${sub}</span>${toggle}</div></div>${branch}</li>`;
  }
  // ONE spouse: shown INSIDE the same bubble (Male -> Wife, Female -> Husband)
  const only = n.spouses?.length === 1 ? n.spouses[0] : null;
  const spouse = only ? `<div class="tsp"><div><span class="th">♥</span> <b>${esc(only.name)}</b></div><span class="tg">${n.gender === 'Male' ? 'Wife' : n.gender === 'Female' ? 'Husband' : 'Spouse'}</span>${toggle}</div>` : '';
  const sub = `${label}${n.generation !== 'ROOT' && n.lineage_side ? ' · ' + n.lineage_side : ''}${n.birth_order ? ' · ' + ordinal(n.birth_order) : ''}`;
  return `<li><div class="tnode ${cls} ${hit}" data-node="${n.id}">
      <div class="tp"><b>${dot}${esc(n.name)}</b><span class="tg">${sub}</span>${only ? '' : toggle}</div>${spouse}</div>${branch}</li>`;
}

/** Sizes the scroll area from the REAL positions of the cards, so nothing can be clipped on either side. */
function layout() {
  const t = $('#tree'), box = $('#treeBox');
  box.style.cssText = 'position:relative;margin:0 auto';
  t.style.cssText = 'position:absolute;left:0;top:0;width:max-content;min-width:0;transform:none;transform-origin:0 0';
  const base = t.getBoundingClientRect();
  let minL = 0, maxR = t.offsetWidth, maxB = t.offsetHeight;
  t.querySelectorAll('.tnode').forEach((n) => {
    const r = n.getBoundingClientRect();
    minL = Math.min(minL, r.left - base.left); maxR = Math.max(maxR, r.right - base.left); maxB = Math.max(maxB, r.bottom - base.top);
  });
  const shift = Math.ceil(-minL) + 12;          // pushes anything that would sit left of the edge back into view
  naturalW = maxR + shift + 12;
  box.style.width = Math.ceil(naturalW * zoom) + 'px';
  box.style.height = Math.ceil((maxB + 16) * zoom) + 'px';
  t.style.transform = `scale(${zoom}) translateX(${shift}px)`;
}

/** Shrinks a wide tree so the whole thing fits the screen (never below 50%, never above 100%). */
function fit() {
  const avail = $('.tree-wrap').clientWidth - 32;
  zoom = Math.max(0.5, Math.min(1, avail / naturalW));
  layout();
}

function draw() {
  $('#tree').innerHTML = `<ul>${nodeHtml(root)}</ul>`;
  $$('[data-toggle]').forEach((b) => (b.onclick = () => { collapsed.has(b.dataset.toggle) ? collapsed.delete(b.dataset.toggle) : collapsed.add(b.dataset.toggle); draw(); }));
  layout();
  if (autoFit) fit();
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
      <p class="text-xs text-slate-500">${pl(c.PARENT, 'mother')} · ${pl(c.CHILD, 'child', 'children')} · ${pl(c.GRANDCHILD, 'grandchild', 'grandchildren')} · ${pl(c.GREAT_GRANDCHILD, 'great-grandchild', 'great-grandchildren')}. Brothers and sisters appear oldest first (the order shown on each card). A spouse appears inside the same card as the person they are married to. A man with several wives shows each wife as her own branch, with her children underneath. Click − / + on a person to collapse or expand their branch.</p></div>
      <div class="flex flex-wrap gap-2 items-center">
        <input id="q" class="inp w-52" placeholder="Find a person…">
        <button id="exp" class="btn bg-white border border-slate-300">Expand all</button><button id="col" class="btn bg-white border border-slate-300">Collapse all</button>
        <button id="fit" class="btn bg-white border border-slate-300" title="Fit the whole tree to the screen">Fit</button><button id="zo" class="btn bg-white border border-slate-300" title="Zoom out">A−</button><button id="zi" class="btn bg-white border border-slate-300" title="Zoom in">A+</button></div></div>
    <div class="flex flex-wrap gap-3 text-[11px] text-slate-600"><span><b class="text-rose-600">♥</b> Spouse (shown inside the card)</span>${Object.entries(STYLE).map(([k, [l, cls]]) => `<span><i class="inline-block w-3 h-3 rounded border ${cls}"></i> ${l}</span>`).join('')}
      ${isAdmin ? Object.values(DOT).map(([bg, l]) => `<span><i class="inline-block w-2 h-2 rounded-full ${bg}"></i> ${l}</span>`).join('') : ''}</div>
    <div class="tree-wrap"><div id="treeBox"><div class="tree" id="tree"></div></div></div></div>`;

  $('#exp').onclick = () => { collapsed.clear(); draw(); };
  $('#col').onclick = () => { collapseAll(); draw(); };
  $('#zi').onclick = () => { autoFit = false; zoom = Math.min(1.6, zoom + 0.15); layout(); };
  $('#zo').onclick = () => { autoFit = false; zoom = Math.max(0.3, zoom - 0.15); layout(); };
  $('#fit').onclick = () => { autoFit = true; fit(); $('.tree-wrap').scrollLeft = 0; };
  window.addEventListener('resize', () => { if (autoFit) fit(); });
  $('#q').oninput = (e) => {
    const r = search(root, e.target.value);
    hits = r.matches; r.ancestors.forEach((id) => collapsed.delete(id)); draw();
    document.querySelector('.tnode.hit')?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  };
  draw();
}
init();
