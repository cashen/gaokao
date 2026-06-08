export const state = {
  candidateScore: null,
  rangePreset: "standard",
  activeBand: "near",
  bandFocus: "near",
  filters: {
    region: "all",
    schoolKeyword: "",
    majorKeyword: "",
    bottomLineMode: "all"
  },
  bands: {
    loading: false,
    error: null,
    data: null,
    message: "请输入考生分数后查看专业列表。"
  },
  visible: {
    upper: 16,
    near: 16,
    steady: 16
  }
};
