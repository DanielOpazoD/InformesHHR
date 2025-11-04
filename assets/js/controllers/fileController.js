import { sanitizeFilename } from '../utils/stringUtils.js';

async function saveFile({ payload, suggestedName }) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Archivo JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(payload);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Error al exportar archivo', error);
      alert('No se pudo exportar el archivo. Intente nuevamente.');
      return;
    }
  }

  const blob = new Blob([payload], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = suggestedName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 2000);
}

function ensureJsonExtension(name) {
  return /\.json$/i.test(name) ? name : `${name}.json`;
}

export function initFileController({ exportButton, importInput, getModel, applyModel, buildExportName }) {
  const handleExport = async () => {
    const model = getModel();
    const payload = JSON.stringify(model, null, 2);
    const filename = sanitizeFilename(buildExportName(model));
    const suggestedName = ensureJsonExtension(filename || 'registro_clinico');
    await saveFile({ payload, suggestedName });
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyModel(data);
      } catch (error) {
        console.error('Archivo inválido', error);
        alert('Archivo inválido. Debe ser JSON exportado por esta plantilla.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  exportButton.addEventListener('click', handleExport);
  importInput.addEventListener('change', handleImport);
}
