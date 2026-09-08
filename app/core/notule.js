// LES NOTES DE TERRAIN. La seule chose que ce jeu peut faire et qu'aucun autre ne peut faire.
//
// Idée : le Codex parle du monde, mais il ne parle jamais de TOI. Or l'app connaît déjà chaque
// journée en détail — pas, sommeil, méditation, devis signés — et les envoie déjà dans Notion.
// Il suffit de les relire dans la voix du monde, comme un naturaliste annote une planche :
//
//   « Le 14 mars, la Lignée a parcouru 41 kilomètres. Ses membres se sont allongés. »
//
// C'est la notule de Spore, appliquée à une vie réelle. Deux règles, non négociables :
//   1. on ne commente QUE ce qui sort de l'ordinaire (comparaison à la médiane des 14 derniers
//      jours), sinon c'est un journal de bord, pas une observation ;
//   2. on ne reproche RIEN. Un chiffre bas produit une note différente, jamais un jugement —
//      la doctrine du projet est zéro culpabilité, et elle s'applique surtout ici.
import { state } from './state.js';
import { config } from './config.js';
import { typicalDay } from './economy.js';
import { makeRng } from './rng.js';
import { fmtDay } from './clock.js';

const num = (v) => (typeof v === 'number' ? v : Number(v) || 0);

// Chaque observation : un champ, un seuil, et deux voix — au-dessus, en dessous. Jamais de
// troisième voix « normal » : l'ordinaire ne se commente pas.
const OBS = [
  { id: 'pas', seuil: 0.35, val: (v) => num(v),
    haut: (v) => [`elle a parcouru ${(v / 1250).toFixed(1)} kilomètres`, `le territoire s'est agrandi jusqu'au soir`, `ses membres ont travaillé toute la journée`],
    bas: () => ['elle est restée près du Cœur', 'le territoire s\'est resserré autour d\'elle', 'elle a peu quitté son abri'],
    effet_haut: 'Ses membres se sont allongés.', effet_bas: 'Elle a économisé ce qu\'elle avait.' },
  { id: 'sport', seuil: 0.5, val: (v) => num(v),
    haut: (v) => [`elle a poussé son corps ${Math.round(v)} minutes durant`, 'quelque chose en elle a demandé l\'effort', 'elle a cherché la limite, et l\'a trouvée'],
    bas: () => ['elle a laissé le corps tranquille', 'le corps a eu sa journée de calme'],
    effet_haut: 'La masse a répondu.', effet_bas: 'Le repos aussi construit.' },
  { id: 'sommeil', seuil: 0.18, val: (v) => num(v),
    haut: (v) => [`elle a dormi ${v.toFixed(1)} heures d'affilée`, 'la nuit a été longue et pleine'],
    bas: (v) => [`la nuit n'a duré que ${v.toFixed(1)} heures`, 'la veille a mordu sur le sommeil'],
    effet_haut: 'La carapace s\'est refaite.', effet_bas: 'Elle a puisé dans ses réserves.' },
  // Pas de branche basse : « elle n'a pas médité » est un reproche déguisé, et le projet n'en
  // fait aucun. Le silence sur un jour sans est lui-même une position.
  { id: 'meditation', seuil: 0.5, val: (v) => num(v),
    haut: (v) => [`elle est restée immobile ${Math.round(v)} minutes, sans raison utile`, 'elle a cessé de chercher, un moment', 'elle s\'est tenue tranquille assez longtemps pour entendre le fond'],
    bas: () => [],
    effet_haut: 'Le crâne s\'est élargi d\'un rien.', effet_bas: '' },
  { id: 'eau', seuil: 0.45, val: (v) => num(v),
    haut: () => ['elle a bu comme si l\'eau allait manquer', 'elle a fait ses réserves'],
    bas: () => ['la membrane est restée sèche'],
    effet_haut: 'La membrane s\'est tendue.', effet_bas: '' },
  { id: 'magic_focus', seuil: 0.4, val: (v) => num(v),
    haut: (v) => [`elle a façonné ${Math.round(v)} heures durant`, 'l\'ouvrage a occupé toute la lumière du jour'],
    bas: () => ['l\'ouvrage a attendu'],
    effet_haut: 'La Colonie a produit davantage.', effet_bas: '' },
  { id: 'chantier', seuil: 0.5, val: (v) => num(v),
    haut: (v) => [`elle a bâti ${Math.round(v)} heures durant`, 'elle a déplacé de la matière, longtemps'],
    bas: () => [], effet_haut: 'Quelque chose tient debout qui ne tenait pas.', effet_bas: '' },
  { id: 'devis_signe', seuil: 0.01, val: (v) => num(v),
    haut: (v) => [v > 1 ? `${Math.round(v)} liens se sont noués` : 'un lien s\'est noué'],
    bas: () => [], effet_haut: 'La Lignée s\'est agrandie sans naître.', effet_bas: '' }
];

