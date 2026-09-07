// LES ICÔNES. Bible de Wallachie, §9 : « on ne dessine jamais un emoji ».
//
// Pourquoi ce fichier existe : l'interface portait 83 glyphes emoji différents, 277 occurrences.
// Un emoji n'est pas un dessin, c'est le dessin de quelqu'un d'autre — il change de style selon
// le téléphone, il ne respecte aucune palette, et il fait lire « application » là où on veut
// lire « jeu ». C'était le dernier élément vraiment bon marché de l'écran.
//
// Le système : une grille de 24×24, des formes géométriques simples, et UN contour d'encre posé
// par `paint-order: stroke` — donc l'encre est peinte SOUS l'aplat et déborde à l'extérieur.
// C'est exactement la grammaire des créatures (silhouette fermée, contour unique, aplats francs),
// obtenue ici en une ligne de SVG au lieu d'un tracé par icône.
//
// Format d'une icône : une liste de formes, chacune
//   ['c', cx, cy, r, couleur]                cercle
//   ['e', cx, cy, rx, ry, rot, couleur]      ellipse
//   ['r', x, y, w, h, rx, couleur]           rectangle arrondi
//   ['p', 'd', couleur]                      chemin
//   ['l', 'd', couleur?, largeur?]           trait par-dessus, sans remplissage (rainures)
const INK = '#171B23';
// La palette du jeu, et rien d'autre. Une icône qui a besoin d'une sixième couleur est mal pensée.
const C = {
  or: '#FFC24B', ord: '#C98F1E', vert: '#45D95E', rouge: '#EF5D50', bleu: '#4EA8E8',
  violet: '#A76BD9', craie: '#F4F1E8', craied: '#C9C5B8', ambre: '#E0A045', terre: '#C97A3E',
  gris: '#8B8C86', nuit: '#2C3440', sombre: '#6B5B8C', vertd: '#2E8C46', chair: '#EFA98C'
};

const disc = (f) => ['c', 12, 12, 9, f];

