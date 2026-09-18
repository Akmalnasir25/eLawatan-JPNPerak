"""Jana src/demo/sekolah-perak.sql daripada senarai rasmi sekolah (Excel KPM).

    python infra/jana-sekolah-demo.py "Maklumat Umum Sekolah di Negeri Perak.xlsx"

Hanya pustaka standard Python — tiada openpyxl diperlukan. Padanan PPD dan
jenis sekolah sama seperti import Pentadbir (src/lib/import-sekolah.ts).
Hasilnya dimuatkan oleh mod demo sahaja; pengeluaran mengimport senarai
melalui Pentadbiran → Import Akaun.
"""

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
AKAR = Path(__file__).resolve().parent.parent

# Nama PPD dalam migrasi data_rujukan → kod sistem.
PPD = {
    "PPD Batang Padang": "PRK-BP", "PPD Manjung": "PRK-MJ", "PPD Kinta Utara": "PRK-KU",
    "PPD Kinta Selatan": "PRK-KS", "PPD Kerian": "PRK-KR", "PPD Kuala Kangsar": "PRK-KK",
    "PPD Larut, Matang dan Selama": "PRK-LMS", "PPD Hilir Perak": "PRK-HP",
    "PPD Perak Tengah": "PRK-PT", "PPD Hulu Perak": "PRK-HU", "PPD Bagan Datuk": "PRK-BD",
    "PPD Muallim": "PRK-MU", "PPD Kampar": "PRK-KP",
}


def normal_ppd(s: str) -> str:
    s = re.sub(r"[^A-Z0-9]+", " ", s.upper())
    s = re.sub(r"\bDAN\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


KOD_PPD = {normal_ppd(n): k for n, k in PPD.items()}


def jenis(peringkat: str, label: str) -> str:
    l = label.strip().upper()
    if "KHAS" in l and "MODEL" not in l:
        return "KHAS"
    if l == "SBP":
        return "SBP"
    if l == "KV":
        return "TEKNIK"
    if "SABK" in l or l == "SMKA":
        return "AGAMA"
    return "MENENGAH" if peringkat.strip().lower().startswith("menengah") else "RENDAH"


def telefon(s: str):
    d = re.sub(r"\D", "", s or "")
    if len(d) < 7:
        return None
    d = d if d.startswith("0") else "0" + d
    return f"{d[:2]}-{d[2:]}"


def sql(v):
    return "null" if v in (None, "") else "'" + str(v).replace("'", "''") + "'"


def baca(fail: Path):
    z = zipfile.ZipFile(fail)
    kongsi = [
        "".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)
    ]
    baris = ET.fromstring(z.read("xl/worksheets/sheet1.xml")).find("m:sheetData", NS)
    hasil = []
    for r in baris.findall("m:row", NS):
        d = {}
        for c in r.findall("m:c", NS):
            v = c.find("m:v", NS)
            nilai = "" if v is None else (kongsi[int(v.text)] if c.get("t") == "s" else v.text)
            d[re.match(r"[A-Z]+", c.get("r")).group()] = (nilai or "").strip()
        hasil.append(d)
    kepala = hasil[0]
    return [{kepala[k]: v for k, v in b.items() if k in kepala} for b in hasil[1:]]


def main():
    fail = Path(sys.argv[1] if len(sys.argv) > 1 else AKAR / "Maklumat Umum Sekolah di Negeri Perak.xlsx")
    rekod = baca(fail)
    nilai, ditolak = [], []
    for b in rekod:
        kod_ppd = KOD_PPD.get(normal_ppd(b.get("PPD", "")))
        if not kod_ppd or not b.get("KODSEKOLAH") or not b.get("EMAIL"):
            ditolak.append(b.get("KODSEKOLAH"))
            continue
        nilai.append(
            "  ({}, {}, {}, {}, {}, {}, {}, {})".format(
                sql(b["KODSEKOLAH"].upper()), sql(b["NAMASEKOLAH"]),
                sql(jenis(b.get("PERINGKAT", ""), b.get("JENIS/LABEL", ""))),
                sql(b["EMAIL"].lower()), sql(kod_ppd), sql(b.get("POSKODSURAT")),
                sql((b.get("BANDARSURAT") or "").title() or None), sql(telefon(b.get("NOTELEFON", ""))),
            )
        )
    keluar = AKAR / "src" / "demo" / "sekolah-perak.sql"
    keluar.write_text(
        "-- Dijana oleh infra/jana-sekolah-demo.py daripada senarai rasmi sekolah KPM.\n"
        "-- Mod demo sahaja. Jangan sunting dengan tangan.\n"
        "insert into sekolah (kod_sekolah, nama, jenis, emel, kod_ppd, poskod, bandar, telefon) values\n"
        + ",\n".join(nilai)
        + "\non conflict do nothing;\n",
        encoding="utf-8",
    )
    print(f"{len(nilai)} sekolah ditulis ke {keluar.relative_to(AKAR)}; {len(ditolak)} ditolak: {ditolak[:10]}")


if __name__ == "__main__":
    main()
