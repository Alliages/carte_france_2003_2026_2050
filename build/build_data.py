#!/usr/bin/env python3
"""Génère js/data.js à partir des fichiers du dossier data/.

Sources (à modifier, jamais js/data.js à la main) :
  - data/comparaison_meteo.csv : une ligne par station et par situation (colonnes = indicateurs)
  - data/stations.json         : zone, nom de la station, position sur la carte (x, y) et du glyphe (gx, gy)
  - data/situations.json       : situations comparées (clé, année, libellé, couleur), dans l'ordre d'affichage
  - data/indicateurs.csv       : libellé, unité, ordre, actif, bulle, décimales de chaque indicateur
  - data/hypotheses.csv        : valeurs des repères [[hyp:...]] cités dans les libellés et les bulles
    (ces deux fichiers viennent de config/ du dépôt Alliages/vulgarisateur_DH, « Météo & Chaleur »)

Usage, depuis la racine du dépôt :  python3 build/build_data.py
"""
import csv
import json
import re
from pathlib import Path

# ---- chemins (regroupés ici pour la lisibilité) ----
RACINE = Path(__file__).resolve().parent.parent
CSV_METEO = RACINE / "data" / "comparaison_meteo.csv"
JSON_STATIONS = RACINE / "data" / "stations.json"
JSON_SITUATIONS = RACINE / "data" / "situations.json"
CSV_INDICATEURS = RACINE / "data" / "indicateurs.csv"
CSV_HYPOTHESES = RACINE / "data" / "hypotheses.csv"
SORTIE = RACINE / "js" / "data.js"

MOTIF_REPERE = re.compile(r"\[\[hyp:([\w]+)\]\]")   # [[hyp:seuil_nuit_tropicale]]
# Les bulles renvoient aux « réglages » de l'outil Météo & Chaleur, qui a calculé les indicateurs
REGLAGES = ("les réglages", "les réglages de l'outil Météo & Chaleur")

COLONNES_TEXTE = {"zone", "station", "situation", "fichier"}   # le reste est converti en nombre


def lire_csv():
    """Renvoie {(zone, situation): {colonne: valeur}} avec les indicateurs convertis en float."""
    lignes = {}
    with open(CSV_METEO, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            valeurs = {c: (v if c in COLONNES_TEXTE else float(v)) for c, v in row.items()}
            lignes[(row["zone"], row["situation"])] = valeurs
    return lignes


def lire_csv_pv(chemin):
    """Lit un CSV à séparateur « ; » (UTF-8, avec ou sans BOM, fins de ligne Windows acceptées)."""
    with open(chemin, encoding="utf-8-sig", newline="") as f:
        return [r for r in csv.DictReader(f, delimiter=";") if r.get("id")]


def remplacer_reperes(texte, hyp):
    """[[hyp:seuil_nuit_tropicale]] → « 20 » ; arrêt avec un message si un repère est inconnu."""
    def _rempl(m):
        if m.group(1) not in hyp:
            raise SystemExit(f"Repère inconnu dans indicateurs.csv : [[hyp:{m.group(1)}]] (absent de hypotheses.csv)")
        v = hyp[m.group(1)]
        try:
            return f"{float(v):g}".replace(".", ",")   # 97.5 → « 97,5 », 20 → « 20 »
        except ValueError:
            return v
    return MOTIF_REPERE.sub(_rempl, texte)


def lire_indicateurs(colonnes):
    """Liste des indicateurs (triée par « ordre »), libellés et bulles résolus."""
    hyp = {r["id"]: r["valeur"] for r in lire_csv_pv(CSV_HYPOTHESES)}
    liste = []
    for r in sorted(lire_csv_pv(CSV_INDICATEURS), key=lambda r: float(r["ordre"])):
        if r["id"] not in colonnes:
            print(f"  ignoré : {r['id']} (pas de colonne dans comparaison_meteo.csv)")
            continue
        liste.append({
            "id": r["id"],
            "libelle": remplacer_reperes(r["libelle"], hyp),
            "unite": r["unite"],
            "actif": r["actif"].strip() == "1",
            "bulle": remplacer_reperes(r["bulle"], hyp).replace(*REGLAGES),
            "decimales": int(r["decimales"] or 0),
        })
    return liste


def main():
    situations = json.loads(JSON_SITUATIONS.read_text(encoding="utf-8"))
    stations = json.loads(JSON_STATIONS.read_text(encoding="utf-8"))
    meteo = lire_csv()
    colonnes = set(next(iter(meteo.values()))) - COLONNES_TEXTE
    indicateurs = lire_indicateurs(colonnes)

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
        f"const STATIONS   = {dump(stations)};   // une entrée par zone : station, position, glyphe, valeurs\n"
        f"const INDICATEURS_LISTE = {dump(indicateurs)};   // indicateurs triés par ordre (libellé, unité, bulle…)\n",
        encoding="utf-8",
    )
    print(f"{SORTIE.relative_to(RACINE)} écrit : {len(stations)} stations × {len(situations)} situations, "
          f"{len(indicateurs)} indicateurs")


if __name__ == "__main__":
    main()
