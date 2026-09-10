import { drawPaintedBuilding } from './painted.js';
// Architecture de la Lignée : la coquille devient contrefort, le noyau devient porte.
// Toutes les formes restent distinctes sous l'eau. Pas de cloche commune masquant le bâtiment.
import { INK, groundShade, shade } from './style.js';
import { plate, line, oval, nucleus, material } from './relic.js';
export const SHAPE_IDS = ['vacuole', 'bassin', 'carriere', 'ossuaire', 'helice', 'champ', 'silo', 'caserne', 'forge', 'sanctuaire', 'vigie', 'porte'];

function plinth(c, M) {
  plate(c, 'M-43-9 L-29-19 28-19 44-9 32 2 -31 2Z', M.dark, 2);
  plate(c, 'M-43-9 L0-2 44-9 32 2 -31 2Z', shade(M.dark, -.18), 0);
}
function shell(c, M, d) {
  plate(c, d, M.bone, 2.4);
}
function doorway(c, x, y, r, M) { nucleus(c, x, y, r, M.light); }

function monument(c, shape, M, t) {
  switch (shape) {
    case 'vacuole':
      plate(c, 'M-26-18 Q-35-44-18-63 Q0-77 19-61 Q34-42 25-18 Q0-8-26-18Z', M.base, 2.4);
      plate(c, 'M-22-45 Q-22-65 1-64 L-5-50Z', M.light, 0);
      shell(c, M, 'M-32-9 L-36-35 -29-54 -24-48 -23-23 -12-13 12-13 24-26 25-48 31-55 37-33 31-9Z');
      doorway(c, 0, -38, 10, M);
      break;
    case 'bassin':
      plate(c, 'M-40-27 Q0-49 40-27 L34-11 Q0 3-34-11Z', M.boneShade, 2.4);
      oval(c, 0, -26, 39, 14, M.bone, 2.4);
      oval(c, 0, -26, 29, 8, M.dark);
      oval(c, 0, -26, 22, 5, M.base);
      line(c, 'M-18-26 Q-5-31 8-28', M.light, 2);
      shell(c, M, 'M17-31 L18-58 25-67 29-58 27-29Z');
      oval(c, 23, -37 + Math.sin(t * 2) * 2, 2.8, 4, M.light);
      break;
    case 'carriere':
      shell(c, M, 'M-36-10 L-33-39 -19-62 3-66 30-49 38-13 17-6Z');
      plate(c, 'M3-66 L30-49 38-13 17-6 7-32Z', M.boneShade, 0);
      plate(c, 'M-30-30 L-8-39 12-28 13-10 -8-5 -31-13Z', M.dark, 1.8);
      plate(c, 'M-26-28 L-9-34 6-27 -10-20Z', M.base, 0);
      line(c, 'M-10-20 v10 M-26-16 l15 6 18-7', M.light, 1.5);
      break;
    case 'ossuaire':
      shell(c, M, 'M-35-9 Q-43-53-10-69 L-5-61 Q-28-40-22-12Z');
      shell(c, M, 'M35-9 Q43-53 10-69 L5-61 Q28-40 22-12Z');
      shell(c, M, 'M-14-65 L0-76 14-65 9-49 -9-49Z');
      plate(c, 'M-19-14 L-20-27 0-34 20-27 19-14 0-8Z', M.boneShade, 2);
      doorway(c, 0, -61, 5, M);
      break;
    case 'helice':
      plate(c, 'M-18-12 L-13-62 0-77 14-62 20-12Z', M.dark, 2.4);
      shell(c, M, 'M-20-12 Q24-28 10-45 Q-5-62 12-75 L19-67 Q8-58 21-43 Q30-24-6-10Z');
      plate(c, 'M12-15 Q-24-32-10-47 Q5-61-9-72 L-16-63 Q-8-55-20-43 Q-28-27-1-12Z', M.base, 2);
      oval(c, 0, -47 + Math.sin(t * .8) * 3, 5, 7, '#A76BD9');
      break;
    case 'champ':
      plate(c, 'M-39-14 L-20-32 36-23 26-7Z', M.boneShade, 2);
      for (const [x, y, k] of [[-22,-15,.75],[0,-13,1],[23,-16,.8]]) {
        c.save(); c.translate(x,y); c.scale(k,k);
        plate(c, 'M-4 0 L-6-16 Q-27-25-18-44 Q-4-42 0-25 Q2-54 18-57 Q30-35 7-17 L5 0Z', M.base, 2.4);
        plate(c, 'M1-23 Q6-47 17-51 Q18-35 1-23Z', M.light, 0); c.restore();
      }
      break;
    case 'silo':
      shell(c, M, 'M-24-12 L-24-51 -15-64 15-64 24-51 24-12 0-5Z');
      plate(c, 'M0-63 L15-64 24-51 24-12 0-5Z', M.boneShade, 0);
      plate(c, 'M-28-51 L-15-73 0-81 16-72 29-51 0-45Z', M.base, 2.4);
      plate(c, 'M-25-51 L-13-70 0-77 0-49Z', M.light, 0);
      plate(c, 'M-6-37 h12 v21 H-6Z', M.dark, 0);
      line(c, 'M-2-32 v11', M.light, 2.5);
      break;
    case 'caserne':
      shell(c, M, 'M-39-10 L-35-39 -24-52 24-52 35-39 39-10Z');
      plate(c, 'M-39-39 L-30-58 -14-65 14-65 30-58 39-39 0-32Z', M.dark, 2.4);
      plate(c, 'M-33-41 L-27-54 -13-60 0-59 0-38Z', M.base, 0);
      plate(c, 'M-11-9 V-28 Q0-42 11-28 V-9Z', INK, 0);
      line(c, 'M-28-27 v11 M28-27 v11', M.dark, 3);
      break;
    case 'forge':
      shell(c, M, 'M11-32 L13-72 28-75 33-68 30-25Z');
      plate(c, 'M15-68 L27-70 27-64 15-62Z', M.dark, 0);
      shell(c, M, 'M-34-10 L-32-36 -17-52 9-49 28-27 29-10Z');
      plate(c, 'M-24-11 L-23-29 Q-12-47 2-29 L8-11Z', INK, 0);
      plate(c, 'M-19-12 L-18-24 -12-31 -4-24 0-12Z', '#E0A045', 0);
      plate(c, 'M-12-12 L-11-24 -6-12Z', '#FFC24B', 0);
      for (let i = 0; i < 2; i++) {
        const p = (t * .3 + i * .5) % 1;
        c.save(); c.globalAlpha *= (1-p) * .35;
        oval(c, 22 + p * 8, -80 - p * 16, 4 + p * 3, 3 + p * 2, M.bone); c.restore();
      }
      break;
    case 'sanctuaire':
      shell(c, M, 'M-35-11 L-28-52 -14-75 -8-64 -16-41 -14-12Z');
      shell(c, M, 'M35-11 L28-52 14-75 8-64 16-41 14-12Z');
      plate(c, 'M-19-13 L0-23 19-13 0-7Z', M.base, 2);
      doorway(c, 0, -47 + Math.sin(t) * 2, 10, M);
      line(c, 'M-13-75 Q0-89 13-75', M.base, 2.5);
      break;
    case 'vigie':
      shell(c, M, 'M-22-9 L-13-58 -8-68 9-68 15-57 22-9Z');
      plate(c, 'M0-63 L9-64 15-57 22-9 0-6Z', M.boneShade, 0);
      plate(c, 'M-23-56 L-25-70 -13-85 14-85 25-70 23-56 0-49Z', M.dark, 2.4);
      plate(c, 'M-22-71 L-11-81 13-81 22-71 0-66Z', M.base, 0);
      line(c, 'M-13-62 L0-58 13-62', M.light, 3);
      break;
    case 'porte':
      shell(c, M, 'M-39-9 L-35-53 -25-67 -14-55 -13-9Z');
      shell(c, M, 'M39-9 L35-53 25-67 14-55 13-9Z');
      plate(c, 'M-25-53 L-14-66 14-66 25-53 19-44 -19-44Z', M.base, 2.4);
      plate(c, 'M-14-10 L-14-34 0-42 14-34 14-10Z', M.dark, 0);
      line(c, 'M0-35 v21', M.light, 2);
      break;
    default: // Cœur commun à la Colonie et aux deux camps de bataille.
      shell(c, M, 'M-37-9 L-34-43 -18-70 0-83 18-70 34-43 37-9Z');
      plate(c, 'M0-83 L18-70 34-43 37-9 16-9 13-44Z', M.boneShade, 0);
      plate(c, 'M-23-12 L-22-43 0-65 22-43 23-12Z', M.dark, 2);
      doorway(c, 0, -35, 13, M);
      plate(c, 'M-37-9 L-31-26 -24-20 -23-9 23-9 24-20 31-26 37-9Z', M.base, 2);
  }
}

