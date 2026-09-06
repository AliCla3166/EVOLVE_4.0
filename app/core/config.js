// Charge data/*.json. Le moteur ne connait aucun contenu : tout vient d'ici.
const FILES = ['habits', 'stages', 'mutations', 'colony', 'battle', 'cards', 'codex'];
export const config = {};
export async function loadConfig(overrides = {}) {
  await Promise.all(FILES.map(async f => {
    const res = await fetch(`./data/${f}.json?v=${window.EVOLVE_VERSION || '0'}`);
    if (!res.ok) throw new Error(`data/${f}.json introuvable`);
    config[f] = await res.json();
  }));
  // Un override (edite dans Reglages) remplace le fichier habits.json.
  if (overrides.habits) { try { config.habits = JSON.parse(overrides.habits); config.habitsOverridden = true; } catch (e) { console.warn('habits override invalide', e); } }
  return config;
}
export function allFields() {
  return config.habits.sections.flatMap(s => s.fields.map(f => ({ ...f, section: s.id })));
}
export function stageOf(n) { return config.stages.stages[Math.min(n, config.stages.stages.length) - 1]; }
