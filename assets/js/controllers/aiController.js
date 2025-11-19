import {
  generateGeminiContent,
  GeminiModelUnavailableError,
  suggestGeminiFallbackModel
} from '../utils/geminiClient.js';
import { formatAssistantHtml, markdownToPlainText } from '../utils/textUtils.js';
import { getDefaultGeminiModel } from '../utils/env.js';

const STORAGE_KEY = 'ai-assistant-preferences';
const PANEL_WIDTH_RANGE = { min: 320, max: 720 };

const CHAT_ACTIONS = [
  { label: 'Resumen caso', icon: '📋', prompt: 'Genera un resumen clínico completo y estructurado del caso actual.' },
  { label: 'Análisis crítico', icon: '🔍', prompt: 'Analiza riesgos, brechas diagnósticas y oportunidades de mejora del manejo.' },
  { label: 'Diferenciales', icon: '🩺', prompt: 'Proporciona diagnósticos diferenciales priorizados con breve justificación.' }
];

const EDIT_ACTIONS = [
  { label: 'Resumir', icon: '✂️', prompt: 'Resume el texto de la sección manteniendo los datos clínicos esenciales.' },
  { label: 'Expandir', icon: '📖', prompt: 'Amplía el texto con mayor detalle técnico sin inventar información.' },
  { label: 'Mejorar estilo', icon: '✨', prompt: 'Reescribe con redacción profesional, clara y cohesionada.' },
  { label: 'Corregir', icon: '🔧', prompt: 'Corrige ortografía y formato conservando el significado original.' }
];

function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('No se pudieron cargar las preferencias del asistente IA.', error);
    return {};
  }
}

function savePreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('No se pudieron guardar las preferencias del asistente IA.', error);
  }
}

function buildBaseContext({ title, patientFields = [], sections = [], medico = '', especialidad = '' }) {
  const patientBlock = patientFields
    .map((field) => `${field.label || field.id}: ${field.value || ''}`)
    .join('\n');
  const sectionsBlock = sections
    .map((section) => `${section.title}\n${section.content}`)
    .join('\n\n');
  const medicoBlock = [medico && `Médico tratante: ${medico}`, especialidad && `Especialidad: ${especialidad}`]
    .filter(Boolean)
    .join('\n');
  return `TÍTULO\n${title}\n\nDATOS DEL PACIENTE\n${patientBlock}\n\nSECCIONES CLÍNICAS\n${sectionsBlock}\n\n${medicoBlock}`.trim();
}

function getPersonaInstructions(profile) {
  switch (profile) {
    case 'urgencias':
      return 'Actúa como un médico de urgencias priorizando el reconocimiento de riesgos vitales y acciones inmediatas.';
    case 'pediatria':
      return 'Actúa como pediatra, cuidando la comunicación empática y ajustando dosis o intervenciones por peso y edad.';
    default:
      return 'Actúa como internista experimentado con enfoque integral y lenguaje técnico claro.';
  }
}

function buildSystemPrompt({ profile, mode, section }) {
  const persona = getPersonaInstructions(profile);
  if (mode === 'edit' && section) {
    return `${persona}\n\nTe enfocas únicamente en editar la sección "${section.title}". Usa la solicitud del usuario como guía, respeta los datos entregados y responde con texto listo para reemplazar la sección.`;
  }
  return `${persona}\nOfrece análisis clínico, recomendaciones o documentos apoyándote SIEMPRE en la información proporcionada.`;
}

function getActionsForMode(mode) {
  return mode === 'edit' ? EDIT_ACTIONS : CHAT_ACTIONS;
}

function clampWidth(width) {
  return Math.min(PANEL_WIDTH_RANGE.max, Math.max(PANEL_WIDTH_RANGE.min, width));
}

function renderEmptyState({ emptyState, apiKey, mode }) {
  if (!emptyState) {
    return;
  }
  emptyState.style.display = 'block';
  const paragraphs = emptyState.querySelectorAll('p');
  if (!apiKey) {
    if (paragraphs[1]) {
      paragraphs[1].textContent = 'Configura tu API Key en ⚙️ para comenzar.';
    }
  } else if (mode === 'chat') {
    if (paragraphs[1]) {
      paragraphs[1].textContent = 'Pregunta sobre diagnósticos, planes o solicita resúmenes clínicos.';
    }
  } else if (paragraphs[1]) {
    paragraphs[1].textContent = 'Selecciona una sección y pide cómo deseas mejorarla.';
  }
}

