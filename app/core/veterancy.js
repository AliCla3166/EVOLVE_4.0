// Progression locale à chaque individu et à chaque bataille ; aucun soin à la promotion.
export function veteranBonus(u,settings){return settings.grades[(u.veteranRank||0)-1]||{damage:0,attackSpeed:0,resistance:0,size:0};}
export function updateVeterancy(u,dt,settings){
  if(u.dead)return false;
  u.fieldAge=(u.fieldAge||0)+Math.max(0,dt);
  const rank=settings.grades.filter(g=>u.fieldAge>=g.seconds).length;
  if(rank===(u.veteranRank||0))return false;
  u.veteranBaseSize??=u.sizeMult;u.veteranBaseInterval??=u.interval;
  const previousInterval=u.interval;u.veteranRank=rank;
  const bonus=veteranBonus(u,settings);
  u.sizeMult=u.veteranBaseSize*(1+bonus.size);
  u.interval=u.veteranBaseInterval/(1+bonus.attackSpeed);
  u.cd*=u.interval/previousInterval;
  return true;
}
export function receivedDamage(u,damage,settings){return damage*settings.unitDamageTaken*(1-veteranBonus(u,settings).resistance);}
