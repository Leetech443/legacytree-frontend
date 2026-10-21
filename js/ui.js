// Shared UI helpers: DOM utils, field builders, header, and the RSVP (Yes / Maybe / No) block.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const today = () => new Date().toISOString().slice(0, 10);
export const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

export const spinner = () => '<span class="spinner" aria-hidden="true"></span>';
export function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.dataset.readyLabel = button.textContent;
    button.innerHTML = `${spinner()} ${label}`;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = button.dataset.readyLabel || label;
    delete button.dataset.readyLabel;
  }
}

export const pageSkeleton = (kind = 'form') => kind === 'tree'
  ? `<div class="space-y-4 animate-pulse" aria-label="Loading family tree" role="status">
      <div class="space-y-2"><div class="skeleton h-8 w-48"></div><div class="skeleton h-4 w-3/4"></div></div>
      <div class="skeleton h-12 w-full"></div><div class="skeleton h-72 w-full"></div>
    </div>`
  : `<div class="card space-y-5 animate-pulse" aria-label="Loading form" role="status">
      <div class="space-y-3"><div class="skeleton h-6 w-32"></div><div class="skeleton h-8 w-2/3"></div><div class="skeleton h-4 w-4/5"></div></div>
      <div class="grid sm:grid-cols-2 gap-4">${Array.from({ length: 8 }, () => '<div class="space-y-2"><div class="skeleton h-3 w-1/3"></div><div class="skeleton h-10 w-full"></div></div>').join('')}</div>
      <div class="skeleton h-28 w-full"></div><div class="skeleton h-11 w-full"></div>
    </div>`;

export function toast(msg, bad) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'fixed bottom-5 right-5 max-w-sm text-white text-sm p-4 rounded-xl shadow-2xl z-[60]'; document.body.append(t); }
  t.textContent = msg; t.style.background = bad ? '#991b1b' : '#0f172a'; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 4000);
}

const LINKS = [['children', 'Children'], ['grandchildren', 'Grandchildren'], ['great-grandchildren', 'Great-grandchildren'], ['tree', 'Family tree']];
export function renderHeader(active) {
  $('#header').innerHTML = `<header class="bg-slate-900 text-white sticky top-0 z-40"><div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
    <a href="index.html" class="font-extrabold tracking-tight whitespace-nowrap">🌳 LegacyTree</a>
    <nav class="flex items-center gap-1 text-xs font-semibold overflow-x-auto">
      ${LINKS.map(([k, l]) => `<a href="${k}.html" class="px-3 py-1.5 rounded-lg whitespace-nowrap ${active === k ? 'bg-green-600' : 'text-slate-300 hover:text-white'}">${l}</a>`).join('')}
      ${active === 'admin' ? '' : '<a href="admin.html" class="ml-2 px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10 whitespace-nowrap">Admin</a>'}
    </nav></div></header>`;
}

/* ---- field builders ---- */
export const F = (name, label, { type = 'text', req = true, hint = '', attrs = '', cls = '' } = {}) =>
  `<div class="${cls}"><label class="lbl">${label}${req ? ' *' : ` <span class="opt">(Optional${hint ? ' – ' + hint : ''})</span>`}</label>
   <input class="inp" name="${name}" type="${type}" ${req ? 'required' : ''} ${attrs} /></div>`;
