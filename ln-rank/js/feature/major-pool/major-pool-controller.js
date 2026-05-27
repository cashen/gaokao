import { state, setFilters, setMajorPool } from "../../state/app-state.js";
import { debounce } from "../../core/number-utils.js";
import { fetchMajorWindow } from "./major-pool-api.js";
import { resetVisibleCounts } from "./major-pool-render.js";

let requestSeq = 0;
export async function loadMajorPool() {
  const seq = ++requestSeq;
  setMajorPool({ loading: true, error: null });
  try {
    const data = await fetchMajorWindow(state);
    if (seq !== requestSeq) return;
    setMajorPool({
      loading: false,
      error: null,
      groups: {
        upper: data.groups?.upper?.records || data.groups?.upper || [],
        near: data.groups?.near?.records || data.groups?.near || [],
        lower: data.groups?.lower?.records || data.groups?.lower || []
      },
      meta: data.meta || null,
      counts: data.counts || null
    });
  } catch (error) {
    if (seq !== requestSeq) return;
    setMajorPool({ loading: false, error: error.message || String(error) });
  }
}

export const debouncedLoadMajorPool = debounce(() => {
  resetVisibleCounts();
  loadMajorPool();
}, 350);

export function bindMajorPoolControls() {
  const region = document.getElementById("regionFilter");
  const school = document.getElementById("schoolKeywordInput");
  const major = document.getElementById("majorKeywordInput");
  const refresh = document.getElementById("refreshMajorsBtn");

  region.addEventListener("change", () => { setFilters({ region: region.value }); debouncedLoadMajorPool(); });
  school.addEventListener("input", () => { setFilters({ schoolKeyword: school.value }); debouncedLoadMajorPool(); });
  major.addEventListener("input", () => { setFilters({ majorKeyword: major.value }); debouncedLoadMajorPool(); });
  refresh.addEventListener("click", () => loadMajorPool());
}