export const ICONS = {
  // ---- monnaies -----------------------------------------------------------
  // L'Élan est vert : la charte réserve #45D95E à la vie réelle, et l'Élan EST la vie réelle.
  elan: [['p', 'M14.5 1.5 L5 13.5 h5 L9.5 22.5 L19 10.5 h-5 z', C.vert]],
  genes: [['p', 'M6.5 2 h4 l1.5 6.2 L13.5 2 h4 l-3.2 10 L17.5 22 h-4 l-1.5-6.2 L10.5 22 h-4 l3.2-10 z', C.violet]],
  biomasse: [['e', 12, 13.5, 8.5, 6.5, 0, C.ambre], ['e', 9, 11, 2.6, 1.7, -0.5, C.or]],
  materiaux: [['r', 2.5, 12.5, 8.5, 6, 1, C.terre], ['r', 13, 12.5, 8.5, 6, 1, C.terre],
              ['r', 7.5, 5.5, 9, 6, 1, '#DE9358']],
  rubis: [['p', 'M12 2.5 L20.5 9 L12 21.5 L3.5 9 z', C.bleu], ['p', 'M12 2.5 L20.5 9 H3.5 z', '#7FC6F2']],
  essence: [['p', 'M11 2 L12.8 8.4 L19.5 10.2 L12.8 12 L11 18.5 L9.2 12 L2.5 10.2 L9.2 8.4 z', C.craie],
            ['p', 'M18.5 15 l1 3 l3 1 l-3 1 l-1 3 l-1-3 l-3-1 l3-1 z', C.craied]],

  // ---- les six axes du génome --------------------------------------------
  vigueur: [['p', 'M12 2 L21 10.5 h-5.5 L12 7 L8.5 10.5 H3 z', C.rouge],
            ['p', 'M12 11 L21 19.5 h-5.5 L12 16 L8.5 19.5 H3 z', C.rouge]],
  robustesse: [['p', 'M12 2 c5.5 0 9.5 3.5 9.5 8.5 V15 c0 3.5-4 6.5-9.5 6.5 S2.5 18.5 2.5 15 v-4.5 C2.5 5.5 6.5 2 12 2 z', C.ambre],
               ['l', 'M3 11 c3.5 2 14.5 2 18 0', INK, 1.8], ['l', 'M3.5 16 c3.5 2 13.5 2 17 0', INK, 1.8]],
  esprit: [['p', 'M12 2.5 c-3.6 0-6.2 1.6-7.2 3.6 C2.6 6.8 1.5 8.6 2.3 10.6 c-1 1.7-.7 3.9 .9 5.2 c.2 3 2.7 5.4 5.6 5.4 H12 z', C.violet],
           ['p', 'M12 2.5 c3.6 0 6.2 1.6 7.2 3.6 c2.2 .7 3.3 2.5 2.5 4.5 c1 1.7 .7 3.9-.9 5.2 c-.2 3-2.7 5.4-5.6 5.4 H12 z', '#BE8BE4'],
           ['l', 'M12 3 v18', INK, 1.5]],
  ingeniosite: [['p', 'M17.5 2.5 a5.5 5.5 0 0 0-7 7 L3 17 l4 4 l7.5-7.5 a5.5 5.5 0 0 0 7-7 l-3.2 3.2 l-3.5-.5 l-.5-3.5 z', C.bleu]],
  lien: [['p', 'M9 5.5 a5.5 5.5 0 1 0 0 11 a5.5 5.5 0 1 0 0-11 z m0 3.4 a2.1 2.1 0 1 1 0 4.2 a2.1 2.1 0 1 1 0-4.2 z', C.vert],
         ['p', 'M15 5.5 a5.5 5.5 0 1 0 0 11 a5.5 5.5 0 1 0 0-11 z m0 3.4 a2.1 2.1 0 1 1 0 4.2 a2.1 2.1 0 1 1 0-4.2 z', C.vertd]],
  // L'Ombre est nocturne, pas maléfique (loi VI) : un croissant, jamais un crâne.
  ombre: [disc(C.sombre), ['c', 8.5, 10, 6.5, C.nuit]],

  // ---- le corps ------------------------------------------------------------
  pas: [['e', 9.5, 14, 6, 7.5, -0.14, C.craie],
        ['c', 15.5, 6, 2.5, C.craie], ['c', 19, 9.5, 2.2, C.craie], ['c', 20.5, 14, 1.9, C.craied]],
  sport: [['c', 14, 4.5, 2.6, C.chair],
          ['p', 'M13 8 l-4 3 l1 4 l-4 6 h3 l4-5 l-.5-3 l3 2 v6 h3 v-7 l-4-3 l1-3 z', C.rouge]],
  sommeil: [['p', 'M20 15.5 A9 9 0 0 1 8.5 4 a9.5 9.5 0 1 0 11.5 11.5 z', C.violet]],
  poids: [['r', 10.7, 6, 2.6, 13.5, .8, C.gris], ['r', 5.5, 19, 13, 3.2, 1.2, C.gris],
          ['r', 2.5, 6.4, 19, 2.6, 1.3, C.craied],
          ['p', 'M3.5 9.5 h5.5 L6.25 15.5 z', C.craie], ['p', 'M15 9.5 h5.5 L17.75 15.5 z', C.craie],
          ['c', 12, 4, 2.2, C.or]],
  calories: [['p', 'M12 1.5 c4 4.5 7 7 7 11.5 a7 7 0 0 1-14 0 c0-3 1.5-5 3.5-7 c.5 2 1.5 3 2.5 3.5 c-.5-3 0-6 1-8 z', C.rouge],
             ['p', 'M12 12 c2 2 3 3.5 3 5 a3 3 0 0 1-6 0 c0-1.5 1-3 3-5 z', C.or]],
  repas: [['p', 'M2.5 11 h19 a9.5 9.5 0 0 1-19 0 z', C.craie],
          ['e', 9, 8.5, 3.6, 2.6, -0.35, C.vert], ['e', 15, 9, 3, 2.2, 0.4, C.vertd]],
  hydratation: [['p', 'M12 1.5 c4.5 5.5 7 8.5 7 12 a7 7 0 0 1-14 0 c0-3.5 2.5-6.5 7-12 z', C.bleu],
                ['e', 9.5, 15, 1.7, 2.4, -0.3, '#9BD3F5']],
  meditation: [['c', 12, 5, 2.8, C.chair],
               ['p', 'M12 9 c-3 0-5 2-5.5 5 l-4 3.5 h4.5 c1 2 3 3 5 3 s4-1 5-3 h4.5 l-4-3.5 c-.5-3-2.5-5-5.5-5 z', C.violet]],
  rituels: [['r', 9.5, 9, 5, 12.5, 1.4, C.craie], ['l', 'M12 9 v-2', INK, 2],
            ['p', 'M12 1.5 c2 2.5 2.6 3.5 2.6 5 a2.6 2.6 0 0 1-5.2 0 c0-1.5 .6-2.5 2.6-5 z', C.or]],
  humeur: [['c', 15.5, 8, 5, C.or],
           ['p', 'M6 20 a4.5 4.5 0 0 1-1-8.9 a5.5 5.5 0 0 1 10.4 1.4 a3.9 3.9 0 0 1-1.4 7.5 z', C.craie]],

  // ---- le travail ----------------------------------------------------------
  magicfocus: [['r', 2.5, 9, 19, 12.5, 2, C.nuit],
               ['p', 'M2.5 3 l17-1.5 l2 5.5 l-17 1.5 z', C.craie],
               ['l', 'M8 2.6 l1.6 5.2 M14 2 l1.6 5.2', INK, 1.6]],
  chantier: [['p', 'M3 21.5 L11 2.5 h2 l8 19 z', C.or], ['l', 'M6.5 14.5 h11', INK, 1.8],
             ['r', 10, 2, 4, 3.5, 1, C.terre]],
  devis: [['r', 2.5, 5, 19, 14, 2, C.craie], ['p', 'M2.5 6 L12 13.5 L21.5 6', INK, 2],
          ['l', 'M2.5 6 L12 13.5 L21.5 6', INK, 2]],
  signe: [['p', 'M3 21 l1.5-5 L16 4.5 l3.5 3.5 L8 19.5 z', C.or],
          ['p', 'M16 4.5 l2-2 l3.5 3.5 l-2 2 z', C.craied], ['l', 'M4.5 16 l3.5 3.5', INK, 1.5]],
  memoire: [['p', 'M2.5 4.5 c3.5-1.5 6.5-1.5 9.5 1 v15 c-3-2.5-6-2.5-9.5-1 z', C.craie],
            ['p', 'M21.5 4.5 c-3.5-1.5-6.5-1.5-9.5 1 v15 c3-2.5 6-2.5 9.5-1 z', C.craied]],
  commentaire: [['p', 'M3 4 h18 a1.5 1.5 0 0 1 1.5 1.5 v10 a1.5 1.5 0 0 1-1.5 1.5 H10 l-5 4.5 V17 H3 a1.5 1.5 0 0 1-1.5-1.5 v-10 A1.5 1.5 0 0 1 3 4 z', C.bleu]],
  moment: [['p', 'M12 1.5 l3 6.8 l7.4 .6 l-5.6 4.9 l1.7 7.2 L12 17.2 L5.5 21 l1.7-7.2 L1.6 8.9 l7.4-.6 z', C.or]],

  // ---- les dix âges --------------------------------------------------------
  cellule: [['e', 11, 11, 8, 7.5, 0, '#3FB8C9'], ['c', 11, 11, 3, '#1E6E7A'],
            ['l', 'M18.5 15 c2 2 2.5 4 1.5 6', INK, 1.8]],
  colonie: [['c', 8, 9, 5, '#5CC98A'], ['c', 15.5, 8, 4, '#5CC98A'], ['c', 12, 16, 5, '#3E9E68']],
  creature: [['e', 12, 15.5, 5, 4.2, 0, '#8FC54A'], ['e', 6, 8, 2.4, 3, -0.4, '#8FC54A'],
             ['e', 18, 8, 2.4, 3, 0.4, '#8FC54A'], ['e', 10, 4.5, 2.2, 2.8, -0.15, '#8FC54A'],
             ['e', 15, 4.5, 2.2, 2.8, 0.15, '#8FC54A']],
  meute: [['p', 'M12 1.5 c4 4.5 7 7 7 11.5 a7 7 0 0 1-14 0 c0-3 1.5-5 3.5-7 c.5 2 1.5 3 2.5 3.5 c-.5-3 0-6 1-8 z', C.ambre],
          ['p', 'M12 12 c2 2 3 3.5 3 5 a3 3 0 0 1-6 0 c0-1.5 1-3 3-5 z', C.or]],
  cite: [['r', 2, 10, 9.5, 11.5, 1, '#D9B36A'], ['r', 12.5, 5, 9.5, 16.5, 1, '#B8934E'],
         ['r', 4.5, 13.5, 4.5, 4.5, .7, C.nuit], ['r', 15, 9, 4.5, 5, .7, C.nuit]],
  planetaire: [disc('#4EA8E8'), ['p', 'M3.5 9.5 c4 2 8 2 12 0 c2-1 4-1 5.5 0', INK, 1.6],
               ['l', 'M3.5 9.5 c4 2 8 2 12 0 c2-1 4-1 5.5 0 M3.5 15 c4-2 8-2 12 0 c2 1 4 1 5.5 0', INK, 1.6],
               ['l', 'M12 3 c-3 4-3 14 0 18 M12 3 c3 4 3 14 0 18', INK, 1.4]],
  stellaire: [['p', 'M12 1.5 c3.5 3.5 5 8 5 12 l-2.5 3 h-5 l-2.5-3 c0-4 1.5-8.5 5-12 z', C.craie],
              ['p', 'M7 12 L3.5 18 l4-1.5 z M17 12 l3.5 6 l-4-1.5 z', '#5B8FC7'],
              ['c', 12, 9, 2.2, '#5B8FC7']],
  galactique: [disc(C.nuit), ['p', 'M12 4 c5 0 8 3.5 6 7 c-1.5 2.5-5 3-7 1.5 c-1.5-1-1-3 .5-3.5 M12 20 c-5 0-8-3.5-6-7 c1.5-2.5 5-3 7-1.5 c1.5 1 1 3-.5 3.5', '#A76BD9', 2.4],
               ['l', 'M12 4 c5 0 8 3.5 6 7 c-1.5 2.5-5 3-7 1.5 M12 20 c-5 0-8-3.5-6-7 c1.5-2.5 5-3 7-1.5', '#A76BD9', 2.6],
               ['c', 12, 12, 1.8, C.craie]],
  transcendance: [disc('#D8407A'), ['c', 9.5, 9.5, 3, '#F07AA6'], ['c', 15, 15, 2, '#8C2A50']],
  divinite: [['p', 'M12 1.5 L14.3 9.7 L22.5 12 L14.3 14.3 L12 22.5 L9.7 14.3 L1.5 12 L9.7 9.7 z', '#F0E4B8'],
             ['c', 12, 12, 2.8, '#FFF8DC']],

  // ---- la bataille ---------------------------------------------------------
  hp: [['p', 'M12 21 C4 15 1.5 11 1.5 7.8 A5.3 5.3 0 0 1 12 6 A5.3 5.3 0 0 1 22.5 7.8 C22.5 11 20 15 12 21 z', C.rouge]],
  soin: [['p', 'M9.5 2.5 h5 v6.5 h6.5 v5 H14.5 v6.5 h-5 V14 H3 V9 h6.5 z', C.vert]],
  melee: [['p', 'M12 1.5 L14.8 5.5 V14 h-5.6 V5.5 z', C.craie],
          ['r', 5.5, 14, 13, 2.8, 1.2, C.terre], ['r', 10.4, 16.6, 3.2, 3.4, .8, C.terre],
          ['c', 12, 21, 2, C.or]],
  portee: [disc('none'), ['c', 12, 12, 9, C.craie], ['c', 12, 12, 5.5, C.rouge], ['c', 12, 12, 2, C.craie]],
  vitesse: [['p', 'M2 4.5 l6.5 7.5 L2 19.5 h4.6 L13.1 12 L6.6 4.5 z', C.bleu],
            ['p', 'M11 4.5 l6.5 7.5 L11 19.5 h4.6 L22.1 12 L15.6 4.5 z', '#7FC6F2']],
  intervalle: [['c', 12, 13.5, 8.5, C.craie], ['r', 9.5, 1.5, 5, 3, 1, C.nuit],
               ['l', 'M12 13.5 V8.5 M12 13.5 l3.5 2.5', INK, 2]],
  tank: [['p', 'M12 2 l9 3 v7 c0 5-4 8.5-9 10.5 C7 20.5 3 17 3 12 V5 z', C.craied], ['c', 12, 11, 3, C.bleu]],
  distance: [['p', 'M5 3 a17 17 0 0 1 0 18 a12 12 0 0 0 0-18 z', C.terre],
             ['l', 'M5.5 3.5 C13 8 13 16 5.5 20.5', C.craie, 1.6], ['l', 'M9 12 h11 M20 12 l-3-2.5 M20 12 l-3 2.5', C.craie, 1.8]],
  tourelle: [['p', 'M6 21.5 L8 10 h8 l2 11.5 z', C.gris], ['r', 8.5, 5, 7, 5, 1, C.craied],
             ['l', 'M12 5 V1.5', INK, 2], ['c', 12, 1.5, 1.6, C.or]],
  piege: [['p', 'M2.5 2.5 h19 v4.2 L19.1 10.2 L16.7 6.7 L14.3 10.2 L11.9 6.7 L9.5 10.2 L7.1 6.7 L4.7 10.2 L2.5 6.7 z', C.gris],
          ['p', 'M2.5 21.5 h19 v-4.2 L19.1 13.8 L16.7 17.3 L14.3 13.8 L11.9 17.3 L9.5 13.8 L7.1 17.3 L4.7 13.8 L2.5 17.3 z', C.craied]],
  meteore: [['p', 'M14.5 9 L1.5 22.5 L4.5 13.5 z', C.or], ['c', 16, 8, 5.4, C.rouge],
            ['c', 14, 6.2, 1.9, '#FF9C90']],
  gel: [['l', 'M12 2 v20 M3.5 7 l17 10 M20.5 7 l-17 10', '#9BD3F5', 2.6],
        ['l', 'M12 6 l-3-2.5 M12 6 l3-2.5 M12 18 l-3 2.5 M12 18 l3 2.5', '#9BD3F5', 2.2],
        ['c', 12, 12, 2.4, C.bleu]],
  couronne: [['p', 'M2.5 8 L7 12.5 L12 4 l5 8.5 L21.5 8 l-1.5 11 H4 z', C.or], ['l', 'M4.5 16 h15', C.ord, 1.6]],
  // « Soif de sang » : la bible interdit de dessiner du sang. On dessine le croc.
  croc: [['p', 'M6 3 h12 l-2 6 c-1 3-2.5 5-4 12 c-1.5-7-3-9-4-12 z', C.craie]],

  // ---- instincts et divers -------------------------------------------------
  carapace: [['p', 'M12 21.5 C5 21.5 2 16 2.5 10.5 C3 5.5 7 2.5 12 2.5 s9 3 9.5 8 C22 16 19 21.5 12 21.5 z', C.terre],
             ['l', 'M12 3 v18 M4 8 c5 3 11 3 16 0 M3 14 c6 3 12 3 18 0', INK, 1.5]],
  feuille: [['p', 'M21 3 C9 3 3 8 3 14.5 c0 3 1.5 5 3 6.5 C8 15 12 11 19 9 c-5 3.5-8 7-9.5 12 c7 1 12.5-4 12.5-11 z', C.ambre]],
  spirale: [['l', 'M12 12 m0 0 c0-2.5 2-4 4-3 s3 4 1 6.5 s-6 3-8.5 0 s-2-8 2-10 s10-1.5 12.5 3', C.violet, 2.4]],
  chaine: [['p', 'M9 15 l6-6', INK, 2.6], ['l', 'M9.5 14.5 l5-5', C.craied, 2.6],
           ['p', 'M7 17 a4 4 0 0 1-5.5-5.5 l3-3 a4 4 0 0 1 5.5 0 l-2 2 a1.6 1.6 0 0 0-2.2 0 l-2.3 2.3 a1.6 1.6 0 0 0 2.2 2.2 z', C.vert],
           ['p', 'M17 7 a4 4 0 0 1 5.5 5.5 l-3 3 a4 4 0 0 1-5.5 0 l2-2 a1.6 1.6 0 0 0 2.2 0 l2.3-2.3 a1.6 1.6 0 0 0-2.2-2.2 z', C.vert]],
  chantiers: [['r', 3.5, 3, 17, 5.4, 1.4, C.gris], ['r', 10.3, 8, 3.4, 13.5, 1, C.terre]],
  codex: [['p', 'M5 2.5 h11 a3 3 0 0 1 3 3 v16 H8 a3 3 0 0 1-3-3 z', C.craie],
          ['p', 'M5 2.5 a3 3 0 0 0 0 6 h3 V2.5 z', C.craied], ['l', 'M11 9 h5 M11 13 h5', C.gris, 1.6]],
  stats: [['r', 2.5, 13, 5, 8.5, 1, C.bleu], ['r', 9.5, 7, 5, 14.5, 1, C.vert], ['r', 16.5, 10, 5, 11.5, 1, C.or]],
  reglages: [['p', 'M12 1.5 l2 3 h3.5 l1 3.5 l3 2 l-1.5 3.5 l1.5 3.5 l-3 2 l-1 3.5 H14 l-2 3 l-2-3 H6.5 l-1-3.5 l-3-2 L4 13.5 L2.5 10 l3-2 l1-3.5 H10 z', C.gris],
             ['c', 12, 12, 3.4, C.nuit]],
  cartes: [['p', 'M3.5 7 L11 4 l1.5 3.8 l-7.5 3 z', C.craied],
           ['r', 8, 3, 12.5, 18, 2, C.craie],
           ['p', 'M14.2 7 L18 12 L14.2 17 L10.5 12 z', C.rouge]],
  pantheon: [['p', 'M12 1.5 L22 7 H2 z', C.craie], ['r', 4, 8.5, 3, 10, .8, C.craied],
             ['r', 10.5, 8.5, 3, 10, .8, C.craied], ['r', 17, 8.5, 3, 10, .8, C.craied],
             ['r', 1.5, 19, 21, 3, 1, C.craie]],
  trophee: [['p', 'M7 2.5 h10 v6 a5 5 0 0 1-10 0 z', C.or],
            ['p', 'M7 4 H3.5 v2 a4 4 0 0 0 4 4 M17 4 h3.5 v2 a4 4 0 0 1-4 4', C.ord, 2],
            ['r', 10, 13, 4, 4, .8, C.ord], ['r', 6.5, 18, 11, 3.5, 1, C.or]],
  calendrier: [['r', 2.5, 4.5, 19, 17, 2, C.craie], ['r', 2.5, 4.5, 19, 5, 2, C.rouge],
               ['l', 'M7.5 2 v4 M16.5 2 v4', INK, 2], ['r', 6, 13, 3.5, 3.5, .6, C.nuit]],
  pousse: [['p', 'M12 21.5 V10', INK, 2.4], ['l', 'M12 21.5 V11', C.terre, 2.6],
           ['p', 'M12 12 C12 6 8 3 3 3 c0 5 4 9 9 9 z', C.vert],
           ['p', 'M12.5 14 c0-4 3-6.5 7.5-6.5 c0 4-3.5 6.5-7.5 6.5 z', C.vertd]],
  jour: [['c', 12, 12, 5.5, C.or],
         ['l', 'M12 1.5 v3 M12 19.5 v3 M1.5 12 h3 M19.5 12 h3 M4.5 4.5 l2 2 M17.5 17.5 l2 2 M19.5 4.5 l-2 2 M6.5 17.5 l-2 2', C.or, 2.4]],
  nuit: [['p', 'M20 15.5 A9 9 0 0 1 8.5 4 a9.5 9.5 0 1 0 11.5 11.5 z', C.craied]],
  // Pas de crâne (bible §9) : une flamme éteinte.
  perte: [['p', 'M12 3 c3.5 4 6 6.5 6 10.5 a6 6 0 0 1-12 0 c0-2.5 1.5-4.5 3-6 z', C.nuit],
          ['l', 'M4 4 l16 16', C.rouge, 2.6]],
  camp: [['p', 'M12 4 L20 20 H4 z', C.vertd], ['p', 'M12 9 L17 20 H7 z', C.vert],
         ['r', 3, 20, 18, 2.5, 1, C.terre]],
  fleche: [['p', 'M3 10.5 h11 V6 l7 6 l-7 6 v-4.5 H3 z', C.craie]],
  monte: [['p', 'M12 2.5 L21 12 h-5 v9.5 H8 V12 H3 z', C.vert]],
  plus: [['p', 'M9.5 2.5 h5 v6.5 h6.5 v5 H14.5 v6.5 h-5 V14 H3 V9 h6.5 z', C.craie]],
  oui: [['p', 'M3 12.5 L9 18.5 L21 5.5', C.vert, 3.4], ['l', 'M3.5 12.5 L9 18 L20.5 6', C.vert, 3.4]],
  non: [['l', 'M5 5 L19 19 M19 5 L5 19', C.rouge, 3.2]],
  point: [['c', 12, 12, 6, C.vert]],
  pointg: [['c', 12, 12, 6, C.gris]],

  // ---- l'humeur du jour ----------------------------------------------------
  // Cinq jauges, pas cinq smileys : un disque et une courbe. Sans yeux, ca ne singe personne —
  // et ca reste lisible a 16 px, ce qu'un visage emoji n'est jamais.
  hum1: [disc(C.rouge), ['l', 'M7 16.5 c2.5-3.5 7.5-3.5 10 0', INK, 2.6]],
  hum2: [disc(C.ambre), ['l', 'M7 15.8 c2.5-1.8 7.5-1.8 10 0', INK, 2.6]],
  hum3: [disc(C.gris), ['l', 'M7 15 h10', INK, 2.6]],
  hum4: [disc('#8FC54A'), ['l', 'M7 13.6 c2.5 1.8 7.5 1.8 10 0', INK, 2.6]],
  hum5: [disc(C.vert), ['l', 'M6.5 12.6 c2.5 4 8.5 4 11 0', INK, 2.6]]
};

