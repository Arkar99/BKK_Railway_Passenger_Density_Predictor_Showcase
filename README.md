# Team RoBot · Bangkok Rail Crowd Levels (static website)

Multi-page static site for the data mining project. No build step and no server needed:
open `index.html` in a browser, or publish the folder as-is.

## Folder map

| Path | What it is |
|---|---|
| `index.html` and the other `*.html` | The 8 pages (Home, Data, CRISP-DM, Cleaning, Explore, Models, Results, Issues) |
| `assets/js/config.js` | **Your personal info.** Edit this file to replace every `[Placeholder]` |
| `assets/js/charts.js` | Shared chart toolkit (colours, tooltip, number formats, sparkline) |
| `assets/js/charts-explore.js` | Waterfall, flag map, heatmap, diverging bars, timeline (Cleaning and Explore pages) |
| `assets/js/charts-model.js` | Fold strip, small tree, ROC, confusion matrix (Models and Results pages) |
| `assets/js/charts-more.js` | More chart types: bars, grouped bars, timeline, histogram, share bars, legend |
| `assets/js/common.js` | Navigation bar and footer shared by all pages |
| `assets/css/style.css` | The dark train-themed design system |
| `assets/vendor/d3.min.js` | D3 7.9.0 (ISC licence, see `d3-LICENSE.txt`), bundled so the site works offline |
| `data/json/*.json` | The files exported by Part D of the notebook (`site_data.zip`) |
| `data/site-data.js` | The same data bundled for the pages (generated, do not edit by hand) |
| `tools/make_data_js.py` | Regenerates `data/site-data.js` from `data/json/` |

## Fill in your information
Open `assets/js/config.js`. Anything written like `"[Your Full Name]"` shows as an amber dashed
placeholder on the site. Replace it with the real text. Link placeholders (GitHub, notebook, dataset,
web app) become clickable links once you put a real URL in.

## Update the data after re-running the notebook
1. Unzip the new `site_data.zip` into `data/json/` (replace the old files).
2. Run `python tools/make_data_js.py` from this folder.
3. Reload the site. Every number and chart updates; nothing is typed by hand.

## Publish on GitHub Pages (links work without login)
1. Create a **public** repository and upload everything in this folder.
2. Repository Settings, Pages, Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.
   Put that address and the repository link into `config.js` and the report.

## Review form checklist (Milestone #3)

| Item | Where | Status |
|---|---|---|
| Team | Home (team card) and footer | Done, personal info is a placeholder |
| Problem & data | Data page (question, source, size, label rule, thresholds) | Done |
| Data cleaning | Cleaning page (waterfall, problem map, decision table) | Done |
| CRISP-DM explained | CRISP-DM page (cycle, per-phase evidence, loop-backs) | Done |
| Models & results | Models and Results pages | Done |
| Evaluation (CV, no leakage, P/R/F1/AUC) | Results page (table, CV folds, confusion, ROC) and Models page (leakage) | Done |
| Open issues | Issues page (issues, evidence, next steps) | Done |
| Website (links, code and data linked) | Footer on every page, Issues page | Done once you fill in config.js |
