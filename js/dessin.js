// Dessin de la carte, du panneau et du tableau. Réglages : config.js ; calculs : calculs.js ; utilitaires : utils.js.

/* ---------- éléments de la page ---------- */
const selecteur    = document.getElementById("indicateur");
const interrupteur = document.getElementById("tous");
const couche       = document.getElementById("glyphes");
const tableau      = document.getElementById("tableau");
const svgGraphe    = document.getElementById("p-graphe");
const largeurCarte = 2 * CARTE_PAD + SITUATIONS.length * BARRE_L + (SITUATIONS.length - 1) * BARRE_ESP;

/* ---------- éléments fixes : légende, fond de carte, sélecteur ---------- */
function dessinerLegende() {
  document.getElementById("legende").replaceChildren(...SITUATIONS.map(s => {
    const span = document.createElement("span");
    span.append(pastille(s.couleur), `${s.annee} · ${s.libelle}`);
    return span;
  }));
}

function dessinerFond() {
  const fond = document.getElementById("fond");
  for (const [z, g] of Object.entries(ZONES)) el("path", { d: g.d, class: "zone", id: "zone-" + z }, fond);
  el("path", { d: DEPARTEMENTS, class: "deps" }, document.getElementById("departements"));
}

const option = i => `<option value="${esc(i.id)}" title="${esc(i.bulle)}">${esc(i.libelle)}</option>`;
// liste courte (indicateurs choisis) ou complète (choisis d'abord, puis les autres actifs)
function remplirSelecteur() {
  const liste = Object.values(INDICATEURS);
  const choisis = liste.filter(i => estChoisi(i.id)), autres = liste.filter(i => !estChoisi(i.id));
  selecteur.innerHTML = tousAffiches
    ? `<optgroup label="Indicateurs choisis">${choisis.map(option).join("")}</optgroup>`
      + `<optgroup label="Autres indicateurs">${autres.map(option).join("")}</optgroup>`
    : choisis.map(option).join("");
  if (!tousAffiches && !estChoisi(INDICATEUR_ACTIF)) INDICATEUR_ACTIF = INDICATEUR_DEPART;
  selecteur.value = INDICATEUR_ACTIF;
}

/* ---------- en-tête : sous-titre et compteur 2026 > 2050 moyen ---------- */
function dessinerEntete() {
  document.getElementById("sous-titre").textContent = ind().bulle + SOUS_TITRE_FIN;
  const { sup, egal } = comptage();
  document.getElementById("compteur").innerHTML =
    `2026 observé &gt; TRACC 2050 moyen : <strong>${sup.length} stations sur ${STATIONS.length}</strong>`
    + (egal.length ? ` <span class="egalite">(+${egal.length} à égalité)</span>` : "");
}

/* ---------- glyphes : mini-histogramme de 4 barres par station ---------- */
function dessinerGlyphes() {
  couche.innerHTML = "";
  for (const st of STATIONS) {
    const hauteurs = SITUATIONS.map(s => valeur(st, s.cle) / maxNational * H_MAX_CARTE);
    const hCarte = Math.max(...hauteurs) + H_VALEURS + CARTE_PAD + CARTE_MARGE_HAUT;
    const x0 = st.gx - largeurCarte / 2, yBase = st.gy - CARTE_PAD;   // base des barres

    const g = el("g", { class: "glyphe", id: "glyphe-" + st.zone, tabindex: 0, role: "button",
                        "aria-label": `${st.station}, zone ${st.zone}` }, couche);
    // trait de rappel vers la station : depuis le haut du glyphe si la station est au-dessus
    const yHautCarte = st.gy - hCarte, depuisHaut = st.y < yHautCarte;
    el("line", { x1: st.gx, y1: depuisHaut ? yHautCarte : st.gy, x2: st.x, y2: st.y, class: "renvoi" }, g);
    el("rect", { x: x0, y: yHautCarte, width: largeurCarte, height: hCarte, rx: 5, class: "carte" }, g);
    el("text", { x: x0 + 1, y: yHautCarte - ETIQ_ZONE_DY, class: "etiquette-zone" }, g, st.zone);
    SITUATIONS.forEach((s, i) => {
      const bx = x0 + CARTE_PAD + i * (BARRE_L + BARRE_ESP), h = hauteurs[i];
      el("rect", { x: bx, y: yBase - h, width: BARRE_L, height: Math.max(h, 1), rx: 2, fill: s.couleur }, g);
      // avec décimales (« 21,4 »), étiquette plus petite pour ne pas toucher sa voisine
      el("text", { x: bx + BARRE_L / 2, y: yBase - h - ETIQ_VAL_DY, class: dec() > 0 ? "val serre" : "val" }, g, fmtCourt(valeur(st, s.cle), dec()));
    });
    el("circle", { cx: st.x, cy: st.y, r: STATION_R, class: "station" }, g);
    // nom de la station à côté du point, du côté opposé au glyphe
    const aGauche = st.gx > st.x;
    el("text", { x: st.x + (aGauche ? -NOM_DECALAGE : NOM_DECALAGE), y: st.y + 4, class: "nom",
                 "text-anchor": aGauche ? "end" : "start" }, g, st.station);
    el("title", {}, g, `${st.station} (${st.zone}) — ` + SITUATIONS.map(s => `${s.annee} ${s.libelle} : ${f(valeur(st, s.cle))}`).join(" · "));
    activer(g, () => choisir(zoneActive === st.zone ? null : st.zone));
  }
}

