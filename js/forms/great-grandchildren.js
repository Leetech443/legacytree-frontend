import { mountForm } from '../formPage.js';
import { F, S, SIDE } from '../ui.js';

mountForm({
  key: 'great-grandchildren', generation: 'GREAT_GRANDCHILD',
  badge: 'Form 3 · Generation 4', title: 'Great-grandchildren RSVP', sub: 'A parent or guardian should complete this form.',
  emptyParents: 'No matching parents registered yet',
  parentGender: () => '',
  fields: () => `${SIDE}
    ${S('parent_id', 'Select parent (Generation 3)', [])}
    <div class="grid sm:grid-cols-2 gap-4">
      ${F('full_name', 'Child Full Name')}${S('gender', 'Gender', [['Female', 'Female'], ['Male', 'Male']])}
      ${F('age', 'Age', { type: 'number', attrs: 'min="0" max="25"' })}<span></span>
      ${F('guardian_name', 'Guardian Name')}${F('guardian_phone', 'Guardian Phone', { type: 'tel' })}
    </div>`,
});
