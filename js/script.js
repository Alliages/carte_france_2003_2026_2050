// Dessin de la carte, du panneau et du tableau. Réglages : config.js ; utilitaires : utils.js ; données : data.js.

/* ---------- état ---------- */
let zoneActive = null;     // zone sélectionnée (null = vue d'ensemble)
let maxNational = 0;       // maximum de l'indicateur actif, toutes stations et situations

/* ---------- indicateurs (data/indicateurs.csv → INDICATEURS_LISTE, déjà triés par ordre) ---------- */
// proposés : les indicateurs actifs, plus les choisis même s'ils étaient désactivés dans le CSV
const INDICATEURS = Object.fromEntries(INDICATEURS_LISTE
  .filter(i => i.actif || INDICATEURS_CHOISIS.includes(i.id)).map(i => [i.id, i]));
const estChoisi = id => INDICATEURS_CHOISIS.includes(id);
let tousAffiches = TOUS_PAR_DEFAUT;   // état de l'interrupteur « tous »

/* ---------- accès aux valeurs et formats de l'indicateur actif ---------- */
const ind = () => INDICATEURS[INDICATEUR_ACTIF];
const titreInd = () => `${ind().libelle} (${ind().unite})`;
const dec = () => ind().decimales;
const f = v => fmt(v, dec());
const valeur = (st, cle) => st.valeurs[cle][INDICATEUR_ACTIF];
// stations où 2026 observé dépasse le scénario TRACC 2050 moyen
function comptage() {
  const sup = STATIONS.filter(st => valeur(st, "2026") > valeur(st, "2050"));
  const egal = STATIONS.filter(st => valeur(st, "2026") === valeur(st, "2050"));
  const inf = STATIONS.filter(st => valeur(st, "2026") < valeur(st, "2050"));
  return { sup, egal, inf };
}

/* ---------- éléments fixes : légende, fond de carte, sélecteur ---------- */
document.getElementById("legende").innerHTML = SITUATIONS
  .map(s => `<span><i style="background:${s.couleur}"></i>${esc(s.annee)} · ${esc(s.libelle)}</span>`).join("");

const fond = document.getElementById("fond");
for (const [z, g] of Object.entries(ZONES)) el("path", { d: g.d, class: "zone", id: "zone-" + z }, fond);

el("path", { d: DEPARTEMENTS, class: "deps" }, document.getElementById("departements"));

const selecteur = document.getElementById("indicateur");
const interrupteur = document.getElementById("tous");
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
interrupteur.checked = tousAffiches;
interrupteur.addEventListener("change", () => {
  tousAffiches = interrupteur.checked;
  const avant = INDICATEUR_ACTIF;
  remplirSelecteur();
  if (INDICATEUR_ACTIF !== avant) toutDessiner();   // un « autre » indicateur était affiché
});
remplirSelecteur();
selecteur.addEventListener("change", () => { INDICATEUR_ACTIF = selecteur.value; toutDessiner(); });

document.getElementById("p-retour").addEventListener("click", () => choisir(null));
document.addEventListener("keydown", e => { if (e.key === "Escape") choisir(null); });

/* ---------- en-tête : sous-titre et compteur 2026 > 2050 moyen ---------- */
function dessinerEntete() {
  document.getElementById("sous-titre").textContent = ind().bulle + SOUS_TITRE_FIN;
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
      // avec décimales (« 21,4 »), étiquette plus petite pour ne pas toucher sa voisine
      el("text", { x: bx + BARRE_L / 2, y: yBase - h - 3, class: dec() > 0 ? "val serre" : "val" }, g, fmtCourt(valeur(st, s.cle), dec()));
    });
    el("circle", { cx: st.x, cy: st.y, r: 4.2, class: "station" }, g);
    // nom de la station à côté du point, du côté opposé au glyphe
    const aGauche = st.gx > st.x;
    el("text", { x: st.x + (aGauche ? -8 : 8), y: st.y + 4, class: "nom",
                 "text-anchor": aGauche ? "end" : "start" }, g, st.station);
    el("title", {}, g, `${st.station} (${st.zone}) — ` + SITUATIONS.map(s => `${s.annee} ${s.libelle} : ${f(valeur(st, s.cle))}`).join(" · "));
    activer(g, () => choisir(zoneActive === st.zone ? null : st.zone));
  }
}

/* ---------- tableau récapitulatif ---------- */
const tableau = document.getElementById("tableau");
function dessinerTableau() {
  tableau.innerHTML = "<thead><tr><th>Zone</th><th>Station</th>"
    + SITUATIONS.map(s => `<th><i style="background:${esc(s.couleur)}"></i>${esc(s.annee)} ${esc(s.libelle)}</th>`).join("")
    + "</tr></thead><tbody>"
    + STATIONS.map(st => `<tr data-zone="${esc(st.zone)}" tabindex="0"><td>${esc(st.zone)}</td><td>${esc(st.station)}</td>`
        + SITUATIONS.map(s => {
            // 2026 en gras quand il dépasse le TRACC 2050 moyen
            const fort = s.cle === "2026" && valeur(st, "2026") > valeur(st, "2050");
            return `<td${fort ? ' class="fort"' : ""}>${f(valeur(st, s.cle))}</td>`;
          }).join("") + "</tr>").join("")
    + "</tbody>";
  tableau.querySelectorAll("tbody tr").forEach(tr =>
    activer(tr, () => choisir(zoneActive === tr.dataset.zone ? null : tr.dataset.zone)));
}

