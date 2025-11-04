import { formatDateDMY } from '../utils/dateUtils.js';

const HOSPITAL_SUFFIX = ' - Hospital Hanga Roa';

export function buildTemplateTitle(templateId, reportDate) {
  switch (templateId) {
    case '1':
      return `Informe médico de traslado${HOSPITAL_SUFFIX}`;
    case '2':
      return `Evolución médica (${formatDateDMY(reportDate)})${HOSPITAL_SUFFIX}`;
    case '3':
      return 'Epicrisis médica';
    case '4':
      return 'Epicrisis médica de traslado';
    case '5':
      return '';
    case '6':
      return `Informe médico${HOSPITAL_SUFFIX}`;
    default:
      return `Registro clínico${HOSPITAL_SUFFIX}`;
  }
}

export function getTemplateBaseName(templateId) {
  switch (templateId) {
    case '1':
      return 'Informe medico';
    case '2':
      return 'Evolucion medica';
    case '3':
      return 'Epicrisis';
    case '4':
      return 'Epicrisis traslado';
    case '5':
      return 'Registro Clinico';
    case '6':
      return 'Informe medico';
    default:
      return 'Registro Clinico';
  }
}
