import { initTitleController } from './controllers/titleController.js';
import { initEditController } from './controllers/editController.js';
import { initFileController } from './controllers/fileController.js';
import { initPrintController } from './controllers/printController.js';
import {
  renderPatientFields,
  addPatientField,
  restorePatientDefaults,
  collectPatientFields,
  updateAge
} from './controllers/patientController.js';
import {
  renderSections,
  addSection,
  removeLastSection,
  restoreClinicalSections,
  applyTemplateSections,
  collectSections
} from './controllers/sectionController.js';
import { DEFAULT_PATIENT_FIELDS } from './models/defaults.js';
import { formatDateDMY } from './utils/dateUtils.js';

function getElement(id) {
  return document.getElementById(id);
}

function getReportDate() {
  return getElement('finf')?.value || '';
}

function getPatientName() {
  return getElement('nombre')?.value?.trim() || '';
}

function exportDocumentLabel({ select, titleDisplay }) {
  let label = titleDisplay.innerText.trim();
  if (/\s-\sHospital Hanga Roa$/i.test(label)) {
    label = label.replace(/\s*-\s*Hospital Hanga Roa$/i, '').trim();
  }
  if (!label) {
    const fallback = select.options[select.selectedIndex]?.text?.split('-')[0]?.trim() || 'Registro clínico';
    const date = formatDateDMY(getReportDate());
    label = date && date !== '____' ? `${fallback} (${date})` : fallback;
  }
  return label;
}

function buildExportName({ select, titleDisplay }) {
  const label = exportDocumentLabel({ select, titleDisplay });
  const patientName = getPatientName();
  return [label, patientName].filter(Boolean).join(' - ') || 'registro_clinico';
}

function sanitizePatientFieldsForRender(patientFields = []) {
  if (!Array.isArray(patientFields)) {
    return undefined;
  }
  return patientFields.map((field) => ({
    label: field.label || '',
    id: field.id || '',
    type: field.type || 'text',
    value: field.value || '',
    placeholder: field.placeholder || ''
  }));
}

function sanitizeSectionsForRender(sections = []) {
  if (!Array.isArray(sections)) {
    return undefined;
  }
  return sections.map((section) => ({
    title: section.title || '',
    content: section.content || ''
  }));
}

const DEFAULT_PATIENT_FIELD_IDS = DEFAULT_PATIENT_FIELDS.map((field) => field.id).filter(Boolean);

function computeRemovedPatientFieldIds(activeFields) {
  const activeIds = new Set(activeFields.map((field) => field.id).filter(Boolean));
  return DEFAULT_PATIENT_FIELD_IDS.filter((id) => !activeIds.has(id));
}

function init() {
  const select = getElement('titleSelect');
  const titleDisplay = getElement('titleDisplay');
  const patientGrid = getElement('patientGrid');
  const sectionsContainer = getElement('sectionsContainer');
  const editPanel = getElement('editPanel');
  const sheet = getElement('sheet');
  const toggleEditButton = getElement('toggleEdit');
  const addSectionButton = getElement('addSecBtn');
  const removeSectionButton = getElement('delSecBtn');
  const restoreAllButton = getElement('restoreBtn');
  const addPatientFieldButton = getElement('addPatientFieldBtn');
  const restorePatientButton = getElement('restorePatientBtn');
  const exportButton = getElement('exportJson');
  const importInput = getElement('importJson');
  const printButton = getElement('btnPrint');
  const medicoInput = getElement('medico');
  const especialidadInput = getElement('esp');

  if (!select || !titleDisplay || !patientGrid || !sectionsContainer) {
    console.error('No se pudieron inicializar los componentes principales.');
    return;
  }

  const titleController = initTitleController({ select, titleDisplay, getReportDate });
  initEditController({ sheet, editPanel, toggleEditButton });

  const restorePatients = () => {
    restorePatientDefaults(patientGrid);
    updateAge(patientGrid, getReportDate());
  };

  const restoreAll = () => {
    select.value = '2';
    restoreClinicalSections(sectionsContainer);
    restorePatients();
    titleController.updateTitle();
    if (medicoInput) {
      medicoInput.value = '';
    }
    if (especialidadInput) {
      especialidadInput.value = '';
    }
  };

  if (addSectionButton) {
    addSectionButton.addEventListener('click', () => addSection(sectionsContainer));
  }
  if (removeSectionButton) {
    removeSectionButton.addEventListener('click', () => removeLastSection(sectionsContainer));
  }
  if (restoreAllButton) {
    restoreAllButton.addEventListener('click', restoreAll);
  }
  if (addPatientFieldButton) {
    addPatientFieldButton.addEventListener('click', () => addPatientField(patientGrid));
  }
  if (restorePatientButton) {
    restorePatientButton.addEventListener('click', restorePatients);
  }

  select.addEventListener('change', () => {
    if (select.value === '6') {
      const snapshot = collectSections(sectionsContainer);
      applyTemplateSections(sectionsContainer, '6', snapshot);
    } else if (select.value === '2') {
      const snapshot = collectSections(sectionsContainer);
      restoreClinicalSections(sectionsContainer, snapshot);
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.id === 'finf') {
      titleController.updateTitle();
      updateAge(patientGrid, getReportDate());
    }
    if (target.id === 'fecnac') {
      updateAge(patientGrid, getReportDate());
    }
  }, true);

  const getModel = () => {
    const patientFields = collectPatientFields(patientGrid);
    return {
      version: 'v13',
      template: select.value,
      title: titleDisplay.innerText.trim(),
      patientFields,
      removedDefaultPatientFieldIds: computeRemovedPatientFieldIds(patientFields),
      medico: medicoInput?.value || '',
      especialidad: especialidadInput?.value || '',
      sections: collectSections(sectionsContainer)
    };
  };

  const applyModel = (model) => {
    if (model.template) {
      select.value = String(model.template);
    }

    const patientFields = sanitizePatientFieldsForRender(model.patientFields);
    if (patientFields) {
      renderPatientFields(patientGrid, patientFields);
    }

    const sections = sanitizeSectionsForRender(model.sections);
    if (sections) {
      renderSections(sectionsContainer, sections);
    }

    if (typeof model.title === 'string') {
      titleDisplay.innerText = model.title;
    }

    if (medicoInput) {
      medicoInput.value = model.medico || '';
    }
    if (especialidadInput) {
      especialidadInput.value = model.especialidad || '';
    }

    const shouldAutoTitle = select.value === '2' && (!model.title || /Evolución médica \(/i.test(model.title));
    if (shouldAutoTitle) {
      titleController.updateTitle();
    }

    updateAge(patientGrid, getReportDate());
  };

  if (exportButton && importInput) {
    initFileController({
      exportButton,
      importInput,
      getModel,
      applyModel,
      buildExportName: () => buildExportName({ select, titleDisplay })
    });
  }

  initPrintController({
    button: printButton,
    select,
    getPatientName
  });

  restoreAll();
}

document.addEventListener('DOMContentLoaded', init);
