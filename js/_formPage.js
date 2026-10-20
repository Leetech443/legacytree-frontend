// Generic page shell used by each form file: renders, loads parents, validates, saves.
import { getOptions, getParents, registerMember } from './api.js';
import { $, esc, renderHeader, rsvpBlock, bindRsvp, readRsvp, bindProfile, toast } from './ui.js';

const THANKS = {
  YES: 'Your attendance details are saved. We look forward to seeing you.',
  MAYBE: 'Thanks! We will ask you again on the day you chose.',
  NO: "We're sorry you can't make it, and thank you for letting us know.",
};

async function loadParents(cfg, form) {
  const sel = form.parent_id, gender = cfg.parentGender?.(form);
  const list = await getParents(cfg.generation, gender || '');
  cfg._parents = list;
  const role = (p) => (cfg.showRole ? ` (${p.gender === 'Male' ? 'Father' : 'Mother'})` : '');
  sel.innerHTML = `<option value="">${list.length ? 'Select parent' : cfg.emptyParents}</option>` +
    list.map((p) => `<option value="${p.id}">${esc(p.full_name)}${role(p)}</option>`).join('');
  syncMother(cfg, form);
}

/** If the chosen parent is a man with MORE than one wife, ask which wife is the person's mother. */
function syncMother(cfg, form) {
  const wrap = $('#motherWrap', form); if (!wrap) return;
  const p = (cfg._parents || []).find((x) => String(x.id) === form.parent_id.value);
  const wives = p?.wives?.length > 1 ? p.wives : [];
  const sel = form.parent_spouse_id;
  sel.innerHTML = '<option value="">Select your mother</option>' + wives.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
  wrap.classList.toggle('hidden', !wives.length);
  sel.disabled = !wives.length; sel.required = !!wives.length;
}

function buildPayload(cfg, form) {
  const v = Object.fromEntries(new FormData(form));
  return {
    member: { generation: cfg.generation, full_name: v.full_name, gender: v.gender, parent_id: v.parent_id,
      lineage_side: v.lineage_side || undefined, has_children: v.has_children === 'true', email: v.email || '', phone: v.phone,
      age: v.age || undefined, occupation: v.occupation, marital_status: v.marital_status || undefined,
      spouses: v.marital_status === 'Married' ? [...form.querySelectorAll('input[name=spouse_name]')].map((i) => i.value.trim()).filter(Boolean) : undefined,
      parent_spouse_id: v.parent_spouse_id || undefined, guardian_name: v.guardian_name, guardian_phone: v.guardian_phone },
    rsvp: readRsvp(form),
    consent: form.consent.checked,
  };
}

export async function mountForm(cfg) {
  renderHeader(cfg.key);
  const app = $('#app');
  let options;
  try { options = await getOptions(); } catch (e) { app.innerHTML = `<p class="err">Could not reach the server: ${esc(e.message)}</p>`; return; }

  app.innerHTML = `<div class="card sm:p-8 shadow-sm space-y-5">
    <div><span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">${cfg.badge}</span>
      <h2 class="text-2xl font-bold mt-2">${cfg.title}</h2><p class="text-xs text-slate-500">${cfg.sub}</p></div>
    <form id="f" class="space-y-5" novalidate>${cfg.fields()}${rsvpBlock(options)}
      <label class="flex gap-2 text-xs text-slate-600"><input type="checkbox" name="consent" required class="mt-0.5"> I confirm the details are correct and agree they may be stored to organise this event.</label>
      <p id="formerr" class="err"></p>
      <button class="btn w-full bg-green-600 hover:bg-green-700 text-white">Submit RSVP</button>
    </form></div>`;

  const form = $('#f');
  if (cfg.motherPick) {
    form.parent_id.parentElement.insertAdjacentHTML('afterend', `<div id="motherWrap" class="hidden">
      <label class="lbl">Which wife is your mother? *</label>
      <select class="inp" name="parent_spouse_id" disabled><option value="">Select your mother</option></select>
      <p class="text-[11px] text-slate-500 mt-1">This parent has more than one wife. Please choose your mother.</p></div>`);
    form.parent_id.addEventListener('change', () => syncMother(cfg, form));
  }
  bindRsvp(form);
  if (form.marital_status) bindProfile(form);
  const reload = () => loadParents(cfg, form).catch((e) => toast(e.message, true));
  reload();
  (cfg.watch || []).forEach((n) => form[n].addEventListener('change', reload));

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); $('#formerr').textContent = '';
    if (!form.reportValidity()) return;
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      const payload = buildPayload(cfg, form);
      await registerMember(payload);
      app.innerHTML = `<div class="card text-center py-10 space-y-3"><div class="text-4xl">🎉</div><h2 class="text-2xl font-bold">Thank you!</h2>
        <p class="text-slate-600 text-sm">${THANKS[payload.rsvp.status]}</p>
        <div class="flex justify-center gap-2 pt-2"><button class="btn bg-green-600 text-white" onclick="location.reload()">Register another person</button>
        <a href="index.html" class="btn bg-slate-100">Back home</a></div></div>`;
    } catch (err) {
      $('#formerr').textContent = err.details ? err.details.map((d) => `${d.field}: ${d.message}`).join(' · ') : err.message;
      btn.disabled = false;
    }
  });
}
