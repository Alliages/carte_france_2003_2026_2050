// Exports générés dans le navigateur : CSV du tableau et SVG du graphique du panneau.

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
  const { width: l, height: h } = svgGraphe.viewBox.baseVal, m = EXPORT_MARGE;
  const svg = svgGraphe.cloneNode(true);
  svg.removeAttribute("id");
  svg.removeAttribute("role");
  svg.setAttribute("viewBox", `${-m} ${-m} ${l + 2 * m} ${h + 2 * m}`);
  svg.setAttribute("width", 2 * (l + 2 * m));    // taille par défaut : x2 pour une bonne définition à l'ouverture
  svg.setAttribute("height", 2 * (h + 2 * m));
  svg.querySelectorAll("[tabindex],[role]").forEach(e => { e.removeAttribute("tabindex"); e.removeAttribute("role"); });
  el("rect", { x: -m, y: -m, width: l + 2 * m, height: h + 2 * m, fill: "var(--fond)" }, svg);
  svg.insertBefore(svg.lastChild, svg.firstChild.nextSibling);   // fond juste après le <title>
  svg.insertBefore(el("style", {}, null, EXPORT_STYLE), svg.firstChild);
  // les var(--x) ne sont pas lisibles hors de la page : remplacées par les couleurs du thème clair
  const texte = new XMLSerializer().serializeToString(svg)
    .replace(/var\((--[\w-]+)\)/g, (_, v) => EXPORT_COULEURS[v]);
  const nom = zoneActive ? `${INDICATEUR_ACTIF}_${slug(stationDe(zoneActive).station)}`
                         : `${INDICATEUR_ACTIF}_vue_ensemble`;
  telecharger('<?xml version="1.0" encoding="UTF-8"?>\n' + texte, `${nom}.svg`, "image/svg+xml;charset=utf-8");
}
