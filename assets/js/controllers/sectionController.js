import { createDefaultSections, getTemplateSections } from '../models/defaults.js';

function mergeSectionsWithContent(templateSections, previousSections = []) {
  if (!Array.isArray(previousSections) || previousSections.length === 0) {
    return templateSections.map((section) => ({ ...section }));
  }

  const merged = templateSections.map((section, index) => ({
    title: previousSections[index]?.title?.trim() || section.title || '',
    content: previousSections[index]?.content || ''
  }));

  if (previousSections.length > templateSections.length) {
    previousSections.slice(templateSections.length).forEach((section) => {
      merged.push({
        title: section.title || '',
        content: section.content || ''
      });
    });
  }

  return merged;
}

function createSectionElement(section) {
  const container = document.createElement('div');
  container.className = 'sec';
  container.dataset.section = '';

  const deleteButton = document.createElement('button');
  deleteButton.className = 'sec-del';
  deleteButton.type = 'button';
  deleteButton.title = 'Eliminar sección';
  deleteButton.textContent = '×';
  deleteButton.addEventListener('click', (event) => {
    event.preventDefault();
    container.remove();
  });

  const subtitle = document.createElement('div');
  subtitle.className = 'subtitle';
  subtitle.contentEditable = 'true';
  subtitle.textContent = section.title || '';

  const textarea = document.createElement('textarea');
  textarea.className = 'txt';
  textarea.value = section.content || '';

  container.append(deleteButton, subtitle, textarea);
  return container;
}

export function renderSections(container, sections) {
  container.innerHTML = '';
  sections.forEach((section) => {
    container.appendChild(createSectionElement(section));
  });
}

export function addSection(container) {
  const section = createSectionElement({ title: 'Sección personalizada', content: '' });
  container.appendChild(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function removeLastSection(container) {
  const sections = container.querySelectorAll('.sec[data-section]');
  if (!sections.length) {
    return;
  }
  sections[sections.length - 1].remove();
}

export function restoreClinicalSections(container, previousSections) {
  const sections = mergeSectionsWithContent(createDefaultSections(), previousSections);
  renderSections(container, sections);
}

export function applyTemplateSections(container, templateId, previousSections) {
  const templateSections = getTemplateSections(templateId);
  const sections = mergeSectionsWithContent(templateSections, previousSections);
  renderSections(container, sections);
}

export function collectSections(container) {
  return Array.from(container.querySelectorAll('.sec[data-section]')).map((section) => ({
    title: (section.querySelector('.subtitle')?.innerText || '').trim(),
    content: section.querySelector('textarea')?.value || ''
  }));
}
