import { createDefaultSections, getTemplateSections } from '../models/defaults.js';

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

export function restoreClinicalSections(container) {
  renderSections(container, createDefaultSections());
}

export function applyTemplateSections(container, templateId) {
  renderSections(container, getTemplateSections(templateId));
}

export function collectSections(container) {
  return Array.from(container.querySelectorAll('.sec[data-section]')).map((section) => ({
    title: (section.querySelector('.subtitle')?.innerText || '').trim(),
    content: section.querySelector('textarea')?.value || ''
  }));
}

export function hydrateSections(container, sections = []) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return;
  }

  const existingSections = Array.from(container.querySelectorAll('.sec[data-section]'));
  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object') {
      return;
    }

    const target = existingSections[index];
    const title = (section.title ?? '').trim();
    const content = section.content ?? '';

    if (target) {
      const subtitle = target.querySelector('.subtitle');
      if (subtitle && title) {
        subtitle.innerText = title;
      }

      const textarea = target.querySelector('textarea');
      if (textarea) {
        textarea.value = String(content);
      }
      return;
    }

    const extraSection = createSectionElement({
      title: title || 'Sección personalizada',
      content: String(content)
    });
    container.appendChild(extraSection);
    existingSections.push(extraSection);
  });
}
