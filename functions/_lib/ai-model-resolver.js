export const DEFAULT_WORKERS_AI_MODEL = '@cf/zai-org/glm-4.7-flash';

export const WORKERS_AI_MODEL_ALIASES = Object.freeze({
  '@cf/meta/llama-3.1-8b-instruct': DEFAULT_WORKERS_AI_MODEL,
  'AI_MODEL': DEFAULT_WORKERS_AI_MODEL
});

function clean(value) {
  return String(value == null ? '' : value).trim();
}

export function resolveWorkersAiModelAlias(value) {
  const requestedModel = clean(value);
  const model = WORKERS_AI_MODEL_ALIASES[requestedModel] || requestedModel;
  return {
    model,
    requestedModel,
    migrated: Boolean(requestedModel && model !== requestedModel),
    migratedFrom: requestedModel && model !== requestedModel ? requestedModel : ''
  };
}

export function resolveAiModel(env = {}, options = {}) {
  const specificKey = clean(options.specificKey);
  const fallbackKey = clean(options.fallbackKey || 'AI_MODEL');
  const configuredDefault = clean(options.defaultModel || DEFAULT_WORKERS_AI_MODEL);
  const defaultResolved = resolveWorkersAiModelAlias(configuredDefault);
  const defaultModel = defaultResolved.model || DEFAULT_WORKERS_AI_MODEL;

  const specificValue = specificKey ? clean(env?.[specificKey]) : '';
  if (specificValue) {
    const resolved = resolveWorkersAiModelAlias(specificValue);
    return {
      model: resolved.model,
      modelKey: specificKey,
      requestedModel: resolved.requestedModel,
      migrated: resolved.migrated,
      migratedFrom: resolved.migratedFrom,
      defaultModel,
      usedFallbackKey: false,
      usedDefault: false
    };
  }

  const fallbackValue = fallbackKey ? clean(env?.[fallbackKey]) : '';
  if (fallbackValue) {
    const resolved = resolveWorkersAiModelAlias(fallbackValue);
    return {
      model: resolved.model,
      modelKey: fallbackKey,
      requestedModel: resolved.requestedModel,
      migrated: resolved.migrated,
      migratedFrom: resolved.migratedFrom,
      defaultModel,
      usedFallbackKey: true,
      usedDefault: false
    };
  }

  return {
    model: defaultModel,
    modelKey: 'default',
    requestedModel: configuredDefault || DEFAULT_WORKERS_AI_MODEL,
    migrated: defaultResolved.migrated,
    migratedFrom: defaultResolved.migratedFrom,
    defaultModel,
    usedFallbackKey: false,
    usedDefault: true
  };
}

export function buildAiModelDebug(resolved = {}) {
  return {
    model: resolved.model || '',
    modelKey: resolved.modelKey || '',
    requestedModel: resolved.requestedModel || '',
    migrated: Boolean(resolved.migrated),
    migratedFrom: resolved.migratedFrom || '',
    usedFallbackKey: Boolean(resolved.usedFallbackKey),
    usedDefault: Boolean(resolved.usedDefault),
    defaultModel: resolved.defaultModel || DEFAULT_WORKERS_AI_MODEL
  };
}
