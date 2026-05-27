export const SLIDER_PRESETS = {
  pm25: { key: "pm25", label: "±25", min: -25, max: 25, step: 1 },
  pm50: { key: "pm50", label: "±50", min: -50, max: 50, step: 1 },
  m50p100: { key: "m50p100", label: "-50~+100", min: -50, max: 100, step: 1 },
  custom: { key: "custom", label: "自定义", min: -50, max: 100, step: 1 }
};
export const DEFAULT_PRESET = "pm25";
