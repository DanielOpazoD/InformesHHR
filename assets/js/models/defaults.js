export const DEFAULT_PATIENT_FIELDS = Object.freeze([
  { label: 'Nombre', id: 'nombre', type: 'text', placeholder: 'Nombre Apellido' },
  { label: 'Rut', id: 'rut', type: 'text', placeholder: '' },
  { label: 'Fecha de nacimiento', id: 'fecnac', type: 'date', placeholder: '' },
  { label: 'Edad', id: 'edad', type: 'number', placeholder: 'años' },
  { label: 'Fecha de ingreso', id: 'fing', type: 'date', placeholder: '' },
  { label: 'Fecha del informe', id: 'finf', type: 'date', placeholder: '' }
]);

export const DEFAULT_SECTIONS = Object.freeze([
  { title: 'Antecedentes', content: '' },
  { title: 'Historia y evolución clínica', content: '' },
  { title: 'Exámenes complementarios', content: '' },
  { title: 'Diagnósticos', content: '' },
  { title: 'Plan', content: '' }
]);

const TEMPLATE_SECTIONS = Object.freeze({
  '2': DEFAULT_SECTIONS,
  '6': [
    { title: 'Antecedentes', content: '' },
    { title: '', content: '' }
  ]
});

export function createDefaultPatientFields() {
  return DEFAULT_PATIENT_FIELDS.map((field) => ({ ...field }));
}

export function createDefaultSections() {
  return DEFAULT_SECTIONS.map((section) => ({ ...section }));
}

export function getTemplateSections(templateId) {
  const template = TEMPLATE_SECTIONS[templateId];
  if (!template) {
    return createDefaultSections();
  }
  return template.map((section) => ({ ...section }));
}
