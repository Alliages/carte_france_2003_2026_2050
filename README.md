# Carte de comparaison 2003 | 2026 | 2050 de villes en France

Carte interactive des 8 villes de France métropolitaine représentant les 8 zones de la RE2020, avec une comparaison de différents indicateurs de chaleur d'été (nuits chaudes, heures > 28 °C, degrés-heures) pour trois horizons :

- **2003** : fichier météo Th-D « canicule » de la RE2020 ;
- **2026** : été observé aux stations ;
- **2050** : scénarios TRACC +2,7 °C (moyen, et avec vague de chaleur).

**Voir la carte : [https://alliages.github.io/carte_france_2003_2026_2050/](https://alliages.github.io/carte_france_2003_2026_2050/)**

Réalisée avec l'aide du [Hub des Prescripteurs Bas Carbone](https://www.ifpeb.fr/travaux/le-hub-des-prescripteurs-bas-carbone/).

Version actuelle : **1.0.0**

![Vue d'ensemble : carte des 8 zones, panneau de comparaison et tableau](docs/apercu-ensemble.png)

![Détail d'une station (Tours, heures > 28 °C) avec les écarts à 2003](docs/apercu-detail.png)

## Utilisation

- **Indicateur** : le sélecteur en haut change l'indicateur affiché partout (carte, panneau, tableau).
- **Carte** : chaque station porte un mini-histogramme de 4 barres (2003, 2026, 2050, 2050 vague de chaleur), à la même échelle pour toutes les stations.
- **Sélection** : un clic sur une zone, un glyphe ou une ligne du tableau ouvre le détail de la station dans le panneau (valeurs et écarts à 2003). `Échap` ou « Vue d'ensemble » revient à la comparaison des 8 stations.
- **Compteur** : nombre de stations où l'été 2026 observé dépasse déjà le scénario TRACC 2050 moyen.
- **Exports** :
  - « Exporter le tableau (CSV) », sous le tableau : l'indicateur affiché, séparateur `;`, virgule décimale, ouvrable directement dans Excel en français ;
  - « Exporter le graphique (SVG) », dans le panneau : le graphique affiché (détail de la station ou vue d'ensemble), en SVG autonome, thème clair, fond blanc ;
  - le CSV complet des données (tous les indicateurs) reste téléchargeable en pied de page.

La page fonctionne aussi en ouvrant `index.html` directement dans un navigateur : pas de serveur, pas de dépendance, pas de compilation.

## Structure du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | structure de la page |
| `styles.css` | styles (thèmes clair / sombre) |
| `js/config.js` | réglages : indicateurs, indicateur de départ, gabarits de dessin, style de l'export SVG |
| `js/utils.js` | formats de nombres, échappement HTML, création d'éléments SVG, téléchargement de fichiers |
| `js/script.js` | dessin de la carte, du panneau et du tableau, interactions, exports |
| `js/zones.js`, `js/departements.js` | contours des 8 zones et des départements |
| `js/data.js` | **généré** — ne pas modifier à la main |
| `data/` | sources : `comparaison_meteo.csv`, `stations.json` (positions), `situations.json` |
| `build/build_data.py` | régénère `js/data.js` à partir de `data/` |
| `docs/` | captures d'écran |
| `img/` | logo et icônes |

## Description du code

### Chaîne de données

```
data/comparaison_meteo.csv ─┐
data/stations.json         ─┼─ build/build_data.py ─▶ js/data.js ─▶ page
data/situations.json       ─┘
```

- `comparaison_meteo.csv` : une ligne par station et par situation, une colonne par indicateur (`dh`, `heures_chaudes`, `nuits_20`, `nuits_24`, `t_moyenne`, etc.).
- `stations.json` : pour chaque zone, la station de référence, sa position sur la carte (`x`, `y`) et celle de son glyphe (`gx`, `gy`), en pixels du `viewBox` du SVG.
- `situations.json` : les 4 situations comparées (clé, année, libellé, couleur), dans l'ordre d'affichage.
- `build_data.py` fusionne ces trois sources et écrit `js/data.js`, qui définit deux constantes globales : `SITUATIONS` et `STATIONS` (chaque station contient `valeurs[situation][indicateur]`). Le script s'arrête avec un message clair si une ligne du CSV manque.

### Page web

Les scripts sont des scripts classiques chargés dans l'ordre de `index.html` (`config.js`, `utils.js`, `zones.js`, `departements.js`, `data.js`, `script.js`). Ils partagent des constantes globales, ce qui permet d'ouvrir la page en local sans serveur.

- **`config.js`** : `INDICATEURS` (menu, titres, unité de chaque indicateur), indicateur et station de départ, situation de référence (`REFERENCE`), gabarits de dessin (`BARRE_*`, `G`, `E`) et style embarqué dans les SVG exportés.
- **`utils.js`** : `fmt` / `fmtEcart` / `fmtCourt` (formats français), `pasRond` (graduations), `esc` (protège le HTML venant des données), `el` (crée un élément SVG), `activer` (clic + clavier), `telecharger` et `slug` (exports).
- **`script.js`** : tout le dessin est refait à chaque changement d'indicateur par `toutDessiner()`.
  - `dessinerEntete()` : sous-titre et compteur 2026 > TRACC 2050 moyen ;
  - `dessinerGlyphes()` : mini-histogrammes sur la carte, avec trait de rappel vers la station ;
  - `dessinerTableau()` : tableau récapitulatif ;
  - `dessinerGraphe(station)` et `dessinerEnsemble()` : les deux vues du panneau ;
  - `choisir(zone)` : sélection d'une zone (`null` = vue d'ensemble), synchronise carte, tableau et panneau ;
  - `exporterTableau()` et `exporterGraphe()` : exports CSV et SVG, générés dans le navigateur.
- **`maxNational`** : maximum de l'indicateur actif, toutes stations et situations confondues, qui fixe l'échelle commune à la carte et aux graphiques.

Les graphiques sont du SVG pur, dessiné à la main, sans bibliothèque. Les couleurs et le thème sombre passent par des variables CSS (`styles.css`).

## Mettre à jour les données

Modifier `data/comparaison_meteo.csv` (une ligne par station et par situation), puis, depuis la racine :

```
python3 build/build_data.py
```

Pour ajouter un indicateur : ajouter la colonne au CSV, relancer le script, puis ajouter une entrée dans `INDICATEURS` (`js/config.js`). Le sélecteur, le tableau et les exports le prennent en compte automatiquement.

Pour ajouter une situation (ou en changer la couleur) : modifier `data/situations.json` et ajouter les lignes correspondantes au CSV.

## Sources des données

- 2003 : fichier météo Th-D canicule de la RE2020 ;
- 2026 : observations de l'été 2026 aux stations ;
- 2050 : scénarios TRACC +2,7 °C (moyen et vague de chaleur) ;
- fond de carte : IGN Admin Express via france-geojson (Licence Ouverte).

## TODO

rajouter des indicateurs

## Licence et crédits

GNU GPL v3

Par Guillaume Meunier & Claude
