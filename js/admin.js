// Admin portal: Overview, Guests, Follow-ups, Family mothers (root parents).
import { adminApi, auth } from './api.js';
import { $, $$, esc, toast, renderHeader, F } from './ui.js';

renderHeader('admin');
const app = $('#app');
const GEN = { CHILD: 'Child', GRANDCHILD: 'Grandchild', GREAT_GRANDCHILD: 'Great-grandchild' };
const COLORS = { YES: 'bg-green-500', MAYBE: 'bg-amber-400', NO: 'bg-red-400' };
const TABS = [['overview', 'Overview'], ['guests', 'Members'], ['followups', 'Follow-ups'], ['parents', 'Family mothers']];
const d10 = (s) => (s ? String(s).slice(0, 10) : '—');
const badge = (s) => `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${{ YES: 'bg-green-100 text-green-700', NO: 'bg-red-100 text-red-700', MAYBE: 'bg-amber-100 text-amber-700' }[s] || 'bg-slate-100 text-slate-500'}">${s || 'NONE'}</span>`;
const stat = (label, value, sub = '', color = 'text-slate-900') => `<div class="card"><div class="text-xs text-slate-500">${label}</div><div class="text-3xl font-extrabold ${color}">${value}</div><div class="text-[11px] text-slate-400">${sub}</div></div>`;
const bars = (items, color = 'bg-green-500') => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return items.length ? items.map((i) => `<div class="mb-2"><div class="flex justify-between text-xs mb-1"><span>${esc(i.label)}</span><b>${i.value}</b></div>
    <div class="h-2 bg-slate-100 rounded"><div class="h-2 rounded ${color}" style="width:${(i.value / max) * 100}%"></div></div></div>`).join('') : '<p class="text-xs text-slate-400">No data yet.</p>';
};
const logout = () => { auth.clear(); login(); };
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { if (e.status === 401) return logout(); toast(e.message, true); } };

/* ---------- login ---------- */
function login() {
  app.innerHTML = `<form id="lf" class="max-w-sm mx-auto card p-8 space-y-4 mt-10"><h2 class="text-xl font-bold">Admin sign in</h2>
    ${F('username', 'Username', { attrs: 'autocomplete="username"' })}${F('password', 'Password', { type: 'password', attrs: 'autocomplete="current-password"' })}
    <p id="lerr" class="err"></p><button class="btn w-full bg-slate-900 text-white">Sign in</button></form>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    try { const f = e.target; auth.set((await adminApi.login(f.username.value, f.password.value)).token); shell(); }
    catch (err) { $('#lerr').textContent = err.message; }
  };
}

/* ---------- shell ---------- */
let tab = 'overview';
function shell() {
  app.innerHTML = `<div class="flex items-center justify-between mb-4"><h1 class="text-2xl font-extrabold">Admin portal</h1>
    <button id="out" class="text-xs text-slate-500 underline">Sign out</button></div>
    <nav class="flex gap-1 mb-5 border-b border-slate-200 overflow-x-auto">${TABS.map(([k, l]) => `<button data-tab="${k}" class="px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px">${l}</button>`).join('')}</nav>
    <div id="panel"></div><div id="modal"></div>`;
  $('#out').onclick = logout;
  $$('[data-tab]').forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  show(tab);
}
const show = guard(async (t) => {
  tab = t;
  $$('[data-tab]').forEach((b) => (b.className = `px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${b.dataset.tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500'}`));
  $('#panel').innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  await { overview, guests, followups, parents }[t]();
});

