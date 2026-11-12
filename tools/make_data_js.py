"""Bundle data/json/*.json into data/site-data.js (window.SITE_DATA = {...}).

Why: pages load the data with a normal <script> tag, so the site also works when
index.html is opened directly from disk (browsers block fetch() on file://).

Usage (run from the site folder):
    python tools/make_data_js.py
When you re-run the notebook, unzip the new site_data.zip into data/json/ and run this again.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "data" / "json"
names = ["meta", "cleaning", "series", "eda", "labels", "cv", "results", "importance", "tree"]


def reject(const):
    raise ValueError(f"JSON contains {const}; re-export from the notebook")


bundle = {}
for n in names:
    f = src / f"{n}.json"
    if not f.exists():
        raise SystemExit(f"Missing {f}. Unzip site_data.zip into data/json/ first.")
    bundle[n] = json.loads(f.read_text(encoding="utf-8"), parse_constant=reject)

out = root / "data" / "site-data.js"
out.write_text("window.SITE_DATA = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Wrote {out.name} ({out.stat().st_size / 1024:.0f} KB) from {len(names)} JSON files")
