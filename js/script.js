// Indicateurs proposés dans le sélecteur (clé = nom de colonne du CSV).
// Pour en ajouter un : compléter cet objet, rien d'autre à modifier.
const INDICATEURS = {
  nuits_20: {
    menu: "Nuits ≥ 20 °C",
    titre: "Nuits où la température reste ≥ 20 °C",
    sousTitre: "Nombre de nuits de l'été où la température ne descend pas sous 20 °C",
    unite: "nuits", observe: "observées",
  },
  nuits_24: {
    menu: "Nuits ≥ 24 °C",
    titre: "Nuits où la température reste ≥ 24 °C",
    sousTitre: "Nombre de nuits de l'été où la température ne descend pas sous 24 °C",
    unite: "nuits", observe: "observées",
  },
  heures_chaudes: {
    menu: "Heures > 28 °C",
    titre: "Heures où la température dépasse 28 °C",
    sousTitre: "Nombre d'heures de l'été où la température extérieure dépasse 28 °C",
    unite: "heures", observe: "observées",
  },
  dh: {
    menu: "Degrés-heures (DH)",
    titre: "Degrés-heures (°C·h)",
    sousTitre: "Degrés-heures (DH) cumulés sur l'été",
    unite: "DH", observe: "observés",
  },
};
const SOUS_TITRE_FIN = ", à la station de référence de chaque zone. Comparaison du fichier canicule réglementaire (2003), "
                     + "de l'été observé en 2026 et des deux scénarios TRACC 2050.";
let   INDICATEUR_ACTIF = "nuits_20";   // indicateur affiché à l'ouverture
const STATION_DEPART   = null;         // null = vue d'ensemble à l'ouverture (aucune sélection)
const REFERENCE        = "2003";       // situation de référence pour les écarts

// Gabarit du glyphe sur la carte (px du viewBox)
const BARRE_L = 19, BARRE_ESP = 4, CARTE_PAD = 6, H_MAX_CARTE = 100, H_VALEURS = 15;
// Gabarit du graphique de détail
const G = { x0: 40, x1: 352, yBas: 250, yHaut: 46, colL: 46 };
// Gabarit de la vue d'ensemble (une ligne par station, 4 barres horizontales)
const E = { xBarres: 92, xMax: 316, barreH: 10, barreEsp: 3, ligneEsp: 12, yDebut: 30 };

const SVG_NS = "http://www.w3.org/2000/svg";
let zoneActive = null;     // zone sélectionnée (null = vue d'ensemble)
let maxNational = 0;       // maximum de l'indicateur actif, toutes stations et situations

/* ---------- accès aux valeurs et mise en forme ---------- */
const ind = () => INDICATEURS[INDICATEUR_ACTIF];
const valeur = (st, cle) => st.valeurs[cle][INDICATEUR_ACTIF];
const fmt = v => Math.round(v).toLocaleString("fr-FR");
const fmtEcart = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
// format court pour les étiquettes du glyphe (1 234 → « 1,2k »)
const fmtCourt = v => v >= 1000 ? (v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "k" : fmt(v);
// pas « rond » pour les graduations (1, 2, 2,5 ou 5 × 10^n)
function pasRond(max, nb = 4) {
  const brut = max / nb, mag = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= brut);
}
// stations où 2026 observé dépasse le scénario TRACC 2050 moyen
function comptage() {
  const sup = STATIONS.filter(st => valeur(st, "2026") > valeur(st, "2050"));
  const egal = STATIONS.filter(st => valeur(st, "2026") === valeur(st, "2050"));
  const inf = STATIONS.filter(st => valeur(st, "2026") < valeur(st, "2050"));
  return { sup, egal, inf };
}

/* ---------- petit utilitaire de création d'éléments SVG ---------- */
function el(nom, attrs = {}, parent, texte) {
  const e = document.createElementNS(SVG_NS, nom);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (texte !== undefined) e.textContent = texte;
  if (parent) parent.appendChild(e);
  return e;
}
function activer(e, action) {   // clic + clavier (Entrée / Espace)
  e.addEventListener("click", action);
  e.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); action(); } });
}

/* ---------- éléments fixes : légende, fond de carte, sélecteur ---------- */
document.getElementById("legende").innerHTML = SITUATIONS
  .map(s => `<span><i style="background:${s.couleur}"></i>${s.annee} · ${s.libelle}</span>`).join("");