export function drawBuilding(ctx, opts = {}) {
  if (opts.stage && drawPaintedBuilding(ctx, opts)) return;
  const { x = 0, y = 0, s = 25, shape = 'core', level = 0, busy = false, t = 0, aquatic = false, badge = true,
    palette = { tint: '#3FB8C9', ground: '#1B3A4F' } } = opts;
  const M = material(palette.tint);
  if (aquatic) { M.bone = shade(palette.tint, .45); M.boneShade = shade(palette.tint, .1); }
  const c = ctx; c.save(); c.translate(x, y); groundShade(c, 0, 0, s * 1.12); c.scale(s / 40, s / 40);
  plinth(c, M);
  if (!level && busy) {
    plate(c, 'M-31-10 L-31-24 -20-30 20-30 31-24 31-10Z', M.boneShade, 2);
    line(c, 'M-27-12 V-49 M27-12 V-49 M-27-41 H27', M.bone, 4);
  } else monument(c, shape, M, t);
  // Un niveau construit devient une bague architecturale ; le chiffre reste lisible.
  if (level >= 3) line(c, 'M-27-9 H27', M.bone, 2);
  if (level >= 6) line(c, 'M-22-5 H22', M.base, 2);
  if (aquatic) {
    const p = (t * .25) % 1;
    c.save(); c.globalAlpha *= .35 * (1-p);
    oval(c, 32, -72 - p * 20, 3, 3, M.light); c.restore();
  }
  if (level && badge) {
    plate(c, 'M29-11 H44 V4 H29Z', INK, 1.5);
    c.fillStyle = '#FFC24B'; c.font = '900 12px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(level), 36.5, -3);
  }
  if (busy && level) {
    c.save(); c.translate(0,-91); c.rotate(Math.sin(t * 3) * .2);
    plate(c, 'M-2 10 V-7 H2 V10Z', M.boneShade, 1.5);
    plate(c, 'M-9-12 H9 V-5 H-9Z', '#FFC24B', 1.8); c.restore();
  }
  c.restore();
}

