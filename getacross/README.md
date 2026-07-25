# GetAcross — concept mockup

A single-page mockup of **GetAcross**: a GetUp-branded current affairs and analysis site,
built to illustrate a proposal that GetUp invest in owned broadcast capacity — its own
channels for reaching members directly and shaping the national conversation, in the way
the Australia Institute's *The Point* does.

**This is a mockup, not a publication.** Every headline, byline, quote, statistic and chart
is invented. No real person is depicted or quoted. The branding is an unofficial
interpretation of GetUp's identity and is not endorsed by GetUp. Those disclaimers appear
on the page itself — a red bar at the top and a legal note in the footer — so the file can't
be screenshotted or forwarded without them.

## What it demonstrates

The homepage carries the full editorial proposition in one scroll:

| Section | The argument it makes |
|---|---|
| Lead investigation + live blog rail | Original reporting and rolling live coverage — the two formats that earn citation by other outlets |
| Explainers | Making the machinery legible, the thing campaigns need and news rarely does |
| The Numbers | A chart a day, sourced and reusable — the Australia Institute's most-borrowed franchise |
| Factcheck | Verdict cards; credibility infrastructure that travels further than the original claim |
| The Cut | Opinion, visibly separated from reporting |
| Listen & watch | Podcast and short video — the formats that reach past existing supporters |
| The Wrap | A daily newsletter: the owned distribution channel the whole thing feeds |

## Design notes

- **GetUp's real identity.** Orange `#ff671f` on white, a bright blue accent, heavy black type,
  and the faint graph-paper grid GetUp uses across its site. The wordmark echoes the GetUp!
  logotype: a heavy black italic with an orange underline swoosh and orange exclamation.
- **Newspaper furniture on top.** Flat rules, no rounded corners, and screen-printed halftone
  art built entirely from CSS gradients — no image files, no external requests.
- **Typography encodes the editorial rule.** Reported news is set in the serif; opinion is set
  in the grotesque. The typeface tells you whether you're reading reporting or argument
  before you read the byline.
- **Orange used once, loudly.** The palette stays disciplined — orange for action, live and
  the newsletter block; blue for topic labels and links; black for chrome; white for the page.
  The daily-newsletter block is the single full-orange moment.
- **Two themes.** Light and dark are both designed, not inverted. Chrome (nav, footer, avatars)
  stays dark in both; story art keeps the same ink in both — a printed image doesn't change
  colour when the reader flips their theme.

## For the pitch

The deliverable is a single PowerPoint slide showing a screenshot of the homepage, so the
**top of the page — masthead, nav, lead story and live rail — is what carries the argument**.
The rest is built out in full for any Board member who wants to click deeper.

### Swapping in real brand assets

Every colour is a custom property at the top of `css/getacross.css` (`--brand` is the orange,
`--blue` the accent). Adjusting the palette means editing the `:root` block and its two
dark-mode counterparts — nothing else references a raw hex. The type stack is two variables
in the same block (`--serif`, `--grot`);
they resolve to fonts already on the reader's machine, so if GetUp has licensed faces, drop
in a `@font-face` and change those two lines.

The chart's two series colours were validated for colour-blind separation and contrast in
both modes; if you re-colour them, re-validate rather than eyeballing.

## Structure

```
index.html            The whole page
css/getacross.css     Tokens, layout, both themes
js/getacross.js       Chart rendering, tooltip, table view, inert signup form
```

No build step, no dependencies, no network calls, no storage. The signup form is deliberately
inert and says so when submitted.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000/getacross/
```