export function initAIController(options) {
  const {
    panel,
    toggleButton,
    sectionsContainer,
    getPatientFields,
    getSectionsSnapshot,
    getTitle,
    getMedico,
    getEspecialidad,
    onApplyToSection
  } = options || {};

  if (!panel || !toggleButton || !sectionsContainer) {
    return null;
  }

  const elements = {
    subtitle: panel.querySelector('[data-ai-subtitle]'),
    settingsPanel: panel.querySelector('[data-ai-settings]'),
    settingsToggle: panel.querySelector('[data-ai-settings-toggle]'),
    apiKey: panel.querySelector('[data-ai-api-key]'),
    project: panel.querySelector('[data-ai-project]'),
    model: panel.querySelector('[data-ai-model]'),
    profile: panel.querySelector('[data-ai-profile]'),
    markdown: panel.querySelector('[data-ai-markdown]'),
    autoModel: panel.querySelector('[data-ai-auto-model]'),
    tabs: panel.querySelectorAll('[data-ai-mode]'),
    sectionPicker: panel.querySelector('[data-ai-section-picker]'),
    sectionSelect: panel.querySelector('[data-ai-section-select]'),
    actions: panel.querySelector('[data-ai-actions]'),
    messages: panel.querySelector('[data-ai-messages]'),
    emptyState: panel.querySelector('[data-ai-empty]'),
    error: panel.querySelector('[data-ai-error]'),
    input: panel.querySelector('[data-ai-input]'),
    sendButton: panel.querySelector('[data-ai-send]'),
    inputArea: panel.querySelector('[data-ai-input-area]'),
    closeButton: panel.querySelector('[data-ai-close]'),
    resizer: panel.querySelector('[data-ai-resizer]')
  };

  const storedPrefs = loadPreferences();
  const state = {
    isOpen: false,
    mode: 'chat',
    messages: [],
    isLoading: false,
    showSettings: Boolean(storedPrefs.showSettings),
    apiKey: storedPrefs.apiKey || '',
    projectId: storedPrefs.projectId || '',
    model: storedPrefs.model || getDefaultGeminiModel(),
    assistantProfile: storedPrefs.assistantProfile || 'general',
    allowMarkdown: storedPrefs.allowMarkdown !== false,
    autoModel: storedPrefs.autoModel !== false,
    targetSectionIndex: 0,
    panelWidth: clampWidth(storedPrefs.panelWidth || 400),
    error: ''
  };

  function persist() {
    savePreferences({
      apiKey: state.apiKey,
      projectId: state.projectId,
      model: state.model,
      assistantProfile: state.assistantProfile,
      allowMarkdown: state.allowMarkdown,
      autoModel: state.autoModel,
      showSettings: state.showSettings,
      panelWidth: state.panelWidth
    });
  }

  function applyPreferencesToInputs() {
    if (elements.apiKey) {
      elements.apiKey.value = state.apiKey;
    }
    if (elements.project) {
      elements.project.value = state.projectId;
    }
    if (elements.model) {
      elements.model.value = state.model;
    }
    if (elements.profile) {
      elements.profile.value = state.assistantProfile;
    }
    if (elements.markdown) {
      elements.markdown.checked = state.allowMarkdown;
    }
    if (elements.autoModel) {
      elements.autoModel.checked = state.autoModel;
    }
    if (elements.settingsPanel) {
      elements.settingsPanel.classList.toggle('is-visible', state.showSettings || !state.apiKey);
    }
    panel.style.width = `${state.panelWidth}px`;
  }

  function setMode(mode) {
    if (state.mode === mode) {
      return;
    }
    state.mode = mode;
    state.messages = [];
    setError('');
    updateTabs();
    syncQuickActions();
    renderMessages();
    updateSubtitle();
    updateSectionPicker();
  }

  function updateTabs() {
    elements.tabs.forEach((tab) => {
      const tabMode = tab.getAttribute('data-ai-mode');
      tab.classList.toggle('is-active', tabMode === state.mode);
    });
  }

  function updateSubtitle() {
    if (!elements.subtitle) {
      return;
    }
    elements.subtitle.textContent =
      state.mode === 'chat' ? 'Analiza el caso clínico completo' : 'Edita la redacción de una sección concreta';
  }

  function getSectionsData() {
    return typeof getSectionsSnapshot === 'function' ? getSectionsSnapshot() : [];
  }

  function updateSectionPicker() {
    if (!elements.sectionPicker) {
      return;
    }
    const sections = getSectionsData();
    const showPicker = state.mode === 'edit' && sections.length > 0;
    elements.sectionPicker.classList.toggle('is-visible', showPicker);
    if (!showPicker) {
      return;
    }
    elements.sectionSelect.innerHTML = '';
    sections.forEach((section, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = section.title || `Sección ${index + 1}`;
      elements.sectionSelect.appendChild(option);
    });
    if (state.targetSectionIndex >= sections.length) {
      state.targetSectionIndex = sections.length - 1;
    }
    if (state.targetSectionIndex < 0) {
      state.targetSectionIndex = 0;
    }
    elements.sectionSelect.value = String(state.targetSectionIndex);
  }

  function syncQuickActions() {
    if (!elements.actions) {
      return;
    }
    elements.actions.innerHTML = '';
    const actions = getActionsForMode(state.mode);
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${action.icon} ${action.label}`;
      button.disabled = state.isLoading || !state.apiKey;
      button.addEventListener('click', () => handleSend(action.prompt));
      elements.actions.appendChild(button);
    });
  }

  function toggleDrawer(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.isOpen;
    state.isOpen = shouldOpen;
    panel.classList.toggle('is-open', state.isOpen);
    panel.setAttribute('aria-hidden', String(!state.isOpen));
    if (state.isOpen) {
      updateSectionPicker();
      renderMessages();
    }
  }

  function updateSendAvailability() {
    if (!elements.sendButton || !elements.input) {
      return;
    }
    const hasText = Boolean(elements.input.value.trim());
    elements.sendButton.disabled = !hasText || state.isLoading || !state.apiKey;
    elements.input.placeholder =
      state.mode === 'chat'
        ? 'Haz una pregunta sobre el caso...'
        : 'Describe cómo quieres reescribir la sección seleccionada...';
  }

  function renderMessages() {
    if (!elements.messages) {
      return;
    }
    elements.messages.innerHTML = '';
    const showEmpty = !state.messages.length;
    if (elements.emptyState) {
      elements.emptyState.style.display = showEmpty ? 'block' : 'none';
      if (showEmpty) {
        renderEmptyState({ emptyState: elements.emptyState, apiKey: state.apiKey, mode: state.mode });
      }
    }
    if (showEmpty) {
      return;
    }
    state.messages.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `ai-message ${message.role}`;
      const content = document.createElement('div');
      content.className = 'ai-markdown';
      const allowMarkdown = message.role === 'assistant' ? state.allowMarkdown : false;
      content.innerHTML = formatAssistantHtml(message.text, allowMarkdown);
      bubble.appendChild(content);
      if (message.role === 'assistant' && typeof message.proposalSectionIndex === 'number') {
        const applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.className = 'ai-apply';
        applyButton.textContent = 'Aplicar a la sección';
        applyButton.addEventListener('click', () => {
          const plain = markdownToPlainText(message.text);
          onApplyToSection?.(message.proposalSectionIndex, plain);
        });
        bubble.appendChild(applyButton);
      }
      elements.messages.appendChild(bubble);
    });
    if (state.isLoading) {
      const loading = document.createElement('div');
      loading.className = 'ai-message assistant';
      loading.textContent = 'Pensando...';
      elements.messages.appendChild(loading);
    }
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function setError(message) {
    state.error = message || '';
    if (!elements.error) {
      return;
    }
    elements.error.textContent = state.error;
    elements.error.classList.toggle('is-visible', Boolean(state.error));
  }

  function getContext() {
    if (typeof options.getFullContext === 'function') {
      return options.getFullContext();
    }
    return buildBaseContext({
      title: typeof getTitle === 'function' ? getTitle() : '',
      patientFields: typeof getPatientFields === 'function' ? getPatientFields() : [],
      sections: getSectionsData(),
      medico: typeof getMedico === 'function' ? getMedico() : '',
      especialidad: typeof getEspecialidad === 'function' ? getEspecialidad() : ''
    });
  }

  function getCurrentSection() {
    const sections = getSectionsData();
    return sections[state.targetSectionIndex];
  }

  async function handleSend(textOverride) {
    if (!elements.input) {
      return;
    }
    const text = textOverride || elements.input.value.trim();
    if (!text || state.isLoading || !state.apiKey) {
      return;
    }
    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text
    };
    state.messages.push(userMessage);
    if (!textOverride) {
      elements.input.value = '';
    }
    updateSendAvailability();
    renderMessages();

    const section = getCurrentSection();
    const personaPrompt = buildSystemPrompt({ profile: state.assistantProfile, mode: state.mode, section });
    const context = getContext();
    const promptText =
      state.mode === 'edit' && section
        ? `Sección objetivo: ${section.title}\nContenido actual:\n${section.content}\n\nSolicitud: ${text}`
        : text;

    const historyPayload = state.messages.slice(-6).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: message.id === userMessage.id ? promptText : message.text
        }
      ]
    }));

    const contents = [
      { role: 'user', parts: [{ text: personaPrompt }] },
      { role: 'user', parts: [{ text: `CONTEXTO CLÍNICO COMPLETO:\n${context}` }] },
      ...historyPayload
    ];

    setError('');
    state.isLoading = true;
    renderMessages();

    try {
      const response = await generateGeminiContent({
        apiKey: state.apiKey,
        model: state.model,
        contents,
        projectId: state.projectId,
        maxRetries: 1
      });
      const candidate = response?.candidates?.[0];
      const replyText = candidate?.content?.parts?.map((part) => part.text || '').join('\n').trim() || 'Sin respuesta';
      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: replyText,
        proposalSectionIndex: state.mode === 'edit' ? state.targetSectionIndex : undefined
      };
      state.messages.push(assistantMessage);
    } catch (error) {
      if (error instanceof GeminiModelUnavailableError && state.autoModel) {
        const fallback = suggestGeminiFallbackModel(error.availableModels);
        if (fallback?.modelId) {
          state.model = `${fallback.modelId}`;
          persist();
          setError('Modelo no disponible. Se seleccionó automáticamente otro modelo, intente nuevamente.');
        } else {
          setError(error.message || 'Modelo no disponible.');
        }
      } else {
        setError(error.message || 'No se pudo completar la solicitud.');
      }
    } finally {
      state.isLoading = false;
      renderMessages();
    }
  }

  function handleApplySectionChange(event) {
    state.targetSectionIndex = Number(event.target.value) || 0;
  }

  function handleToggleSettings() {
    state.showSettings = !state.showSettings;
    if (elements.settingsPanel) {
      elements.settingsPanel.classList.toggle('is-visible', state.showSettings);
    }
    persist();
  }

  function attachInputListeners() {
    elements.apiKey?.addEventListener('input', (event) => {
      state.apiKey = event.target.value.trim();
      if (state.apiKey) {
        state.showSettings = false;
      }
      applyPreferencesToInputs();
      updateSendAvailability();
      persist();
    });

    elements.project?.addEventListener('input', (event) => {
      state.projectId = event.target.value.trim();
      persist();
    });

    elements.model?.addEventListener('input', (event) => {
      state.model = event.target.value.trim() || getDefaultGeminiModel();
      persist();
    });

    elements.profile?.addEventListener('change', (event) => {
      state.assistantProfile = event.target.value;
      persist();
    });

    elements.markdown?.addEventListener('change', (event) => {
      state.allowMarkdown = event.target.checked;
      persist();
      renderMessages();
    });

    elements.autoModel?.addEventListener('change', (event) => {
      state.autoModel = event.target.checked;
      persist();
    });

    elements.sectionSelect?.addEventListener('change', handleApplySectionChange);

    elements.input?.addEventListener('input', updateSendAvailability);
    elements.input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    });
  }

  function attachTabListeners() {
    elements.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabMode = tab.getAttribute('data-ai-mode');
        setMode(tabMode);
      });
    });
  }

  function attachDrawerListeners() {
    toggleButton.addEventListener('click', () => toggleDrawer());
    elements.closeButton?.addEventListener('click', () => toggleDrawer(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isOpen) {
        toggleDrawer(false);
      }
    });
  }

  function attachSettingsListeners() {
    elements.settingsToggle?.addEventListener('click', handleToggleSettings);
  }

  function attachActionListeners() {
    elements.actions?.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target || target.disabled) {
        return;
      }
      event.preventDefault();
    });
  }

  function attachSendListener() {
    elements.sendButton?.addEventListener('click', () => handleSend());
  }

  function attachResizeListener() {
    if (!elements.resizer) {
      return;
    }
    elements.resizer.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = state.panelWidth;
      function onMouseMove(moveEvent) {
        const delta = startX - moveEvent.clientX;
        state.panelWidth = clampWidth(startWidth + delta);
        panel.style.width = `${state.panelWidth}px`;
      }
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        persist();
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function observeSections() {
    const observer = new MutationObserver(() => {
      if (state.isOpen) {
        updateSectionPicker();
      }
    });
    observer.observe(sectionsContainer, { childList: true, subtree: true });
  }

  applyPreferencesToInputs();
  updateTabs();
  updateSubtitle();
  syncQuickActions();
  renderMessages();
  updateSendAvailability();
  updateSectionPicker();

  attachInputListeners();
  attachTabListeners();
  attachDrawerListeners();
  attachSettingsListeners();
  attachActionListeners();
  attachSendListener();
  attachResizeListener();
  observeSections();

  return {
    toggle: toggleDrawer,
    send: handleSend
  };
}
