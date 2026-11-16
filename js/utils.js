// Utilitaires sans état : formats de nombres, protection du HTML et création d'éléments SVG.

/* ---------- mise en forme des nombres ---------- */
const fmt = v => Math.round(v).toLocaleString("fr-FR");
const fmtEcart = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
// format court pour les étiquettes du glyphe (1 234 → « 1,2k »)
const fmtCourt = v => v >= 1000 ? (v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "k" : fmt(v);
// pas « rond » pour les graduations (1, 2, 2,5 ou 5 × 10^n)
function pasRond(max, nb = 4) {
  const brut = max / nb, mag = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= brut);
}

// échappe un texte venant des données avant de l'insérer dans du HTML
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- petit utilitaire de création d'éléments SVG ---------- */
function el(nom, attrs = {}, parent, texte) {
  const e = document.createElementNS(SVG_NS, nom);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (texte !== undefined) e.textContent = texte;
  if (parent) parent.appendChild(e);
  return e;
}
/* ---------- export : téléchargement d'un fichier généré dans le navigateur ---------- */
function telecharger(contenu, nom, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nom });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// texte sûr pour un nom de fichier (« Saint-Auban » → « Saint-Auban », « Île d'Yeu » → « Ile_d_Yeu »)
const slug = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9-]+/g, "_");

function activer(e, action) {   // clic + clavier (Entrée / Espace)
  e.addEventListener("click", action);
  e.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); action(); } });
}