const fond = document.getElementById("fond");
for (const [z, g] of Object.entries(ZONES)) el("path", { d: g.d, class: "zone", id: "zone-" + z }, fond);

const selecteur = document.getElementById("indicateur");
selecteur.innerHTML = Object.entries(INDICATEURS).map(([k, i]) => `<option value="${k}">${i.menu}</option>`).join("");
selecteur.value = INDICATEUR_ACTIF;
selecteur.addEventListener("change", () => { INDICATEUR_ACTIF = selecteur.value; toutDessiner(); });

document.getElementById("p-retour").addEventListener("click", () => choisir(null));
document.addEventListener("keydown", e => { if (e.key === "Escape") choisir(null); });

/* ---------- en-tête : sous-titre et compteur 2026 > 2050 moyen ---------- */
function dessinerEntete() {
  document.getElementById("sous-titre").textContent = ind().sousTitre + SOUS_TITRE_FIN;
  const { sup, egal } = comptage();
  document.getElementById("compteur").innerHTML =
    `2026 observé &gt; TRACC 2050 moyen : <strong>${sup.length} stations sur ${STATIONS.length}</strong>`
    + (egal.length ? ` <span class="egalite">(+${egal.length} à égalité)</span>` : "");
}

/* ---------- glyphes : mini-histogramme de 4 barres par station ---------- */
const couche = document.getElementById("glyphes");
const largeurCarte = 2 * CARTE_PAD + SITUATIONS.length * BARRE_L + (SITUATIONS.length - 1) * BARRE_ESP;
function dessinerGlyphes() {
  couche.innerHTML = "";
  for (const st of STATIONS) {
    const hauteurs = SITUATIONS.map(s => valeur(st, s.cle) / maxNational * H_MAX_CARTE);
    const hCarte = Math.max(...hauteurs) + H_VALEURS + CARTE_PAD + 4;
    const x0 = st.gx - largeurCarte / 2, yBase = st.gy - CARTE_PAD;   // base des barres

    const g = el("g", { class: "glyphe", id: "glyphe-" + st.zone, tabindex: 0, role: "button",
                        "aria-label": `${st.station}, zone ${st.zone}` }, couche);
    // trait de rappel vers la station : depuis le haut du glyphe si la station est au-dessus
    const yHautCarte = st.gy - hCarte, depuisHaut = st.y < yHautCarte;
    el("line", { x1: st.gx, y1: depuisHaut ? yHautCarte : st.gy, x2: st.x, y2: st.y, class: "renvoi" }, g);
    el("rect", { x: x0, y: yHautCarte, width: largeurCarte, height: hCarte, rx: 5, class: "carte" }, g);
    el("text", { x: x0 + 1, y: yHautCarte - 5, class: "etiquette-zone" }, g, st.zone);
    SITUATIONS.forEach((s, i) => {
      const bx = x0 + CARTE_PAD + i * (BARRE_L + BARRE_ESP), h = hauteurs[i];
      el("rect", { x: bx, y: yBase - h, width: BARRE_L, height: Math.max(h, 1), rx: 2, fill: s.couleur }, g);
      el("text", { x: bx + BARRE_L / 2, y: yBase - h - 3, class: "val" }, g, fmtCourt(valeur(st, s.cle)));
    });
    el("circle", { cx: st.x, cy: st.y, r: 4.2, class: "station" }, g);
    // nom de la station à côté du point, du côté opposé au glyphe
    const aGauche = st.gx > st.x;
    el("text", { x: st.x + (aGauche ? -8 : 8), y: st.y + 4, class: "nom",
                 "text-anchor": aGauche ? "end" : "start" }, g, st.station);
    el("title", {}, g, `${st.station} (${st.zone}) — ` + SITUATIONS.map(s => `${s.annee} ${s.libelle} : ${fmt(valeur(st, s.cle))}`).join(" · "));
    activer(g, () => choisir(zoneActive === st.zone ? null : st.zone));
  }
}

