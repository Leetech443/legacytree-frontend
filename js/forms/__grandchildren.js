import { mountForm } from '../formPage.js';
import { F, S, YN, SIDE, PROFILE } from '../ui.js';

mountForm({
  key: 'grandchildren', generation: 'GRANDCHILD',
  badge: 'Form 2 · Generation 3', title: 'Grandchildren RSVP', sub: 'Choose the parent you descend from (a registered child of the family).',
  emptyParents: 'No matching parents registered yet',
  watch: ['parent_gender'],
  parentGender: (form) => form.parent_gender.value || false,
  fields: () => `<div class="grid sm:grid-cols-2 gap-4">${SIDE}
      ${S('parent_gender', 'Parent is my', [['Female', 'Mother'], ['Male', 'Father']])}</div>
    ${S('parent_id', 'Select parent', [])}
    <div class="grid sm:grid-cols-2 gap-4">
      ${F('full_name', 'Full Name')}${S('gender', 'Gender', [['Female', 'Female'], ['Male', 'Male']])}
      ${F('age', 'Age', { type: 'number', attrs: 'min="0" max="100"' })}${F('phone', 'Phone', { type: 'tel', req: false })}
      ${F('email', 'Email', { type: 'email', req: false })}
    </div>
    ${PROFILE()}
    ${YN('has_children', 'Do you have children?')}`,
});
