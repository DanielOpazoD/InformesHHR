const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

export function normalizeGeminiModelId(model) {
  if (!model) {
    return DEFAULT_MODEL;
  }
  return model.replace(/^models\//, '').trim();
}

export function getDefaultGeminiModel() {
  return DEFAULT_MODEL;
}