/* ---------- tableau récapitulatif ---------- */
const tableau = document.getElementById("tableau");
function dessinerTableau() {
  tableau.innerHTML = "<thead><tr><th>Zone</th><th>Station</th>"
    + SITUATIONS.map(s => `<th><i style="background:${s.couleur}"></i>${s.annee} ${s.libelle}</th>`).join("")
    + "</tr></thead><tbody>"
    + STATIONS.map(st => `<tr data-zone="${st.zone}"><td>${st.zone}</td><td>${st.station}</td>`
        + SITUATIONS.map(s => {
            // 2026 en gras quand il dépasse le TRACC 2050 moyen
            const fort = s.cle === "2026" && valeur(st, "2026") > valeur(st, "2050");
            return `<td${fort ? ' class="fort"' : ""}>${fmt(valeur(st, s.cle))}</td>`;
          }).join("") + "</tr>").join("")
    + "</tbody>";
  tableau.querySelectorAll("tbody tr").forEach(tr => tr.addEventListener("click",
    () => choisir(zoneActive === tr.dataset.zone ? null : tr.dataset.zone)));
}

/* ---------- panneau : graphique de détail d'une station ---------- */
function dessinerGraphe(st) {
  const svg = document.getElementById("p-graphe");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 360 300");
  el("title", {}, svg, `${ind().titre} à ${st.station}`);
  el("text", { x: 0, y: 14, style: "font-size:13px;fill:var(--texte-2)" }, svg, ind().titre);

  const pas = pasRond(maxNational), haut = Math.ceil(maxNational / pas) * pas;
  const y = v => G.yBas - v / haut * (G.yBas - G.yHaut);
  for (let v = 0; v <= haut; v += pas) {
    el("line", { x1: G.x0, x2: G.x1, y1: y(v), y2: y(v), class: "grillage" }, svg);
    el("text", { x: G.x0 - 6, y: y(v) + 4, class: "axe", "text-anchor": "end" }, svg, fmt(v));
  }
  const vRef = valeur(st, REFERENCE);
  const refCouleur = SITUATIONS.find(s => s.cle === REFERENCE).couleur;
  el("line", { x1: G.x0, x2: G.x1, y1: y(vRef), y2: y(vRef), stroke: refCouleur, "stroke-width": 1.2, "stroke-dasharray": "4 3" }, svg);

  const pasCol = (G.x1 - G.x0) / SITUATIONS.length;
  SITUATIONS.forEach((s, i) => {
    const v = valeur(st, s.cle), cx = G.x0 + pasCol * (i + 0.5);
    el("rect", { x: cx - G.colL / 2, y: y(v), width: G.colL, height: Math.max(G.yBas - y(v), 1), rx: 3, fill: s.couleur }, svg);
    el("text", { x: cx, y: y(v) - 20, class: "valeur" }, svg, fmt(v));
    el("text", { x: cx, y: y(v) - 6, class: "ecart" }, svg, s.cle === REFERENCE ? "réf." : fmtEcart(v - vRef));
    el("text", { x: cx, y: G.yBas + 18, class: "annee" }, svg, s.annee);
    // libellé du scénario sur une ou deux lignes
    s.libelle.split(/ (?=vague|\+)/).forEach((ligne, j) =>
      el("text", { x: cx, y: G.yBas + 33 + j * 13, class: "scenario" }, svg, ligne));
  });
  el("line", { x1: G.x0, x2: G.x1, y1: G.yBas, y2: G.yBas, stroke: "var(--trait-fort)" }, svg);
}

function phraseLecture(st) {
  const v = Object.fromEntries(SITUATIONS.map(s => [s.cle, valeur(st, s.cle)])), i = ind();
  let p = `En 2026, <strong>${fmt(v["2026"])} ${i.unite}</strong> ${i.observe}, soit ${fmtEcart(v["2026"] - v["2003"])} par rapport au fichier canicule 2003. `;
  if (v["2026"] > v["2050"]) p += `L'été 2026 <strong>dépasse déjà</strong> le scénario TRACC 2050 moyen (${fmt(v["2050"])}). `;
  else if (v["2026"] === v["2050"]) p += `L'été 2026 <strong>égale</strong> le scénario TRACC 2050 moyen (${fmt(v["2050"])}). `;
  else p += `Le scénario TRACC 2050 moyen en prévoit ${fmt(v["2050"])}. `;
  p += `Avec une vague de chaleur en 2050 : <strong>${fmt(v["2050ext"])}</strong>.`;
  return p;
}