// Les fins de phrase : elles disent l'effet sur la créature, jamais la valeur du geste.
function frag(rng, arr) { const a = (arr || []).filter(Boolean); return a.length ? rng.pick(a) : null; }

// La note d'une journée. Renvoie null si le jour n'a rien de remarquable — et c'est très bien :
// une note tous les deux ou trois jours vaut mieux qu'une note quotidienne qu'on cesse de lire.
export function notuleFor(key) {
  const rec = state.days?.[key];
  if (!rec?.submittedAt) return null;
  const med = typicalDay(14);
  const e = rec.entries || {};
  const rng = makeRng('notule:' + key);

  const cands = [];
  for (const o of OBS) {
    const v = o.val(e[o.id]);
    const m = med ? o.val(med[o.id]) : 0;
    if (!v && !m) continue;
    if (!m) { if (v > 0 && o.id === 'devis_signe') cands.push({ o, v, ecart: 1, sens: 1 }); continue; }
    const ecart = (v - m) / m;
    if (Math.abs(ecart) < o.seuil) continue;
    // Deux corrections de tri, apprises en lisant les premieres notes :
    //   - une valeur nulle donne toujours un ecart de 100 % et rafle toutes les notes ; on la pese
    //     moins fort, sinon le journal ne raconte que des absences ;
    //   - a ecart egal, ce qui a ete fait passe avant ce qui ne l'a pas ete.
    let poids = Math.abs(ecart);
    if (v === 0) poids *= 0.45;
    if (ecart < 0) poids *= 0.75;
    if (!(o.bas(v) || []).length && ecart < 0) continue;      // pas de branche basse : on se tait
    cands.push({ o, v, ecart: poids, sens: Math.sign(ecart) });
  }
  // Un moment fort écrit à la main bat n'importe quelle statistique.
  const fort = (e.moment_fort || '').trim();
  if (!cands.length && !fort) return null;

  cands.sort((a, b) => b.ecart - a.ecart);
  // Deux jours de suite la meme observation, et on cesse de la lire. On penalise le champ de la veille.
  const veille = lastField(key);
  if (veille && cands.length > 1 && cands[0].o.id === veille) { const t = cands[0]; cands[0] = cands[1]; cands[1] = t; }
  const pick = cands[0];
  FIELD_OF[key] = pick?.o.id || null;
  const date = fmtDay(key, { day: 'numeric', month: 'long' });
  let corps = null, effet = '';
  if (pick) {
    corps = frag(rng, pick.sens > 0 ? pick.o.haut(pick.v) : pick.o.bas(pick.v));
    effet = pick.sens > 0 ? pick.o.effet_haut : pick.o.effet_bas;
  }
  if (!corps && fort) { corps = 'elle a gardé une chose de cette journée'; effet = `« ${fort} »`; }
  if (!corps) return null;

  // Une deuxième observation, seulement si elle est nette et d'un autre axe. Deux faits font une
  // observation ; trois font un rapport, et un rapport ne se lit pas.
  const second = cands.find(c => c !== pick && c.ecart > 0.6);
  const suite = second ? ' ' + capital(frag(rng, second.sens > 0 ? second.o.haut(second.v) : second.o.bas(second.v)) || '') + '.' : '';

  return `Le ${date}, ${corps}.${suite}${effet ? ' ' + effet : ''}`;
}
function capital(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
// Memoire courte : quel champ a servi pour quel jour, pour eviter deux notes jumelles d'affilee.
const FIELD_OF = {};
function lastField(key) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return FIELD_OF[d.toISOString().slice(0, 10)] || null;
}

// Les dernières notes, pour le Journal de terrain du Codex.
export function dernieresNotules(n = 12) {
  const keys = Object.keys(state.days || {}).filter(k => state.days[k]?.submittedAt).sort().reverse();
  const out = [];
  for (const k of keys) {
    if (out.length >= n) break;
    const t = notuleFor(k);
    if (t) out.push({ key: k, text: t });
  }
  return out;
}
