// Initialisation, sélection d'une zone et événements. Calculs : calculs.js ; dessin : dessin.js ; exports : exports.js.

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
  const st = stationDe(zone);
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
  maxNational = calculerMax();
  dessinerEntete();
  dessinerGlyphes();
  dessinerTableau();
  choisir(zoneActive);   // conserve la sélection en cours
}

/* ---------- événements ---------- */
interrupteur.addEventListener("change", () => {
  tousAffiches = interrupteur.checked;
  const avant = INDICATEUR_ACTIF;
  remplirSelecteur();
  if (INDICATEUR_ACTIF !== avant) toutDessiner();   // un « autre » indicateur était affiché
});
selecteur.addEventListener("change", () => { INDICATEUR_ACTIF = selecteur.value; toutDessiner(); });
document.getElementById("p-retour").addEventListener("click", () => choisir(null));
document.addEventListener("keydown", e => { if (e.key === "Escape") choisir(null); });
document.getElementById("t-export").addEventListener("click", exporterTableau);
document.getElementById("p-export").addEventListener("click", exporterGraphe);

/* ---------- démarrage ---------- */
document.getElementById("version").textContent = "v" + VERSION;
dessinerLegende();
dessinerFond();
interrupteur.checked = tousAffiches;
remplirSelecteur();
zoneActive = STATION_DEPART;
toutDessiner();
