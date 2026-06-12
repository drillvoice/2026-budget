# Where do you sit? — The 2026 Budget tax reforms, in proportion

A static, public-interest micro-site explaining who the 2026–27 Federal Budget's three tax
reforms (negative gearing, CGT discount, discretionary trusts) actually touch — built around
a short anonymous "Where do you sit?" quiz that places the visitor in the distribution.

## Principles

- **Neutral civic explainer tone.** Cited, not preachy. Genuine edge cases (the startup CGT
  problem) are acknowledged in their own section, not buried.
- **Every figure is auditable.** All statistics live in [`data/stats.json`](data/stats.json)
  with source title, URL, year, and notes. Citations on the page are rendered from that file,
  so the copy can't drift from the sources.
- **No tracking, no backend, no external dependencies.** The quiz runs entirely client-side;
  nothing is stored or transmitted. No CDN fonts or scripts.

## Structure

```
index.html        All content + quiz markup
css/style.css     Mobile-first styles, no framework
js/quiz.js        Quiz logic + citation/sources rendering (reads the data files)
data/stats.json   Every cited figure (single source of truth)
data/quiz.json    Quiz questions, options, and per-answer verdicts
```

## Updating a statistic

Edit the entry in `data/stats.json` (value, source, url, year, notes). Footnote numbers and
the Sources list update automatically. If a figure can't be verified against a primary
source, set `"verified": false` and explain in `notes`.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly via `file://` won't load the JSON data — use a local server.)

## Deploy (GitHub Pages)

1. Repo Settings → Pages → Source: **Deploy from a branch**, select the branch, root folder.
2. `.nojekyll` is included so Pages serves files as-is.

## Disclaimer

General information only — not tax advice. Not affiliated with any party, government agency,
or campaign.
