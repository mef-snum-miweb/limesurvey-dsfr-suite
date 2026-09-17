#!/usr/bin/env python3
"""Applique locale/fr-ls7-patch.po au catalogue français d'un conteneur LimeSurvey.

Pourquoi : le catalogue `locale/fr/fr.mo` livré avec LimeSurvey 7.1.0 a perdu
418 entrées par rapport à 6.16.16 — des `msgid` ont changé en amont (ponctuation
finale) et les traductions sont devenues orphelines. Résultat côté répondant :
des messages de validation en anglais dans un questionnaire français
(limesurvey-theme-dsfr#73).

Le script est **idempotent** et **auto-détectant** : il ne fait rien si le
catalogue du conteneur contient déjà les chaînes du correctif — donc rien sur
un core 6.x, et rien non plus le jour où LimeSurvey publiera un catalogue à
jour. À ce moment-là, supprimer le correctif et ce script.

Usage :
    tools/patch-fr-locale.py <conteneur>
    tools/patch-fr-locale.py limesurvey-dsfr --dry-run
"""

from __future__ import annotations

import argparse
import re
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

MO_PATH = "/var/www/html/locale/fr/fr.mo"
# Helpers qui produisent les messages vus par les répondants.
SOURCE_HELPERS = (
    "/var/www/html/application/helpers/expressions/em_manager_helper.php",
    "/var/www/html/application/helpers/frontend_helper.php",
    "/var/www/html/application/helpers/qanda_helper.php",
)
PATCH_PO = Path(__file__).resolve().parent.parent / "locale" / "fr-ls7-patch.po"


def parse_mo(data: bytes) -> dict[str, str]:
    """Lit un catalogue gettext binaire (format documenté, pas de dépendance)."""
    magic = struct.unpack("<I", data[:4])[0]
    fmt = "<" if magic == 0x950412DE else ">"
    count, orig_off, trans_off = struct.unpack(fmt + "III", data[8:20])
    catalog: dict[str, str] = {}
    for i in range(count):
        o_len, o_pos = struct.unpack(fmt + "II", data[orig_off + i * 8 : orig_off + i * 8 + 8])
        t_len, t_pos = struct.unpack(fmt + "II", data[trans_off + i * 8 : trans_off + i * 8 + 8])
        catalog[data[o_pos : o_pos + o_len].decode("utf-8")] = data[t_pos : t_pos + t_len].decode("utf-8")
    return catalog


def build_mo(catalog: dict[str, str]) -> bytes:
    """Sérialise un catalogue en .mo (little-endian, sans table de hachage)."""
    items = sorted(catalog.items())
    keys = [k.encode("utf-8") for k, _ in items]
    vals = [v.encode("utf-8") for _, v in items]
    count = len(items)
    orig_off = 28
    trans_off = orig_off + count * 8
    data_off = trans_off + count * 8

    orig_table, trans_table, payload = b"", b"", b""
    offset = data_off
    for key in keys:
        orig_table += struct.pack("<II", len(key), offset)
        payload += key + b"\x00"
        offset += len(key) + 1
    for val in vals:
        trans_table += struct.pack("<II", len(val), offset)
        payload += val + b"\x00"
        offset += len(val) + 1

    header = struct.pack("<IIIIIII", 0x950412DE, 0, count, orig_off, trans_off, 0, 0)
    return header + orig_table + trans_table + payload


def parse_po(text: str) -> dict[str, str]:
    """Lecture volontairement minimale : msgid/msgstr sur une ligne, sans pluriels."""
    entries: dict[str, str] = {}
    msgid = None
    unescape = lambda s: s.replace('\\"', '"').replace("\\\\", "\\")
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("msgid "):
            m = re.match(r'msgid "(.*)"$', line)
            msgid = unescape(m.group(1)) if m else None
        elif line.startswith("msgstr ") and msgid:
            m = re.match(r'msgstr "(.*)"$', line)
            if m and m.group(1):
                entries[msgid] = unescape(m.group(1))
            msgid = None
    return entries


def docker(*args: str) -> bytes:
    return subprocess.run(["docker", *args], check=True, capture_output=True).stdout


def strings_used_by_core(container: str) -> set[str]:
    """Chaînes réellement passées à gT() par le core du conteneur.

    C'est ce qui rend le script inoffensif sur un core 6.x : celui-ci utilise
    les anciens msgid (sans ponctuation finale), l'intersection avec le
    correctif est vide, et rien n'est écrit.
    """
    try:
        out = docker("exec", container, "sh", "-c",
                     "grep -rhoE 'gT\\(\"[^\"]{4,140}\"' " + " ".join(SOURCE_HELPERS) + " 2>/dev/null")
    except subprocess.CalledProcessError:
        return set()
    used = set()
    for line in out.decode("utf-8", "replace").splitlines():
        m = re.match(r'gT\("(.*)"$', line.strip())
        if m:
            used.add(m.group(1))
    return used


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("container", help="nom du conteneur LimeSurvey")
    parser.add_argument("--dry-run", action="store_true", help="n'écrit rien, affiche le diagnostic")
    args = parser.parse_args()

    patch = parse_po(PATCH_PO.read_text(encoding="utf-8"))
    if not patch:
        print(f"correctif vide : {PATCH_PO}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory() as tmp:
        local_mo = Path(tmp) / "fr.mo"
        try:
            docker("cp", f"{args.container}:{MO_PATH}", str(local_mo))
        except subprocess.CalledProcessError as exc:
            print(f"catalogue introuvable dans {args.container} : {exc}", file=sys.stderr)
            return 1

        catalog = parse_mo(local_mo.read_bytes())
        used = strings_used_by_core(args.container)
        missing = {k: v for k, v in patch.items() if k not in catalog and (not used or k in used)}
        ignored = len(patch) - len(missing) - len([k for k in patch if k in catalog])
        if ignored:
            print(f"   ({ignored} entrée(s) du correctif ignorée(s) : non utilisées par ce core)")

        if not missing:
            print(f"{args.container} : catalogue déjà complet ({len(catalog)} entrées), rien à faire.")
            return 0

        print(f"{args.container} : {len(missing)} chaîne(s) absente(s) du catalogue français, ajout.")
        if args.dry_run:
            for key in list(missing)[:5]:
                print(f"   + {key[:70]}")
            return 0

        catalog.update(missing)
        local_mo.write_bytes(build_mo(catalog))
        docker("cp", str(local_mo), f"{args.container}:{MO_PATH}")
        docker("exec", args.container, "sh", "-c",
               "rm -rf /var/www/html/tmp/runtime/* /var/www/html/tmp/assets/* 2>/dev/null || true")
        print(f"   catalogue republié ({len(catalog)} entrées) et caches purgés.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
