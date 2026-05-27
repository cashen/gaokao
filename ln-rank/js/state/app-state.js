export const state = {
  candidateScore: 520,
  rangePreset: 'standard',
  activeBand: 'near',
  filters: { region: 'all', schoolKeyword: '', majorKeyword: '' },
  bands: { loading: false, error: null, data: null },
  visible: { upper: 16, near: 16, steady: 16 }
};
