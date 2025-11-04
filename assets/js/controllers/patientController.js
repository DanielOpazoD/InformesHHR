import { calculateAge } from '../utils/dateUtils.js';
import { createDefaultPatientFields } from '../models/defaults.js';

function normalizeType(type) {
  const allowed = ['text', 'date', 'number'];
  return allowed.includes(type) ? type : 'text';
}

function createDeleteButton(row) {
  const button = document.createElement('button');
  button.className = 'row-del';
  button.type = 'button';
  button.title = 'Eliminar este campo';
  button.textContent = '×';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    row.remove();
  });
  return button;
}

function createPatientRow(field) {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.field = '';

  const label = document.createElement('div');
  label.className = 'lbl';
  label.contentEditable = 'true';
  label.textContent = field.label || '';

  const input = document.createElement('input');
  input.className = 'inp';
  input.type = normalizeType(field.type);
  if (field.id) {
    input.id = field.id;
  }
  if (field.placeholder) {
    input.placeholder = field.placeholder;
  }
  input.value = field.value || '';

  row.append(label, input, createDeleteButton(row));
  return row;
}

export function renderPatientFields(container, fields) {
  container.innerHTML = '';
  fields.forEach((field) => {
    container.appendChild(createPatientRow(field));
  });
}

export function addPatientField(container) {
  const row = createPatientRow({ label: 'Nuevo campo', type: 'text', placeholder: '' });
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function restorePatientDefaults(container) {
  const defaults = createDefaultPatientFields();
  renderPatientFields(container, defaults);
  return defaults;
}

export function collectPatientFields(container) {
  return Array.from(container.querySelectorAll('.row')).map((row) => {
    const input = row.querySelector('input');
    return {
      label: (row.querySelector('.lbl')?.innerText || '').trim(),
      id: input?.id || '',
      type: normalizeType(input?.type),
      value: input?.value || ''
    };
  });
}

export function updateAge(container, reportDate) {
  const birthInput = container.querySelector('#fecnac');
  const ageInput = container.querySelector('#edad');
  if (!birthInput || !ageInput) {
    return;
  }
  ageInput.value = calculateAge(birthInput.value, reportDate);
}
