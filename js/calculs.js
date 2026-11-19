// État et calculs sur les données, sans toucher au DOM. Réglages : config.js ; données : data.js.

/* ---------- état ---------- */
let zoneActive = null;                // zone sélectionnée (null = vue d'ensemble)
let maxNational = 0;                  // maximum de l'indicateur actif, toutes stations et situations
let tousAffiches = TOUS_PAR_DEFAUT;   // état de l'interrupteur « tous »

/* ---------- indicateurs (data/indicateurs.csv → INDICATEURS_LISTE, déjà triés par ordre) ---------- */
// proposés : les indicateurs actifs, plus les choisis même s'ils étaient désactivés dans le CSV
const INDICATEURS = Object.fromEntries(INDICATEURS_LISTE
  .filter(i => i.actif || INDICATEURS_CHOISIS.includes(i.id)).map(i => [i.id, i]));
if (!INDICATEURS[INDICATEUR_DEPART]) throw new Error(`INDICATEUR_DEPART inconnu : « ${INDICATEUR_DEPART} » (voir config.js)`);
const estChoisi = id => INDICATEURS_CHOISIS.includes(id);

/* ---------- accès aux valeurs et formats de l'indicateur actif ---------- */
const ind = () => INDICATEURS[INDICATEUR_ACTIF];
const titreInd = () => `${ind().libelle} (${ind().unite})`;
const dec = () => ind().decimales;
const f = v => fmt(v, dec());
const valeur = (st, cle) => st.valeurs[cle][INDICATEUR_ACTIF];
const stationDe = zone => STATIONS.find(s => s.zone === zone);

// stations où l'été observé dépasse / égale / n'atteint pas le scénario TRACC moyen
function comptage() {
  const r = { sup: [], egal: [], inf: [] };
  for (const st of STATIONS) {
    const d = valeur(st, CLE_OBSERVE) - valeur(st, CLE_TRACC);
    r[d > 0 ? "sup" : d < 0 ? "inf" : "egal"].push(st);
  }
  return r;
}

// maximum de l'indicateur actif : échelle commune à la carte et aux graphiques
const calculerMax = () => Math.max(...STATIONS.flatMap(st => SITUATIONS.map(s => valeur(st, s.cle))));
