// Jour de jeu : la journee se termine a deadline_hour (5h). Avant 5h, on est encore "hier".
let deadlineHour = 5;
export function setDeadline(h) { deadlineHour = h; }
export function now() { return Date.now(); }
export function gameDate(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(d.getHours() - deadlineHour);
  return d;
}
export function dayKey(ts = Date.now()) {
  const d = gameDate(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function keyToDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(key, n) { const d = keyToDate(key); d.setDate(d.getDate() + n); return dayKey(d.getTime() + deadlineHour * 3600e3); }
export function daysBetween(k1, k2) { return Math.round((keyToDate(k2) - keyToDate(k1)) / 86400e3); }
export function fmtDay(key, opts = { weekday: 'short', day: 'numeric', month: 'short' }) { return keyToDate(key).toLocaleDateString('fr-FR', opts); }
export function fmtDuration(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return `${d}j ${h % 24}h`;
  if (h >= 1) return `${h}h ${String(m % 60).padStart(2, '0')}`;
  return `${m}m ${String(s % 60).padStart(2, '0')}`;
}