/* ---------- tableau récapitulatif (construit par le DOM : pas de HTML à échapper) ---------- */
function dessinerTableau() {
  tableau.replaceChildren();
  const tete = tableau.createTHead().insertRow();
  for (const t of ["Zone", "Station"]) tete.appendChild(Object.assign(document.createElement("th"), { textContent: t }));
  for (const s of SITUATIONS) {
    const th = tete.appendChild(document.createElement("th"));
    th.append(pastille(s.couleur), `${s.annee} ${s.libelle}`);
  }
  const corps = tableau.createTBody();
  for (const st of STATIONS) {
    const tr = corps.insertRow();
    tr.dataset.zone = st.zone;
    tr.tabIndex = 0;
    tr.insertCell().textContent = st.zone;
    tr.insertCell().textContent = st.station;
    for (const s of SITUATIONS) {
      const td = tr.insertCell();
      td.textContent = f(valeur(st, s.cle));
      // 2026 en gras quand il dépasse le TRACC 2050 moyen
      if (s.cle === CLE_OBSERVE && valeur(st, CLE_OBSERVE) > valeur(st, CLE_TRACC)) td.className = "fort";
    }
    activer(tr, () => choisir(zoneActive === st.zone ? null : st.zone));
  }
}

/* ---------- panneau : graphique de détail d'une station ---------- */
function dessinerGraphe(st) {
  const svg = svgGraphe;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${G.largeur} ${G.hauteur}`);
  svg.setAttribute("role", "img");
  el("title", {}, svg, `${titreInd()} à ${st.station}`);
  el("text", { x: 0, y: G.yTitre, class: "titre-graphe" }, svg, titreInd());

  const pas = pasRond(maxNational), haut = Math.ceil(maxNational / pas) * pas;
  const y = v => G.yBas - v / haut * (G.yBas - G.yHaut);
  for (let v = 0; v <= haut; v += pas) {
    el("line", { x1: G.x0, x2: G.x1, y1: y(v), y2: y(v), class: "grillage" }, svg);
    el("text", { x: G.x0 - 6, y: y(v) + 4, class: "axe", "text-anchor": "end" }, svg, fmtAxe(v));
  }
  const vRef = valeur(st, REFERENCE);
  const refCouleur = SITUATIONS.find(s => s.cle === REFERENCE).couleur;
  el("line", { x1: G.x0, x2: G.x1, y1: y(vRef), y2: y(vRef), stroke: refCouleur, "stroke-width": 1.2, "stroke-dasharray": "4 3" }, svg);

  const pasCol = (G.x1 - G.x0) / SITUATIONS.length;
  SITUATIONS.forEach((s, i) => {
    const v = valeur(st, s.cle), cx = G.x0 + pasCol * (i + 0.5);
    el("rect", { x: cx - G.colL / 2, y: y(v), width: G.colL, height: Math.max(G.yBas - y(v), 1), rx: 3, fill: s.couleur }, svg);
    el("text", { x: cx, y: y(v) - G.yValeur, class: "valeur" }, svg, f(v));
    el("text", { x: cx, y: y(v) - G.yEcart, class: "ecart" }, svg, s.cle === REFERENCE ? "réf." : fmtEcart(v - vRef, dec()));
    el("text", { x: cx, y: G.yBas + G.yAnnee, class: "annee" }, svg, s.annee);
    // libellé du scénario sur une ou deux lignes
    s.libelle.split(/ (?=vague|\+)/).forEach((ligne, j) =>
      el("text", { x: cx, y: G.yBas + G.yScenario + j * G.hScenario, class: "scenario" }, svg, ligne));
  });
  el("line", { x1: G.x0, x2: G.x1, y1: G.yBas, y2: G.yBas, stroke: "var(--trait-fort)" }, svg);
}

function phraseLecture(st) {
  const n = cle => esc(f(valeur(st, cle))), u = esc(ind().unite);
  const ecart = esc(fmtEcart(valeur(st, CLE_OBSERVE) - valeur(st, REFERENCE), dec()));
  const cmp = Math.sign(valeur(st, CLE_OBSERVE) - valeur(st, CLE_TRACC));
  let p = `Été 2026 observé : <strong>${n(CLE_OBSERVE)} ${u}</strong>, soit ${ecart} par rapport au fichier canicule 2003. `;
  p += cmp > 0 ? `Il <strong>dépasse déjà</strong> le scénario TRACC 2050 moyen (${n(CLE_TRACC)}). `
     : cmp === 0 ? `Il <strong>égale</strong> le scénario TRACC 2050 moyen (${n(CLE_TRACC)}). `
     : `Le scénario TRACC 2050 moyen donne ${n(CLE_TRACC)}. `;
  return p + `Avec une vague de chaleur en 2050 : <strong>${n(CLE_TRACC_VAGUE)}</strong>.`;
}

/* ---------- panneau : vue d'ensemble des 8 stations ---------- */
function dessinerEnsemble() {
  const svg = svgGraphe;
  svg.innerHTML = "";
  const hLigne = SITUATIONS.length * (E.barreH + E.barreEsp) - E.barreEsp;
  const hTotal = E.yDebut + STATIONS.length * (hLigne + E.ligneEsp) + E.bas;
  svg.setAttribute("viewBox", `0 0 ${E.largeur} ${hTotal}`);
  svg.setAttribute("role", "group");   // contient des boutons : pas role="img"
  el("title", {}, svg, `${titreInd()}, 8 stations`);
  el("text", { x: 0, y: E.yTitre, class: "titre-graphe" }, svg, titreInd());
  const x = v => E.xBarres + v / maxNational * (E.xMax - E.xBarres);

  STATIONS.forEach((st, i) => {
    const y0 = E.yDebut + i * (hLigne + E.ligneEsp);
    const g = el("g", { class: "ligne-ens", tabindex: 0, role: "button", "aria-label": `Détail de ${st.station}` }, svg);
    el("rect", { x: E.fondX, y: y0 - E.fondPad, width: E.fondL, height: hLigne + 2 * E.fondPad, rx: 6, class: "fond-ligne", fill: "transparent" }, g);
    el("text", { x: 0, y: y0 + hLigne / 2, class: "nom-ens" }, g, st.station);
    el("text", { x: 0, y: y0 + hLigne / 2 + E.yZone, class: "zone-ens" }, g, st.zone);
    SITUATIONS.forEach((s, j) => {
      const v = valeur(st, s.cle), yb = y0 + j * (E.barreH + E.barreEsp);
      el("rect", { x: E.xBarres, y: yb, width: Math.max(x(v) - E.xBarres, 1), height: E.barreH, rx: 2, fill: s.couleur }, g);
      el("text", { x: x(v) + 4, y: yb + E.barreH - 1, class: "axe val-ens" }, g, f(v));
    });
    activer(g, () => choisir(st.zone));
  });
}

function phraseEnsemble() {
  const { sup, egal, inf } = comptage();
  const noms = l => l.map(st => esc(st.station)).join(", ");
  let p = `Dans <strong>${sup.length} stations sur ${STATIONS.length}</strong>, l'été 2026 observé dépasse déjà le scénario TRACC 2050 moyen.`;
  if (egal.length) p += ` Égalité à ${noms(egal)}.`;
  if (inf.length) p += ` En dessous : ${noms(inf)}.`;
  return p + " Cliquer sur une zone ou une station pour le détail.";
}
