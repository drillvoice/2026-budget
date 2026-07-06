# Make Me Tomorrow's Front Page

A satirical **clickbait generator** for a media-reform campaign. You answer a few
harmless questions about your own week, pick how far the truth gets stretched,
and a fictional tabloid — **_The Daily Telegram_** — turns your life into a
front-page scandal, using the exact techniques real tabloids use.

The joke has a point: it's funny because it's about you and it isn't real. For
people caught in the real thing, the distortion has consequences and almost no
accountability. Hence the closing call to action.

## How it works

- **Single-page app**, vanilla JS + CSS, no framework, mobile-first, accessible.
- **Backend is a Cloudflare Pages Function** (`functions/api/generate.js`) that
  calls the Anthropic API. **The API key never touches the browser.**
- The model is prompted to write a tabloid **headline, subhead, two paragraphs**
  and a machine-readable list of the **techniques it used**, returned as JSON:

  ```json
  { "ok": true, "headline": "...", "subhead": "...", "paragraphs": ["...", "..."],
    "techniques_used": [{ "label": "accusation-as-question", "quote": "...", "note": "..." }] }
  ```

- The front end renders it as a newspaper card (masthead, today's date, an
  `EXCLUSIVE` flash, a diagonal `SATIRE` watermark, and the footer line
  _"Generated at [campaign URL] — no watchdog would make them correct this."_),
  offers a **PNG download** (via a locally-vendored `html2canvas`), and expands a
  **"How they did it"** panel that annotates which techniques appear in the copy.

### The dial

| Dial | What the model does |
| --- | --- |
| **True** | Only real facts, lit from the most sinister angle. No criminal allegations. |
| **Embellished** | Distorts timing and scale; the kernel stays recognisable. |
| **Downright Lies** | Fabricates freely, flagged implicitly through absurd over-reach. |

### Guardrails (enforced in the system prompt)

- Content may only concern the user's **own** inputs.
- No real third-party names; organisations get generic labels.
- Nothing sexual, nothing about children, no criminal allegations at **True**.
- Refuses (with a friendly error) if the input contains another person's name or
  hateful content. The `"I'm answering about myself"` checkbox is required and is
  re-checked server-side.

## Project layout

```
index.html              The page
css/style.css           Styles (mobile-first, light/dark, print-card aesthetic)
js/app.js               Form handling, rendering, share, PNG download, counter
vendor/html2canvas.min.js   Vendored so nothing loads from a CDN (CSP-friendly)
assets/getup-logo.svg   Footer partner logo (PLACEHOLDER — swap for the official file)
functions/api/generate.js   Pages Function: calls Anthropic, rate-limits, counts
functions/api/counter.js    Pages Function: returns the running total
_headers                Security headers + strict CSP
wrangler.toml           Pages config + binding documentation
```

The questions asked are: first name, job/role, suburb/town, one mundane thing
you did this week, and **a minor wrongdoing of yours** (the comic engine — a
pinched biscuit, a late library book), plus the required "answering about myself"
checkbox.

The result page has **share buttons** (native share sheet on mobile, plus X,
Facebook, WhatsApp and copy) that lead with the absurd headline, since that's the
most shareable part.

## Deploy on Cloudflare Pages

1. **Create the project** — connect this repo in the Cloudflare dashboard
   (Workers & Pages → Create → Pages), or run `npx wrangler pages deploy .`.
   There is no build step; the output directory is the repo root.

2. **Set the API key** (secret) — Pages project → Settings → Variables and
   Secrets:

   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ```

3. **Add a KV namespace** (optional but recommended — enables IP rate limiting at
   5 requests/hour and the counter):

   ```
   npx wrangler kv namespace create KV
   ```

   Then bind it to the Pages project under the name **`KV`** (dashboard →
   Settings → Bindings, or uncomment the block in `wrangler.toml`). Without it,
   the app still works — rate limiting is skipped and the counter is hidden.

4. **Point it at your campaign** — the petition link is wired to the GetUp
   media-reform campaign; the display URL in the card footer is a constant at the
   top of `js/app.js`:

   ```js
   var CAMPAIGN_URL = "makemethefrontpage.au";
   var PETITION_URL = "https://www.getup.org.au/campaigns/media-reform-2026/...";
   ```

   Replace `assets/getup-logo.svg` with the official GetUp logo (keep the same
   filename); it renders subtly in the footer.

## Run locally

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars   # git-ignored
npx wrangler pages dev .
```

Open the printed local URL. `.dev.vars` supplies the key; add a `preview_id` KV
binding in `wrangler.toml` if you want to exercise rate limiting locally.

## Notes

- Model: `claude-opus-4-8`, called over plain HTTPS from the Function (no SDK, so
  the Function stays dependency-free in the Workers runtime).
- Analytics: none beyond the single self-hosted counter.
- _The Daily Telegram_ is a fictional masthead; stories are generated about the
  person entering their own details.
