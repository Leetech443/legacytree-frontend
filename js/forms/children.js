import { mountForm } from '../formPage.js';
import { F, S, YN, PROFILE } from '../ui.js';

mountForm({
  key: 'children', generation: 'CHILD',
  badge: 'Form 1 · Generation 2', title: 'Direct Children RSVP', sub: 'For sons and daughters of our registered family mothers.',
  emptyParents: 'No registered mothers yet',
  parentGender: () => 'Female',
  fields: () => `${S('parent_id', 'Select Mum (registered mother)', [])}
    <div class="grid sm:grid-cols-2 gap-4">
      ${F('full_name', 'Full Name')}${S('gender', 'Gender', [['Female', 'Female'], ['Male', 'Male']])}
      ${F('phone', 'Phone / WhatsApp', { type: 'tel' })}${F('email', 'Email Address', { type: 'email', req: false })}
      ${F('age', 'Age', { type: 'number', req: false, attrs: 'min="0" max="120"' })}
    </div>
    ${PROFILE()}
    ${YN('has_children', 'Do you have children?')}`,
});