export const S = (name, label, options, { req = true, ph = 'Select option', cls = '', attrs = '' } = {}) =>
  `<div class="${cls}"><label class="lbl">${label}${req ? ' *' : ''}</label><select class="inp" name="${name}" ${req ? 'required' : ''} ${attrs}>
   <option value="">${ph}</option>${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
export const YN = (name, label) => `<div class="p-4 rounded-xl bg-green-50 border border-green-100"><label class="lbl">${label} *</label>
  <div class="flex gap-6 text-sm font-medium"><label><input type="radio" name="${name}" value="true" required> Yes</label><label><input type="radio" name="${name}" value="false"> No</label></div></div>`;
export const SIDE = S('lineage_side', 'Lineage side', [['Maternal', "Mother's side"], ['Paternal', "Father's side"]]);

/* ---- RSVP block shared by every form ---- */
export function rsvpBlock(options) {
  const reasons = options.decline_reasons.map((t) => [t.code, t.label]);
  return `<div class="border-t border-slate-200 pt-5 space-y-4">
    ${S('status', 'Will you attend?', [['YES', 'Yes, I will attend'], ['MAYBE', "I'm not sure yet"], ['NO', "No, I can't make it"]], { ph: 'Select answer' })}
    <div data-panel="YES" class="hidden space-y-4">
      ${F('arrival_date', 'Expected Arrival Date', { type: 'date', attrs: `min="${today()}"` })}
    </div>
    <div data-panel="MAYBE" class="hidden p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
      <p class="text-sm text-amber-900">No problem. On which day should we ask you again?</p>
      ${F('followup_date', 'Remind me on', { type: 'date', attrs: `min="${tomorrow()}"` })}
    </div>
    <div data-panel="NO" class="hidden p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-3">
      <p class="text-sm text-slate-700">Sorry you can't make it. Could you tell us why?</p>
      ${S('reason_code', 'Main reason', reasons)}
      <div><label class="lbl">Tell us more <span class="opt" data-other-hint>(Optional)</span></label><textarea class="inp" rows="2" name="reason_text" maxlength="1000"></textarea></div>
    </div>
  </div>`;
}

const NEEDED = { YES: ['arrival_date'], MAYBE: ['followup_date'], NO: ['reason_code'] };
export function bindRsvp(form) {
  const sync = () => {
    const v = form.status.value;
    $$('[data-panel]', form).forEach((p) => {
      const on = p.dataset.panel === v;
      p.classList.toggle('hidden', !on);
      $$('input,select,textarea', p).forEach((el) => { el.disabled = !on; el.required = on && (NEEDED[v] || []).includes(el.name); });
    });
  };
  form.status.addEventListener('change', sync); sync();
  form.reason_code.addEventListener('change', () => {
    const other = form.reason_code.value === 'OTHER';
    form.reason_text.required = other; $('[data-other-hint]', form).textContent = other ? '(Required)' : '(Optional)';
  });
}

export function readRsvp(form) {
  const v = Object.fromEntries(new FormData(form));
  if (v.status === 'YES') return { status: 'YES', attendance: { arrival_date: v.arrival_date } };
  if (v.status === 'MAYBE') return { status: 'MAYBE', followup_date: v.followup_date };
  return { status: 'NO', decline: { reason_code: v.reason_code, reason_text: v.reason_text } };
}

/* ---- Occupation + marital status + spouse(s) (children & grandchildren) ---- */
export const PROFILE = () => `<div class="grid sm:grid-cols-2 gap-4">
    ${F('occupation', 'Occupation', { attrs: 'maxlength="120" placeholder="e.g. Teacher, Farmer, Student"' })}
    ${S('marital_status', 'Marital status', [['Single', 'Single'], ['Married', 'Married'], ['Divorced', 'Divorced'], ['Widowed', 'Widowed']])}
    <div id="spouseWrap" class="hidden sm:col-span-2 space-y-3">
      <div id="wifeCountWrap" class="hidden sm:max-w-xs"><label class="lbl">Number of wives *</label>
        <input class="inp" type="number" name="wife_count" min="1" max="10" value="1" disabled />
        <p class="text-[11px] text-slate-500 mt-1">Enter more than 1 if you have several wives, then add each name.</p></div>
      <div id="spouseList" class="grid sm:grid-cols-2 gap-3"></div></div></div>`;

/** Married men choose how many wives they have and name each; women enter one husband. */
export function bindProfile(form) {
  const render = () => {
    const married = form.marital_status.value === 'Married', g = form.gender.value, man = married && g === 'Male';
    $('#spouseWrap').classList.toggle('hidden', !married);
    $('#wifeCountWrap').classList.toggle('hidden', !man);
    form.wife_count.disabled = !man;
    const n = !married ? 0 : man ? Math.min(10, Math.max(1, parseInt(form.wife_count.value, 10) || 1)) : 1;
    const list = $('#spouseList'), old = $$('input[name=spouse_name]', list).map((i) => i.value);
    list.innerHTML = Array.from({ length: n }, (_, i) => {
      const label = g === 'Male' ? (n > 1 ? `Wife ${i + 1}'s name` : "Wife's name") : g === 'Female' ? "Husband's name" : "Spouse's name";
      return `<div><label class="lbl">${label} *</label><input class="inp" name="spouse_name" maxlength="200" required placeholder="Full name" value="${esc(old[i] || '')}" /></div>`;
    }).join('');
  };
  ['marital_status', 'gender'].forEach((n) => form[n].addEventListener('change', render));
  form.wife_count.addEventListener('input', render);
  render();
}

/* ---- Birth order in the family: 1st, 2nd, 3rd ... ---- */
export const ordinal = (n) => { const v = n % 100, s = ['th', 'st', 'nd', 'rd']; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const ORDER_OPTIONS = Array.from({ length: 30 }, (_, i) => [String(i + 1), i === 0 ? '1st (oldest)' : ordinal(i + 1)]);
export const ORDER = (label = 'Your order in the family') => `<div>${S('birth_order', label, ORDER_OPTIONS, { ph: 'Select order' })}
  <p class="text-[11px] text-slate-500 mt-1">Count among the children of the same mother. 1st = the oldest.</p></div>`;