// ---------------------------------------------------------------------------
// Correspondance emoji → icône. Tout ce qui n'est pas ici reste tel quel : mieux vaut un emoji
// oublié qu'un trou dans l'interface.
// ---------------------------------------------------------------------------
export const EMOJI = {
  '⚡': 'elan', '🧬': 'genes', '🍖': 'biomasse', '🧱': 'materiaux', '💎': 'rubis', '✨': 'essence',
  '💪': 'vigueur', '🧠': 'esprit', '🔧': 'ingeniosite', '🤝': 'lien', '🌑': 'ombre',
  '👟': 'pas', '🏃': 'sport', '😴': 'sommeil', '⚖️': 'poids', '⚖': 'poids',
  '🔥': 'calories', '🥗': 'repas', '💧': 'hydratation', '🧘': 'meditation',
  '🕯️': 'rituels', '🕯': 'rituels', '🌤️': 'humeur', '🌤': 'humeur',
  '🎬': 'magicfocus', '🏗️': 'chantier', '🏗': 'chantier', '📨': 'devis', '✍️': 'signe', '✍': 'signe',
  '📖': 'memoire', '💬': 'commentaire', '⭐': 'moment', '🌟': 'moment',
  '🦠': 'cellule', '🫧': 'colonie', '🐾': 'creature', '🏘️': 'cite', '🏘': 'cite',
  '🌍': 'planetaire', '🚀': 'stellaire', '🌌': 'galactique', '🔮': 'transcendance',
  '❤️': 'hp', '❤': 'hp', '💚': 'soin', '✚': 'soin',
  '⚔️': 'melee', '⚔': 'melee', '🎯': 'portee', '💨': 'vitesse', '⏱️': 'intervalle', '⏱': 'intervalle',
  '🛡️': 'tank', '🛡': 'tank', '🏹': 'distance', '🪤': 'piege', '☄️': 'meteore', '☄': 'meteore',
  '❄️': 'gel', '❄': 'gel', '👑': 'couronne', '🩸': 'croc',
  '🐚': 'carapace', '🍂': 'feuille', '🌀': 'spirale', '🔗': 'chaine',
  '⚒️': 'chantiers', '⚒': 'chantiers', '📜': 'codex', '📊': 'stats', '⚙️': 'reglages', '⚙': 'reglages',
  '🃏': 'cartes', '🏛️': 'pantheon', '🏛': 'pantheon', '🏆': 'trophee', '📅': 'calendrier',
  '🌱': 'pousse', '☀️': 'jour', '☀': 'jour', '🌙': 'nuit', '💀': 'perte', '🏕️': 'camp', '🏕': 'camp',
  '→': 'fleche', '⬆️': 'monte', '⬆': 'monte', '➕': 'plus', '✓': 'oui', '✔': 'oui', '✕': 'non', '✖': 'non',
  '😞': 'hum1', '😕': 'hum2', '😐': 'hum3', '🙂': 'hum4', '😄': 'hum5',
  '🟢': 'point', '⚪': 'pointg', '💠': 'rubis', '★': 'moment', '✦': 'essence'
};

