#!/usr/bin/env python3
"""Génère js/data.js à partir des fichiers du dossier data/.

Sources (à modifier, jamais js/data.js à la main) :
  - data/comparaison_meteo.csv : une ligne par station et par situation (colonnes = indicateurs)
  - data/stations.json         : zone, nom de la station, position sur la carte (x, y) et du glyphe (gx, gy)
  - data/situations.json       : situations comparées (clé, année, libellé, couleur), dans l'ordre d'affichage

Usage, depuis la racine du dépôt :  python3 build/build_data.py
"""
import csv
import json
from pathlib import Path

# ---- chemins (regroupés ici pour la lisibilité) ----
RACINE = Path(__file__).resolve().parent.parent
CSV_METEO = RACINE / "data" / "comparaison_meteo.csv"
JSON_STATIONS = RACINE / "data" / "stations.json"
JSON_SITUATIONS = RACINE / "data" / "situations.json"
SORTIE = RACINE / "js" / "data.js"

COLONNES_TEXTE = {"zone", "station", "situation", "fichier"}   # le reste est converti en nombre


def lire_csv():
    """Renvoie {(zone, situation): {colonne: valeur}} avec les indicateurs convertis en float."""
    lignes = {}
    with open(CSV_METEO, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            valeurs = {c: (v if c in COLONNES_TEXTE else float(v)) for c, v in row.items()}
            lignes[(row["zone"], row["situation"])] = valeurs
    return lignes


def main():
    situations = json.loads(JSON_SITUATIONS.read_text(encoding="utf-8"))
    stations = json.loads(JSON_STATIONS.read_text(encoding="utf-8"))
    meteo = lire_csv()

    for st in stations:
        st["valeurs"] = {}
        for sit in situations:
            ligne = meteo.get((st["zone"], sit["cle"]))
            if ligne is None:
                raise SystemExit(f"Ligne manquante dans le CSV : zone {st['zone']}, situation {sit['cle']}")
            # on ne garde que les indicateurs (pas les colonnes d'identification)
            st["valeurs"][sit["cle"]] = {c: v for c, v in ligne.items() if c not in {"zone", "station", "situation"}}

    dump = lambda o: json.dumps(o, ensure_ascii=False)
    SORTIE.write_text(
        "// FICHIER GÉNÉRÉ par build/build_data.py à partir de data/ : ne pas modifier à la main.\n"
        f"const SITUATIONS = {dump(situations)};   // situations comparées, dans l'ordre chronologique\n"
        f"const STATIONS   = {dump(stations)};   // une entrée par zone : station, position, glyphe, valeurs\n",
        encoding="utf-8",
    )
    print(f"{SORTIE.relative_to(RACINE)} écrit : {len(stations)} stations × {len(situations)} situations")


if __name__ == "__main__":
    main()
