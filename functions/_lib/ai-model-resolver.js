const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

function clean(value) {
  return String(value == null ? '' : value).trim();
}

export function resolveAiModel(env = {}, options = {}) {
  const specificKey = clean(options.specificKey);
  const fallbackKey = clean(options.fallbackKey || 'AI_MODEL');
  const defaultModel = clean(options.defaultModel || DEFAULT_WORKERS_AI_MODEL);

  const specificValue = specificKey ? clean(env?.[specificKey]) : '';
  if (specificValue) {
    return {
      model: specificValue,
      modelKey: specificKey,
      defaultModel,
      usedFallbackKey: false,
      usedDefault: false
    };
  }

  const fallbackValue = fallbackKey ? clean(env?.[fallbackKey]) : '';
  if (fallbackValue) {
    return {
      model: fallbackValue,
      modelKey: fallbackKey,
      defaultModel,
      usedFallbackKey: true,
      usedDefault: false
    };
  }

  return {
    model: defaultModel,
    modelKey: 'default',
    defaultModel,
    usedFallbackKey: false,
    usedDefault: true
  };
}

export function buildAiModelDebug(resolved = {}) {
  return {
    model: resolved.model || '',
    modelKey: resolved.modelKey || '',
    usedFallbackKey: Boolean(resolved.usedFallbackKey),
    usedDefault: Boolean(resolved.usedDefault),
    defaultModel: resolved.defaultModel || DEFAULT_WORKERS_AI_MODEL
  };
}