const NS = 'http://www.w3.org/2000/svg';
function el(n, a) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; }

// Construit le SVG d'une icône. `paint-order="stroke"` fait tout le travail : l'encre est peinte
// SOUS l'aplat, donc elle déborde vers l'extérieur — un contour, jamais un cerne.
export function svgIcon(name, size = 20) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  const s = el('svg', { viewBox: '0 0 24 24', width: size, height: size, class: 'ico', 'aria-hidden': 'true', focusable: 'false' });
  const g = el('g', { stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'paint-order': 'stroke' });
  for (const sh of shapes) {
    const k = sh[0];
    if (k === 'c') g.append(el('circle', { cx: sh[1], cy: sh[2], r: sh[3], fill: sh[4] }));
    else if (k === 'e') g.append(el('ellipse', { cx: sh[1], cy: sh[2], rx: sh[3], ry: sh[4], fill: sh[6], transform: `rotate(${(sh[5] || 0) * 57.3} ${sh[1]} ${sh[2]})` }));
    else if (k === 'r') g.append(el('rect', { x: sh[1], y: sh[2], width: sh[3], height: sh[4], rx: sh[5], fill: sh[6] }));
    else if (k === 'p') g.append(el('path', { d: sh[1], fill: sh[2] }));
    else if (k === 'l') g.append(el('path', { d: sh[1], fill: 'none', stroke: sh[2] || INK, 'stroke-width': sh[3] || 1.6, 'paint-order': 'normal' }));
  }
  s.append(g);
  return s;
}

