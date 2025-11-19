import { normalizeGeminiModelId, getDefaultGeminiModel } from './env.js';

export class GeminiModelUnavailableError extends Error {
  constructor(message, availableModels = []) {
    super(message);
    this.name = 'GeminiModelUnavailableError';
    this.availableModels = availableModels;
  }
}

function buildEndpoint({ model, projectId }) {
  const normalized = normalizeGeminiModelId(model || getDefaultGeminiModel());
  if (projectId) {
    return `https://generativelanguage.googleapis.com/v1beta/projects/${projectId}/locations/us-central1/models/${normalized}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${normalized}:generateContent`;
}

async function requestGemini({ apiKey, model, contents, projectId }) {
  const endpoint = buildEndpoint({ model, projectId });
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.error?.status === 'NOT_FOUND') {
      throw new GeminiModelUnavailableError(payload?.error?.message || 'Modelo no disponible', payload?.error?.details || []);
    }
    const errMsg = payload?.error?.message || 'No se pudo generar la respuesta de Gemini.';
    throw new Error(errMsg);
  }
  return payload;
}

export async function generateGeminiContent({ apiKey, model, contents, projectId, maxRetries = 0 }) {
  if (!apiKey) {
    throw new Error('API Key no configurada.');
  }
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await requestGemini({ apiKey, model, contents, projectId });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const FALLBACK_ORDER = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-pro'
];

export function suggestGeminiFallbackModel(models = []) {
  if (!Array.isArray(models) || !models.length) {
    return { modelId: FALLBACK_ORDER[0], version: 'latest' };
  }
  const normalized = models.map((model) => (typeof model === 'string' ? model : model?.model || '')).filter(Boolean);
  const preferred = FALLBACK_ORDER.find((modelId) => normalized.includes(modelId));
  if (preferred) {
    return { modelId: preferred, version: 'latest' };
  }
  return { modelId: FALLBACK_ORDER[0], version: 'latest' };
}
