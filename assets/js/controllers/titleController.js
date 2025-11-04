import { buildTemplateTitle } from '../models/templates.js';

export function initTitleController({ select, titleDisplay, getReportDate }) {
  const updateTitle = () => {
    titleDisplay.innerText = buildTemplateTitle(select.value, getReportDate());
  };

  select.addEventListener('change', updateTitle);

  return {
    updateTitle
  };
}
