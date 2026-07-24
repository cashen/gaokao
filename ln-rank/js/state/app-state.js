export const state = {
  candidateScore: null,
  rangePreset: "standard",
  activeBand: "near",
  bandFocus: "near",
  resultViewMode: "all",
  resultMode: "score-bands",
  schoolSelection: {
    status: "empty",
    input: "",
    entityId: "",
    displayName: "",
    entityType: "",
    parentEntityId: ""
  },
  schoolAll: {
    loading: false,
    loadingMore: false,
    error: null,
    data: null,
    sort: "score-desc",
    offset: 0,
    limit: 40,
    dirty: false
  },
  filters: {
    region: "all",
    schoolKeyword: "",
    majorKeyword: "",
    bottomLineMode: "all",
    specialProjectMode: "hide_eligibility_projects"
  },
  bands: {
    loading: false,
    loadingMoreBand: "",
    moreError: "",
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