// Rendu texte : les icônes sont aussi utilisées hors DOM (canvas, titres de notification).
// Là, on retombe sur le mot, jamais sur l'emoji.
export function stripEmoji(str) {
  return String(str).replace(RE, '').replace(/\s{2,}/g, ' ').trim();
}

// Toutes les clefs d'EMOJI, les plus longues d'abord (les séquences avec sélecteur de variante
// doivent gagner sur le caractère nu).
const RE = new RegExp(Object.keys(EMOJI).sort((a, b) => b.length - a.length)
  .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|\\uFE0F', 'g');

// Remplace, dans un arbre DOM déjà construit, chaque emoji connu par son icône. Un seul point
// d'entrée : aucun appel à réécrire dans les cinq modes.
export function iconify(root, size = 18) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && RE.test(n.nodeValue) && !n.parentElement?.closest?.('svg,input,textarea'))
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const todo = [];
  while (walker.nextNode()) todo.push(walker.currentNode);
  for (const node of todo) {
    const frag = document.createDocumentFragment();
    let last = 0; RE.lastIndex = 0; let m;
    const txt = node.nodeValue;
    while ((m = RE.exec(txt))) {
      if (m.index > last) frag.append(txt.slice(last, m.index));
      const name = EMOJI[m[0]];
      const svg = name ? svgIcon(name, size) : null;
      if (svg) frag.append(svg);          // sélecteur de variante seul : on l'avale
      last = m.index + m[0].length;
    }
    if (last < txt.length) frag.append(txt.slice(last));
    node.parentNode?.replaceChild(frag, node);
  }
}

// Surveille l'écran : tout ce que les modes rendent passe par le filtre, sans qu'ils le sachent.
let obs = null;
export function watch(root) {
  if (!root || obs) return;
  iconify(root);
  obs = new MutationObserver((muts) => {
    obs.disconnect();
    for (const mu of muts) for (const n of mu.addedNodes) {
      if (n.nodeType === 1) iconify(n);
      else if (n.nodeType === 3 && RE.test(n.nodeValue || '')) iconify(n.parentNode);
    }
    obs.observe(root, { childList: true, subtree: true });
  });
  obs.observe(root, { childList: true, subtree: true });
}