/* ---------- overview ---------- */
// Colour language: GREEN = family members, VIOLET = family friends they bring along.
const friendPill = (n) => `<span class="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold whitespace-nowrap">🤝 +${n} friend${n > 1 ? 's' : ''}</span>`;
async function overview() {
  const o = await adminApi.overview();
  const sum = (f, k = 'n') => o.by_generation.filter(f).reduce((a, x) => a + x[k], 0);
  const yes = (x) => x.status === 'YES';
  const family = sum(yes), friends = sum(yes, 'friends'), head = family + friends;
  const hosts = o.friends_hosts, fpct = head ? Math.round((friends / head) * 100) : 0;
  const rows = Object.entries(GEN).map(([g, label]) => {
    const n = (st) => o.by_generation.find((x) => x.generation === g && x.status === st)?.n || 0;
    const fr = o.by_generation.find((x) => x.generation === g && x.status === 'YES')?.friends || 0;
    const t = n('YES') + n('MAYBE') + n('NO') || 1;
    return `<div class="mb-3"><div class="flex justify-between text-xs mb-1"><b>${label}</b><span>${n('YES')} yes · ${n('MAYBE')} maybe · ${n('NO')} no${fr ? ` · <b class="text-violet-700">+${fr} friends</b>` : ''}</span></div>
      <div class="flex h-3 rounded overflow-hidden bg-slate-100">${['YES', 'MAYBE', 'NO'].map((st) => `<div class="${COLORS[st]}" style="width:${(n(st) / t) * 100}%"></div>`).join('')}</div></div>`;
  }).join('');
  const maxA = Math.max(1, ...o.arrivals.map((a) => a.family + a.friends));
  const arrivals = o.arrivals.map((a) => { const t = a.family + a.friends || 1; return `<div class="mb-2">
      <div class="flex justify-between text-xs mb-1"><span>${d10(a.date)}</span><span><b class="text-green-700">${a.family}</b> family · <b class="text-violet-700">${a.friends}</b> friends</span></div>
      <div class="h-2 bg-slate-100 rounded"><div class="flex h-2 rounded overflow-hidden" style="width:${((a.family + a.friends) / maxA) * 100}%"><div class="bg-green-500" style="width:${(a.family / t) * 100}%"></div><div class="bg-violet-500 flex-1"></div></div></div></div>`; }).join('') || '<p class="text-xs text-slate-400">No arrivals yet.</p>';
  $('#panel').innerHTML = `<div class="space-y-5">
    ${o.followups_due ? `<button data-go="followups" class="w-full text-left p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900"><b>${o.followups_due}</b> follow-up${o.followups_due > 1 ? 's are' : ' is'} due today or overdue. Review →</button>` : ''}
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      ${stat('Family attending', family, 'relatives who said yes', 'text-green-600')}
      ${stat('Family friends', friends, `brought by ${hosts.length} family member${hosts.length === 1 ? '' : 's'}`, 'text-violet-600')}
      ${stat('Total expected', head, 'family + friends')}
      ${stat('Not sure', sum((x) => x.status === 'MAYBE'), 'to follow up', 'text-amber-600')}
      ${stat('Declined', sum((x) => x.status === 'NO'), '', 'text-red-600')}</div>
    <div class="card"><div class="flex justify-between items-center mb-2 text-sm"><h3 class="font-bold">Family vs family friends</h3><span class="text-xs text-slate-500">${head ? `${fpct}% of expected people are friends` : 'No attendees yet'}</span></div>
      <div class="flex h-4 rounded-full overflow-hidden bg-slate-100"><div class="bg-green-500" style="width:${head ? 100 - fpct : 0}%"></div><div class="bg-violet-500" style="width:${fpct}%"></div></div>
      <div class="flex gap-4 text-[11px] text-slate-600 mt-2"><span><i class="inline-block w-2 h-2 rounded-sm bg-green-500"></i> Family members (${family})</span><span><i class="inline-block w-2 h-2 rounded-sm bg-violet-500"></i> Family friends (${friends})</span></div></div>
    <div class="card border-l-4 border-l-violet-500 p-0 overflow-x-auto"><div class="p-4 pb-2"><h3 class="font-bold text-sm">🤝 Family members bringing friends <span class="text-violet-600">(${hosts.length})</span></h3>
      <p class="text-xs text-slate-500">These are family friends, not relatives. Relatives are asked to RSVP on their own form, so they are counted under "Family attending".</p></div>
      <table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 text-left"><tr><th class="p-3">Family member</th><th>Generation</th><th>Parent</th><th>Arrives</th><th class="pr-3">Friends</th></tr></thead><tbody>
      ${hosts.map((h) => `<tr class="border-t"><td class="p-3 font-semibold">${esc(h.full_name)}</td><td>${GEN[h.generation]}</td><td>${esc(h.parent_name || '—')}</td><td>${d10(h.arrival_date)}</td><td class="pr-3">${friendPill(h.friends)}</td></tr>`).join('') || '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nobody is bringing friends yet.</td></tr>'}</tbody></table></div>
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card"><h3 class="font-bold text-sm mb-3">Responses by generation</h3>${rows}
        <div class="flex gap-3 text-[11px] text-slate-500 mt-2"><span><i class="inline-block w-2 h-2 bg-green-500 rounded-sm"></i> Yes</span><span><i class="inline-block w-2 h-2 bg-amber-400 rounded-sm"></i> Maybe</span><span><i class="inline-block w-2 h-2 bg-red-400 rounded-sm"></i> No</span></div></div>
      <div class="card"><h3 class="font-bold text-sm mb-3">Arrivals by date</h3>${arrivals}
        <div class="flex gap-3 text-[11px] text-slate-500 mt-2"><span><i class="inline-block w-2 h-2 bg-green-500 rounded-sm"></i> Family</span><span><i class="inline-block w-2 h-2 bg-violet-500 rounded-sm"></i> Friends</span></div></div>
      <div class="card"><h3 class="font-bold text-sm mb-3">Reasons for declining</h3>${bars(o.declines.map((t) => ({ label: t.label, value: t.n })), 'bg-red-400')}</div>
      <div class="card"><h3 class="font-bold text-sm mb-2">Recent activity</h3>${o.recent.map((r) => `<div class="flex justify-between items-center text-xs py-2 border-t first:border-0">
        <span><b>${esc(r.full_name)}</b> <span class="text-slate-400">· ${GEN[r.generation]}</span></span><span>${badge(r.status)} <span class="text-slate-400 ml-2">${new Date(r.updated_at).toLocaleString()}</span></span></div>`).join('') || '<p class="text-xs text-slate-400">No responses yet.</p>'}</div>
    </div></div>`;
  $$('[data-go]').forEach((b) => (b.onclick = () => show(b.dataset.go)));
}

