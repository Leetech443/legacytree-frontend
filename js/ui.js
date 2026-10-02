// Shared UI helpers: DOM utils, field builders, header, and the RSVP (Yes / Maybe / No) block.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const today = () => new Date().toISOString().slice(0, 10);
export const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

export function toast(msg, bad) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'fixed bottom-5 right-5 max-w-sm text-white text-sm p-4 rounded-xl shadow-2xl z-[60]'; document.body.append(t); }
  t.textContent = msg; t.style.background = bad ? '#991b1b' : '#0f172a'; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 4000);
}

const LINKS = [['children', 'Children'], ['grandchildren', 'Grandchildren'], ['great-grandchildren', 'Great-grandchildren']];
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
  const travel = options.travel_methods.map((t) => [t.code, t.label]);
  const reasons = options.decline_reasons.map((t) => [t.code, t.label]);
  return `<div class="border-t border-slate-200 pt-5 space-y-4">
    ${S('status', 'Will you attend?', [['YES', 'Yes, I will attend'], ['MAYBE', "I'm not sure yet"], ['NO', "No, I can't make it"]], { ph: 'Select answer' })}
    <div data-panel="YES" class="hidden space-y-4">
      ${F('companions_count', 'Number of people attending with you', { type: 'number', req: false, hint: 'enter 0 if coming alone', attrs: 'min="0" max="50" value="0"' })}
      <div class="grid sm:grid-cols-2 gap-4">
        ${F('arrival_date', 'Expected Arrival Date', { type: 'date', attrs: `min="${today()}"` })}
        ${F('arrival_time', 'Expected Arrival Time', { type: 'time' })}
        ${F('departure_date', 'Expected Departure Date', { type: 'date', attrs: `min="${today()}"` })}
        ${S('travel_method', 'How will you travel?', travel, { ph: 'Select Travel Method' })}
        ${S('needs_accommodation', 'Will you require accommodation?', [['true', 'Yes'], ['false', 'No']])}
      </div>
      <div><label class="lbl">Additional Information or Requests <span class="opt">(Optional)</span></label><textarea class="inp" rows="3" name="additional_info" maxlength="2000"></textarea></div>
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

const NEEDED = { YES: ['arrival_date', 'arrival_time', 'departure_date', 'travel_method', 'needs_accommodation'], MAYBE: ['followup_date'], NO: ['reason_code'] };
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
  const v = Object.fromEntries(new FormData(form)), bool = (x) => x === 'true';
  if (v.status === 'YES') return { status: 'YES', attendance: {
    companions_count: v.companions_count || 0, arrival_date: v.arrival_date, arrival_time: v.arrival_time, departure_date: v.departure_date,
    travel_method: v.travel_method, needs_accommodation: bool(v.needs_accommodation), additional_info: v.additional_info } };
  if (v.status === 'MAYBE') return { status: 'MAYBE', followup_date: v.followup_date };
  return { status: 'NO', decline: { reason_code: v.reason_code, reason_text: v.reason_text } };
}