export function drawTurret(ctx, { x, y, s, shape, tint, t = 0, fire = 0, facing = 1, level = 1 }) {
  const c = ctx, M = material(tint); c.save(); c.translate(x,y); c.scale(s/35,s/35); plinth(c,M);
  if (shape === 'machoire') {
    for (const side of [-1,1]) {
      c.save(); c.translate(side*19,-9); c.rotate(side*(.28-fire*.38));
      shell(c,M,'M-8 0 L-9-18 -2-44 6-30 9 0Z'); c.restore();
    }
    oval(c,0,-9,10,4,M.base);
  } else if (shape === 'autel') {
    monument(c,'sanctuaire',M,t);
    if (fire > .1) { c.save(); c.globalAlpha *= fire; line(c,'M-26-45 Q0-68 26-45',M.light,3); c.restore(); }
  } else {
    shell(c,M,'M-22-10 L-15-43 13-43 22-10Z');
    c.save(); c.translate(-fire*4*facing,-47); c.scale(facing,1);
    plate(c,'M-21-8 L-10-16 23-13 34-5 27 6 -10 8Z',M.dark,2.4);
    plate(c,'M-18-8 L-9-12 22-10 25-5 -8 1Z',M.bone,0);
    line(c,'M-6-5 H22',M.base,2.5);
    if(fire>.4) plate(c,'M34-5 l13-5 -4 7 4 6 -13-3Z','#FFC24B',0);
    c.restore();
  }
  if(level>1) { c.fillStyle='#FFC24B'; c.font='900 12px Nunito, sans-serif'; c.textAlign='center'; c.fillText(String(level),30,-4); }
  c.restore();
}
