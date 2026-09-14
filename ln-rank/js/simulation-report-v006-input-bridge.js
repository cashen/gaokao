const STORAGE_KEY = 'gaokao:simulation-report:v002';
const legacyRow = id => document.querySelector(`#volunteerRows tr[data-row-id="${CSS.escape(id)}"]`);
function bridgeField(id, field, value) {
  const row = legacyRow(id);
  const input = row?.querySelector(`[data-field="${CSS.escape(field)}"]`);
  if (!input) return;
  if (input.value === value) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}
function bridgeMeta(key, value) {
  const map = { studentName: 'studentName', subjectTrack: 'subjectTrack', totalScore: 'totalScore' };
  const input = document.getElementById(map[key]);
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
document.addEventListener('input', event => {
  const target = event.target;
  if (target.matches('[data-field][data-id]')) {
    bridgeField(target.dataset.id, target.dataset.field, target.value);
  }
  if (target.id === 'wbStudentName') bridgeMeta('studentName', target.value);
  if (target.id === 'wbSubject') bridgeMeta('subjectTrack', target.value);
  if (target.id === 'wbTotalScore') bridgeMeta('totalScore', target.value);
});