/* ---------- guests ---------- */
const view = { q: '', generation: '', status: '', side: '', friends: '', key: 'created_at', dir: -1 };
const COLS = [['full_name', 'Name'], ['generation', 'Generation'], ['parent_name', 'Parent'], ['lineage_side', 'Side'], ['status', 'RSVP'], ['friends_count', 'Friends'], ['arrival_date', 'Arrival']];
const cmp = (x, y) => (x == null && y == null ? 0 : x == null ? -1 : y == null ? 1 : x > y ? 1 : x < y ? -1 : 0);
async function guests() {
  const all = await adminApi.members();
  const draw = () => {
    const q = view.q.toLowerCase();
    const rows = all.filter((r) => (!view.generation || r.generation === view.generation) && (!view.status || (r.status || 'NONE') === view.status) && (!view.side || r.lineage_side === view.side)
      && (!view.friends || (view.friends === 'with' ? r.friends_count > 0 : !(r.friends_count > 0)))
      && (!q || [r.full_name, r.parent_name, r.phone, r.email, r.guardian_name, r.occupation, r.spouse_name].some((v) => (v || '').toLowerCase().includes(q))))
      .sort((a, b) => cmp(a[view.key], b[view.key]) * view.dir);
    $('#gtable').innerHTML = `<thead class="bg-slate-50 text-slate-500 text-left"><tr>${COLS.map(([k, l]) => `<th class="p-3 sortable" data-sort="${k}">${l}${view.key === k ? (view.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr class="border-t hover:bg-slate-50 cursor-pointer" data-id="${r.id}"><td class="p-3 font-semibold">${esc(r.full_name)}<div class="font-normal text-slate-400">${esc(r.occupation || r.phone || r.guardian_phone || '')}</div></td>
      <td>${GEN[r.generation]}</td><td>${esc(r.parent_name || '—')}</td><td>${r.lineage_side || '—'}</td><td>${badge(r.status)}</td>
      <td>${r.friends_count > 0 ? friendPill(r.friends_count) : r.status === 'YES' ? '<span class="text-slate-300">none</span>' : ''}</td><td>${d10(r.arrival_date)}</td></tr>`).join('') || '<tr><td colspan="7" class="p-8 text-center text-slate-400">No matching records</td></tr>'}</tbody>`;
    $('#gcount').textContent = `${rows.length} of ${all.length}`;
    $$('[data-sort]').forEach((th) => (th.onclick = () => { view.dir = view.key === th.dataset.sort ? -view.dir : 1; view.key = th.dataset.sort; draw(); }));
    $$('tr[data-id]').forEach((tr) => (tr.onclick = () => detail(all.find((r) => r.id == tr.dataset.id), () => guests())));
  };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('');
  $('#panel').innerHTML = `<div class="flex flex-wrap gap-2 items-center mb-3">
    <input id="gq" class="inp sm:w-64" placeholder="Search name, parent, occupation, phone…" value="${esc(view.q)}">
    <select id="gg" class="inp w-auto"><option value="">All generations</option>${opt(Object.entries(GEN), view.generation)}</select>
    <select id="gs" class="inp w-auto"><option value="">All RSVPs</option>${opt([['YES', 'Yes'], ['MAYBE', 'Maybe'], ['NO', 'No']], view.status)}</select>
    <select id="gl" class="inp w-auto"><option value="">Both sides</option>${opt([['Maternal', 'Maternal'], ['Paternal', 'Paternal']], view.side)}</select>
    <select id="gf" class="inp w-auto"><option value="">Friends: any</option>${opt([['with', '🤝 Bringing friends'], ['without', 'Not bringing friends']], view.friends)}</select>
    <span id="gcount" class="text-xs text-slate-500"></span><button id="exp" class="btn ml-auto bg-slate-900 text-white">Export CSV</button></div>
    <div class="card p-0 overflow-x-auto"><table id="gtable" class="w-full text-xs"></table></div>`;
  $('#gq').oninput = (e) => { view.q = e.target.value; draw(); };
  $('#gg').onchange = (e) => { view.generation = e.target.value; draw(); };
  $('#gs').onchange = (e) => { view.status = e.target.value; draw(); };
  $('#gl').onchange = (e) => { view.side = e.target.value; draw(); };
  $('#gf').onchange = (e) => { view.friends = e.target.value; draw(); };
  $('#exp').onclick = guard(adminApi.exportCsv);
  draw();
}

function detail(r, refresh) {
  const kv = (k, v) => (v || v === 0 ? `<div><dt class="text-[11px] text-slate-400">${k}</dt><dd class="text-sm font-medium">${esc(v)}</dd></div>` : '');
  const spouseLabel = r.gender === 'Male' ? 'Wife' : 'Husband';
  const rsvp = r.status === 'YES' ? [kv('Arrival date', d10(r.arrival_date)),
      `<div><dt class="text-[11px] text-slate-400">Family friends coming with them</dt><dd class="text-sm font-medium">${r.friends_count > 0 ? friendPill(r.friends_count) : 'None'}</dd></div>`]
    : r.status === 'MAYBE' ? [kv('Ask again on', d10(r.followup_date))] : r.status === 'NO' ? [kv('Reason', r.decline_reason), kv('Details', r.decline_text)] : [];
  $('#modal').innerHTML = `<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="ov"><div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
    <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">${esc(r.full_name)}</h3><p class="text-xs text-slate-500">${GEN[r.generation]} · ${esc(r.gender)}</p></div>${badge(r.status)}</div>
    <dl class="grid grid-cols-2 gap-3">${kv('Parent', r.parent_name)}${kv('Lineage side', r.lineage_side)}${kv('Has children', r.has_children ? 'Yes' : 'No')}${kv('Age', r.age)}${kv('Occupation', r.occupation)}
      ${kv('Marital status', r.marital_status)}${r.marital_status === 'Married' ? kv(spouseLabel, r.spouse_name) : ''}${kv('Phone', r.phone)}${kv('Email', r.email)}${kv('Guardian', r.guardian_name)}${kv('Guardian phone', r.guardian_phone)}${kv('Registered', new Date(r.created_at).toLocaleString())}</dl>
    <div class="border-t pt-3"><h4 class="text-xs font-bold uppercase text-slate-400 mb-2">RSVP details</h4><dl class="grid grid-cols-2 gap-3">${rsvp.join('') || '<p class="text-xs text-slate-400">No details.</p>'}</dl></div>
    <div class="flex justify-between pt-2"><button id="del" class="text-xs text-red-600 font-semibold">Delete record</button><button id="close" class="btn bg-slate-900 text-white">Close</button></div></div></div>`;
  const close = () => ($('#modal').innerHTML = '');
  $('#close').onclick = close; $('#ov').onclick = (e) => e.target.id === 'ov' && close();
  $('#del').onclick = guard(async () => {
    if (!confirm(`Delete ${r.full_name} and their RSVP? This cannot be undone.`)) return;
    await adminApi.deleteMember(r.id); close(); toast('Record deleted'); refresh();
  });
}

/* ---------- follow-ups ---------- */
async function followups() {
  const list = await adminApi.followups();
  $('#panel').innerHTML = `<div class="card p-0 overflow-x-auto"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 text-left"><tr><th class="p-3">Name</th><th>Contact</th><th>Ask again on</th><th></th></tr></thead><tbody>
    ${list.map((f) => { const digits = (f.phone || '').replace(/\D/g, ''); return `<tr class="border-t"><td class="p-3 font-semibold">${esc(f.full_name)}</td>
      <td class="space-x-2">${f.phone ? `<a class="text-green-700 underline" href="tel:${esc(f.phone)}">Call</a>` : ''}${digits ? `<a class="text-green-700 underline" target="_blank" rel="noopener" href="https://wa.me/${digits}">WhatsApp</a>` : ''}${f.email ? `<a class="text-green-700 underline" href="mailto:${esc(f.email)}">Email</a>` : ''}${!f.phone && !f.email ? '—' : ''}</td>
      <td>${d10(f.remind_on)} ${f.due ? '<span class="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">DUE</span>' : ''}</td>
      <td class="pr-3 text-right"><button class="text-green-700 font-semibold" data-done="${f.id}">Mark done</button></td></tr>`; }).join('') || '<tr><td colspan="4" class="p-8 text-center text-slate-400">No pending follow-ups 🎉</td></tr>'}</tbody></table></div>`;
  $$('[data-done]').forEach((b) => (b.onclick = guard(async () => { await adminApi.completeFollowup(b.dataset.done); toast('Marked as done'); followups(); })));
}

/* ---------- family mothers (root parents) ---------- */
async function parents() {
  const list = await adminApi.parents();
  $('#panel').innerHTML = `<div class="grid lg:grid-cols-5 gap-4">
    <form id="pf" class="card lg:col-span-2 space-y-4 self-start" novalidate><div><h3 class="font-bold">Add a family mother</h3><p class="text-xs text-slate-500">Registered mothers appear in the Children form's "Select Mum" list.</p></div>
      ${F('full_name', 'Full Name')}
      ${F('phone', 'Phone', { type: 'tel', req: false })}${F('email', 'Email', { type: 'email', req: false })}
      <p id="perr" class="err"></p><button class="btn w-full bg-green-600 text-white">Add parent</button></form>
    <div class="card lg:col-span-3 p-0 overflow-x-auto"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 text-left"><tr><th class="p-3">Name</th><th>Contact</th><th>Children registered</th><th></th></tr></thead><tbody>
      ${list.map((p) => `<tr class="border-t"><td class="p-3 font-semibold">${esc(p.full_name)}</td><td>${esc(p.phone || p.email || '—')}</td><td>${p.children_count}</td>
      <td class="pr-3 text-right"><button class="text-red-600 font-semibold disabled:opacity-30" data-del="${p.id}" data-name="${esc(p.full_name)}" ${p.children_count ? 'disabled title="Has registered children"' : ''}>Delete</button></td></tr>`).join('') || '<tr><td colspan="4" class="p-8 text-center text-slate-400">No parents yet. Add the first one.</td></tr>'}</tbody></table></div></div>`;
  $('#pf').onsubmit = guard(async (e) => {
    e.preventDefault(); const f = e.target; $('#perr').textContent = '';
    if (f.full_name.value.trim().length < 2) return ($('#perr').textContent = 'Please enter the full name.');
    try { await adminApi.addParent({ full_name: f.full_name.value, phone: f.phone.value, email: f.email.value }); toast('Parent added'); parents(); }
    catch (err) { if (err.status === 401) throw err; $('#perr').textContent = err.details ? err.details.map((d) => `${d.field}: ${d.message}`).join(' · ') : err.message; }
  });
  $$('[data-del]').forEach((b) => (b.onclick = guard(async () => {
    if (!confirm(`Delete ${b.dataset.name}?`)) return; await adminApi.deleteMember(b.dataset.del); toast('Deleted'); parents();
  })));
}

auth.token ? shell() : login();