/* ---------- exports ---------- */
// CSV du tableau (indicateur actif) : UTF-8 avec BOM, séparateur « ; » et virgule décimale pour Excel en français
function exporterTableau() {
  const q = t => `"${String(t).replace(/"/g, '""')}"`;
  const lignes = [["Zone", "Station", ...SITUATIONS.map(s => `${s.annee} ${s.libelle} (${ind().unite})`)].map(q).join(";")];
  for (const st of STATIONS)
    lignes.push([q(st.zone), q(st.station), ...SITUATIONS.map(s => String(valeur(st, s.cle)).replace(".", ","))].join(";"));
  telecharger("﻿" + lignes.join("\r\n"), `${INDICATEUR_ACTIF}_2003_2026_2050.csv`, "text/csv;charset=utf-8");
}

// SVG autonome du graphique affiché dans le panneau (détail d'une station ou vue d'ensemble)
function exporterGraphe() {
  const src = document.getElementById("p-graphe");
  const { width: l, height: h } = src.viewBox.baseVal, m = EXPORT_MARGE;
  const svg = src.cloneNode(true);
  svg.removeAttribute("id");
  svg.removeAttribute("role");
  svg.setAttribute("viewBox", `${-m} ${-m} ${l + 2 * m} ${h + 2 * m}`);
  svg.setAttribute("width", 2 * (l + 2 * m));    // taille par défaut : x2 pour une bonne définition à l'ouverture
  svg.setAttribute("height", 2 * (h + 2 * m));
  svg.querySelectorAll("[tabindex],[role]").forEach(e => { e.removeAttribute("tabindex"); e.removeAttribute("role"); });
  el("rect", { x: -m, y: -m, width: l + 2 * m, height: h + 2 * m, fill: "var(--fond)" }, svg);
  svg.insertBefore(svg.lastChild, svg.firstChild.nextSibling);   // fond juste après le <title>
  const style = el("style", {}, null, EXPORT_STYLE);
  svg.insertBefore(style, svg.firstChild);
  // les var(--x) ne sont pas lisibles hors de la page : remplacées par les couleurs du thème clair
  const texte = new XMLSerializer().serializeToString(svg)
    .replace(/var\((--[\w-]+)\)/g, (_, v) => EXPORT_COULEURS[v]);
  const nom = zoneActive ? `${INDICATEUR_ACTIF}_${slug(STATIONS.find(s => s.zone === zoneActive).station)}`
                         : `${INDICATEUR_ACTIF}_vue_ensemble`;
  telecharger('<?xml version="1.0" encoding="UTF-8"?>\n' + texte, `${nom}.svg`, "image/svg+xml;charset=utf-8");
}
document.getElementById("t-export").addEventListener("click", exporterTableau);
document.getElementById("p-export").addEventListener("click", exporterGraphe);

/* ---------- panneau : graphique de détail d'une station ---------- */
function dessinerGraphe(st) {
  const svg = document.getElementById("p-graphe");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 360 300");
  svg.setAttribute("role", "img");
  el("title", {}, svg, `${titreInd()} à ${st.station}`);
  el("text", { x: 0, y: 14, class: "titre-graphe" }, svg, titreInd());

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
    el("text", { x: cx, y: y(v) - 20, class: "valeur" }, svg, f(v));
    el("text", { x: cx, y: y(v) - 6, class: "ecart" }, svg, s.cle === REFERENCE ? "réf." : fmtEcart(v - vRef, dec()));
    el("text", { x: cx, y: G.yBas + 18, class: "annee" }, svg, s.annee);
    // libellé du scénario sur une ou deux lignes
    s.libelle.split(/ (?=vague|\+)/).forEach((ligne, j) =>
      el("text", { x: cx, y: G.yBas + 33 + j * 13, class: "scenario" }, svg, ligne));
  });
  el("line", { x1: G.x0, x2: G.x1, y1: G.yBas, y2: G.yBas, stroke: "var(--trait-fort)" }, svg);
}

function phraseLecture(st) {
  const v = Object.fromEntries(SITUATIONS.map(s => [s.cle, valeur(st, s.cle)])), u = esc(ind().unite);
  let p = `Été 2026 observé : <strong>${f(v["2026"])} ${u}</strong>, soit ${fmtEcart(v["2026"] - v["2003"], dec())} par rapport au fichier canicule 2003. `;
  if (v["2026"] > v["2050"]) p += `Il <strong>dépasse déjà</strong> le scénario TRACC 2050 moyen (${f(v["2050"])}). `;
  else if (v["2026"] === v["2050"]) p += `Il <strong>égale</strong> le scénario TRACC 2050 moyen (${f(v["2050"])}). `;
  else p += `Le scénario TRACC 2050 moyen donne ${f(v["2050"])}. `;
  p += `Avec une vague de chaleur en 2050 : <strong>${f(v["2050ext"])}</strong>.`;
  return p;
}

/* ---------- panneau : vue d'ensemble des 8 stations ---------- */
function dessinerEnsemble() {
  const svg = document.getElementById("p-graphe");
  svg.innerHTML = "";
  const hLigne = SITUATIONS.length * (E.barreH + E.barreEsp) - E.barreEsp;
  const hTotal = E.yDebut + STATIONS.length * (hLigne + E.ligneEsp) + 4;
  svg.setAttribute("viewBox", `0 0 360 ${hTotal}`);
  svg.setAttribute("role", "group");   // contient des boutons : pas role="img"
  el("title", {}, svg, `${titreInd()}, 8 stations`);
  el("text", { x: 0, y: 14, class: "titre-graphe" }, svg, titreInd());
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