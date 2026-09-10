// Peuplement décoratif, indépendant de l'économie. Persisté pour ne jamais reculer.
export function structureLevels(s) {
  return Math.max(0, (s.colony.coreLevel || 1) - 1) + Object.values(s.colony.buildings || {}).reduce((n,b) => n + Math.max(0,b.level || 0), 0);
}
export function resetSettlement(s) {
  s.colony.settlement = { epoch: `${s.species.cycle}:${s.species.stage}`, baseLevels: structureLevels(s), basePoints: s.species.stagePoints || 0, growth: 0 };
  return s.colony.settlement;
}
export function ensureSettlement(s) {
  if (s.colony.settlement?.epoch !== `${s.species.cycle}:${s.species.stage}`) return resetSettlement(s);
  return s.colony.settlement;
}
export function updateSettlement(s, settings, stages) {
  const record = ensureSettlement(s);
  const target = settings.constructionTargetBase + settings.constructionTargetPerStage * (s.species.stage - 1);
  const upgrades = Math.max(0, structureLevels(s) - record.baseLevels);
  const goal = stages[Math.min(s.species.stage, stages.length - 1)].stage_points_required || 1;
  const points = Math.max(0, (s.species.stagePoints || 0) - record.basePoints);
  record.growth = Math.max(record.growth || 0, Math.min(1, Math.max(upgrades / target, points / goal)));
  const homes = settings.initialHomes + Math.floor(record.growth * (settings.maxHomes - settings.initialHomes));
  return { growth: record.growth, homes, upgrades, phase: Math.min(3, Math.floor(record.growth * 4)) };
}
