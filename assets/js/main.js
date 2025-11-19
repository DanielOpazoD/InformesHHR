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
import { formatDateDMY } from './utils/dateUtils.js';
import { initAIController } from './controllers/aiController.js';

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

function buildFullRecordContent({ titleDisplay, patientGrid, sectionsContainer, medicoInput, especialidadInput }) {
  const title = titleDisplay?.innerText?.trim() || '';
  const patientFields = collectPatientFields(patientGrid);
  const sections = collectSections(sectionsContainer);
  const medico = medicoInput?.value?.trim() || '';
  const especialidad = especialidadInput?.value?.trim() || '';

  const lines = [];
  if (title) {
    lines.push(`Título: ${title}`);
  }
  if (patientFields.length) {
    lines.push('', 'Información del paciente:');
    patientFields.forEach((field) => {
      lines.push(`${field.label || field.id}: ${field.value || ''}`);
    });
  }
  if (sections.length) {
    lines.push('', 'Secciones clínicas:');
    sections.forEach((section) => {
      lines.push(section.title || 'Sin título');
      lines.push(section.content || '');
      lines.push('');
    });
  }
  if (medico || especialidad) {
    lines.push('', `Médico tratante: ${medico || '—'}`);
    lines.push(`Especialidad: ${especialidad || '—'}`);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
  const aiToggleButton = getElement('toggleAI');
  const aiPanel = getElement('aiDrawer');
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
      applyTemplateSections(sectionsContainer, '6');
    } else if (select.value === '2') {
      restoreClinicalSections(sectionsContainer);
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

  const getModel = () => ({
    version: 'v12',
    template: select.value,
    title: titleDisplay.innerText.trim(),
    patientFields: collectPatientFields(patientGrid),
    medico: medicoInput?.value || '',
    especialidad: especialidadInput?.value || '',
    sections: collectSections(sectionsContainer)
  });

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

  initAIController({
    panel: aiPanel,
    toggleButton: aiToggleButton,
    sectionsContainer,
    getPatientFields: () => collectPatientFields(patientGrid),
    getSectionsSnapshot: () => collectSections(sectionsContainer),
    getTitle: () => titleDisplay.innerText.trim(),
    getMedico: () => medicoInput?.value || '',
    getEspecialidad: () => especialidadInput?.value || '',
    getFullContext: () =>
      buildFullRecordContent({
        titleDisplay,
        patientGrid,
        sectionsContainer,
        medicoInput,
        especialidadInput
      }),
    onApplyToSection: (sectionIndex, newContent) => {
      const sections = sectionsContainer.querySelectorAll('.sec[data-section]');
      const section = sections[sectionIndex];
      const textarea = section?.querySelector('textarea');
      if (textarea) {
        textarea.value = newContent || '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });

  restoreAll();
}

document.addEventListener('DOMContentLoaded', init);
