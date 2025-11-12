import { sanitizeFilename } from '../utils/stringUtils.js';

async function saveWithFilePicker({ payload, suggestedName }) {
  if (!window.showSaveFilePicker) {
    return false;
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Archivo JSON', accept: { 'application/json': ['.json'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(payload);
    await writable.close();
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') {
      return true;
    }
    console.error('Error al exportar archivo', error);
    alert('No se pudo exportar el archivo. Intente nuevamente.');
    return false;
  }
}

async function saveWithDirectoryPicker({ payload, suggestedName }) {
  if (!window.showDirectoryPicker) {
    return false;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker();
    const fileHandle = await directoryHandle.getFileHandle(suggestedName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(payload);
    await writable.close();
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') {
      return true;
    }
    console.error('Error al exportar archivo', error);
    alert('No se pudo exportar el archivo. Intente nuevamente.');
    return false;
  }
}

function downloadWithAnchor({ payload, suggestedName }) {
  const blob = new Blob([payload], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = suggestedName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 2000);
}

async function saveFile({ payload, suggestedName }) {
  if (await saveWithFilePicker({ payload, suggestedName })) {
    return;
  }

  if (await saveWithDirectoryPicker({ payload, suggestedName })) {
    return;
  }

  downloadWithAnchor({ payload, suggestedName });
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
