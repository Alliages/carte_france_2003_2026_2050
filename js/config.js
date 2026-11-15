// Réglages de la carte : indicateurs, valeurs de départ et gabarits de dessin.
// Chargé avant script.js (scripts classiques : fonctionne aussi en ouvrant index.html en local).

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
