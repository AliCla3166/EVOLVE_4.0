// Fonction serverless Vercel : le pont entre le jeu et la Chronique des Jours (Notion).
// Le token Notion ne vit QUE dans les variables d'environnement Vercel (NOTION_TOKEN), jamais dans l'app.
// GET  -> verifie la connexion (titre de la base).
// POST -> upsert d'un jour (payload construit par app/core/sync.js). Cree les proprietes manquantes
//         pour tout champ ajoute au brief (habits.json) : un nouveau champ = une nouvelle colonne, automatiquement.
const NOTION_VERSION = '2025-09-03';
const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || '0c0db707-8a43-4956-853e-fde2e5b6699f';

// Correspondance id de champ (habits.json) -> nom de propriete Notion. Un champ absent d'ici est cree a la volee sous son label.
const FIELD_MAP = {
  pas: 'Pas', sport: 'Sport (min)', sommeil: 'Sommeil (h)', poids: 'Poids (kg)', repas: 'Repas', eau: 'Eau (verres)', meditation: 'Méditation (min)', rituels: 'Rituels', humeur: 'Humeur',
  magic_focus: 'Magic Focus (h)', chantier: 'Chantier (h)', devis_demande: 'Devis demandés', devis_signe: 'Devis signés', commentaire: 'Commentaire', moment_fort: 'Moment fort'
};
const AXES = { vigueur: 'Vigueur', robustesse: 'Robustesse', esprit: 'Esprit', ingeniosite: 'Ingéniosité', lien: 'Lien', ombre: 'Ombre' };

async function notion(path, method = 'GET', body) {
  const res = await fetch('https://api.notion.com/v1' + path, { method, headers: { 'Authorization': `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Notion ${res.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const rt = (s) => ({ rich_text: s ? [{ text: { content: String(s).slice(0, 1900) } }] : [] });
const num = (v) => ({ number: (v === undefined || v === null || v === '' || isNaN(Number(v))) ? null : Number(v) });

function propFor(field, value, schema) {
  const name = FIELD_MAP[field.id] || field.label;
  const existing = schema[name];
  const type = existing?.type;
  switch (field.type) {
    case 'multi': return [name, { multi_select: (Array.isArray(value) ? value : []).map(n => ({ name: String(n).slice(0, 90) })) }, 'multi_select'];
    case 'text': return [name, rt(value), 'rich_text'];
    case 'toggle': return [name, { checkbox: !!value }, 'checkbox'];
    case 'calories': return null; // gere a part (2 colonnes)
    default: {
      if (type === 'rich_text') return [name, rt(value), 'rich_text'];
      return [name, num(value), 'number'];
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Evolve-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN manquant dans les variables d\'environnement Vercel' });
  if (process.env.EVOLVE_SYNC_SECRET && req.headers['x-evolve-key'] !== process.env.EVOLVE_SYNC_SECRET) return res.status(401).json({ error: 'Clé de synchronisation invalide' });
  try {
    const ds = await notion(`/data_sources/${DATA_SOURCE_ID}`);
    if (req.method === 'GET') return res.status(200).json({ ok: true, database: ds.title?.[0]?.plain_text || 'Chronique des Jours', properties: Object.keys(ds.properties || {}).length });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non supportée' });
    const p = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!p?.date) return res.status(400).json({ error: 'date manquante' });
    const schema = ds.properties || {};
    // 1. Proprietes manquantes -> creees a la volee
    const missing = {};
    for (const f of p.fields || []) {
      if (f.type === 'calories') continue;
      const name = FIELD_MAP[f.id] || f.label;
      if (schema[name]) continue;
      const t = f.type === 'multi' ? 'multi_select' : f.type === 'text' ? 'rich_text' : f.type === 'toggle' ? 'checkbox' : 'number';
      missing[name] = { [t]: {} };
    }
    if (Object.keys(missing).length) { await notion(`/data_sources/${DATA_SOURCE_ID}`, 'PATCH', { properties: missing }); Object.assign(schema, Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, { type: Object.keys(v)[0] }]))); }
    // 2. Proprietes
    const props = {
      'Jour': { title: [{ text: { content: p.date } }] }, 'Date': { date: { start: p.date } },
      'Élan': num(p.elan), 'Série': num(p.streak), 'Bonus série %': num(p.streakBonusPct),
      'Piliers': { multi_select: (p.pillars || []).map(n => ({ name: n })) }, 'Journée parfaite': { checkbox: !!p.perfect }, 'Retard': { checkbox: !!p.late }, 'Bouclier': { checkbox: !!p.shieldUsed }, 'Manqué': { checkbox: !!p.missed },
      'Stade': num(p.stage), 'Nom du stade': p.stageName ? { select: { name: p.stageName } } : { select: null }, 'Cycle': num(p.cycle), 'Mutations': num(p.mutations),
      'Détails': rt(JSON.stringify({ entries: p.entries, breakdown: p.breakdown, axisPoints: p.axisPoints, species: p.speciesName })),
      'Synchronisé le': { date: { start: new Date().toISOString() } }
    };
    for (const [ax, name] of Object.entries(AXES)) if (schema[name]) props[name] = num(p.axes?.[ax]);
    for (const f of p.fields || []) {
      const v = p.entries?.[f.id];
      if (f.type === 'calories') { if (schema['Kcal dépensées']) props['Kcal dépensées'] = num(v?.depense); if (schema['Kcal mangées']) props['Kcal mangées'] = num(v?.mange); continue; }
      const r = propFor(f, v, schema); if (!r) continue;
      const [name, val] = r; if (schema[name]) props[name] = val;
    }
    // 3. Upsert par titre (Jour)
    const q = await notion(`/data_sources/${DATA_SOURCE_ID}/query`, 'POST', { filter: { property: 'Jour', title: { equals: p.date } }, page_size: 1 });
    let page;
    if (q.results?.length) page = await notion(`/pages/${q.results[0].id}`, 'PATCH', { properties: props });
    else page = await notion('/pages', 'POST', { parent: { type: 'data_source_id', data_source_id: DATA_SOURCE_ID }, icon: { type: 'emoji', emoji: p.perfect ? '🌟' : p.missed ? '🌑' : '📖' }, properties: props });
    return res.status(200).json({ ok: true, id: page.id, url: page.url, created: !q.results?.length });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
