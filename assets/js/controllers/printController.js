import { getTemplateBaseName } from '../models/templates.js';
import { todayDMY } from '../utils/dateUtils.js';
import { stripAccents } from '../utils/stringUtils.js';

function buildSuggestedFilename(templateId, patientName) {
  const base = getTemplateBaseName(templateId);
  const date = todayDMY();
  const parts = [base, patientName.trim(), date].filter(Boolean);
  const sanitized = stripAccents(parts.join(' - ')).replace(/[^A-Za-z0-9 _\-]/g, '');
  return sanitized || base;
}

export function initPrintController({ button, select, getPatientName }) {
  if (!button) {
    return;
  }
  button.addEventListener('click', () => {
    const originalTitle = document.title;
    const suggested = buildSuggestedFilename(select.value, getPatientName());
    document.title = suggested || originalTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  });
}