/* ---------- panneau : vue d'ensemble des 8 stations ---------- */
function dessinerEnsemble() {
  const svg = document.getElementById("p-graphe");
  svg.innerHTML = "";
  const hLigne = SITUATIONS.length * (E.barreH + E.barreEsp) - E.barreEsp;
  const hTotal = E.yDebut + STATIONS.length * (hLigne + E.ligneEsp) + 4;
  svg.setAttribute("viewBox", `0 0 360 ${hTotal}`);
  el("title", {}, svg, `${ind().titre}, 8 stations`);
  el("text", { x: 0, y: 14, style: "font-size:13px;fill:var(--texte-2)" }, svg, ind().titre);
  const x = v => E.xBarres + v / maxNational * (E.xMax - E.xBarres);

  STATIONS.forEach((st, i) => {
    const y0 = E.yDebut + i * (hLigne + E.ligneEsp);
    const g = el("g", { class: "ligne-ens", tabindex: 0, role: "button", "aria-label": `Détail de ${st.station}` }, svg);
    el("rect", { x: -4, y: y0 - 4, width: 368, height: hLigne + 8, rx: 6, class: "fond-ligne", fill: "transparent" }, g);
    el("text", { x: 0, y: y0 + hLigne / 2, class: "nom-ens" }, g, st.station);
    el("text", { x: 0, y: y0 + hLigne / 2 + 14, class: "zone-ens" }, g, st.zone);
    SITUATIONS.forEach((s, j) => {
      const v = valeur(st, s.cle), yb = y0 + j * (E.barreH + E.barreEsp);
      el("rect", { x: E.xBarres, y: yb, width: Math.max(x(v) - E.xBarres, 1), height: E.barreH, rx: 2, fill: s.couleur }, g);
      el("text", { x: x(v) + 4, y: yb + E.barreH - 1, class: "axe", style: "fill:var(--texte-2)" }, g, fmt(v));
    });
    activer(g, () => choisir(st.zone));
  });
}

function phraseEnsemble() {
  const { sup, egal, inf } = comptage();
  const noms = l => l.map(st => st.station).join(", ");
  let p = `Dans <strong>${sup.length} stations sur ${STATIONS.length}</strong>, l'été 2026 observé dépasse déjà le scénario TRACC 2050 moyen.`;
  if (egal.length) p += ` Égalité à ${noms(egal)}.`;
  if (inf.length) p += ` En dessous : ${noms(inf)}.`;
  return p + " Cliquer sur une zone ou une station pour le détail.";
}

/* ---------- sélection d'une zone (null = vue d'ensemble) ---------- */
function choisir(zone) {
  zoneActive = zone;
  document.querySelectorAll(".zone.active, .glyphe.actif, tbody tr.actif").forEach(e => e.classList.remove("active", "actif"));
  document.getElementById("p-retour").hidden = zone === null;
  if (zone === null) {
    document.getElementById("p-station").textContent = "Vue d'ensemble";
    document.getElementById("p-zone").textContent = "8 stations de référence RE2020 · même échelle";
    dessinerEnsemble();
    document.getElementById("p-lecture").innerHTML = phraseEnsemble();
    return;
  }
  const st = STATIONS.find(s => s.zone === zone);
  document.getElementById("zone-" + zone).classList.add("active");
  const g = document.getElementById("glyphe-" + zone);
  g.classList.add("actif");
  couche.appendChild(g);   // passe au premier plan
  tableau.querySelector(`tr[data-zone="${zone}"]`).classList.add("actif");
  document.getElementById("p-station").textContent = st.station;
  document.getElementById("p-zone").textContent = `Zone ${zone} · station de référence RE2020`;
  dessinerGraphe(st);
  document.getElementById("p-lecture").innerHTML = phraseLecture(st);
}

/* ---------- redessine tout pour l'indicateur actif ---------- */
function toutDessiner() {
  maxNational = Math.max(...STATIONS.flatMap(st => SITUATIONS.map(s => valeur(st, s.cle))));
  dessinerEntete();
  dessinerGlyphes();
  dessinerTableau();
  choisir(zoneActive);   // conserve la sélection en cours
}

zoneActive = STATION_DEPART;
toutDessiner();