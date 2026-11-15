# Carte de comparaison 2003 | 2026 | 2050 de villes en France

Carte interactive des 8 villes de France métropolitaine représentant les 8 zones de la RE2020 avec une comparaison de différents indicateurs dont les nuits chaudes 

**Voir la carte : [https://alliages.github.io/carte_france_2003_2026_2050/](https://alliages.github.io/carte_france_2003_2026_2050/)**

Réalisée avec l'aide du [Hub des Prescripteurs Bas Carbone](https://www.ifpeb.fr/travaux/le-hub-des-prescripteurs-bas-carbone/).

Version actuelle : **1.0.0**

![Capture d'écran de l'outil](docs/preview1.0.0.png)

## Structure du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | structure de la page |
| `styles.css` | styles (thèmes clair / sombre) |
| `js/config.js` | réglages : indicateurs, indicateur de départ, gabarits de dessin |
| `js/utils.js` | formats de nombres, échappement HTML, création d'éléments SVG |
| `js/script.js` | dessin de la carte, du panneau et du tableau |
| `js/zones.js`, `js/departements.js` | contours des 8 zones et des départements |
| `js/data.js` | **généré** — ne pas modifier à la main |
| `data/` | sources : `comparaison_meteo.csv`, `stations.json` (positions), `situations.json` |
| `build/build_data.py` | régénère `js/data.js` à partir de `data/` |

## Mettre à jour les données

Modifier `data/comparaison_meteo.csv` (une ligne par station et par situation), puis, depuis la racine :

```
python3 build/build_data.py
```

Pour ajouter un indicateur : ajouter la colonne au CSV, puis une entrée dans `INDICATEURS` (`js/config.js`).

## Licence et crédits

GNU GPL v3

Par Guillaume Meunier & Claude
