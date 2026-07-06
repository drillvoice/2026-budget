// GET /p/<id> — server-rendered permalink for a generated front page.
// Shares point here so the link unfurls with the actual headline (og:title)
// and recipients land on the scandal itself, with a "make yours" loop back
// to the generator and the petition CTA.
//
// Pages are stored by /api/generate under page:<id> (output only — never the
// raw form inputs) and expire after 30 days. Requires the KV binding.

const DISPLAY_URL = "makemethefrontpage.site";
const PETITION_URL =
  "https://www.getup.org.au/campaigns/media-reform-2026/press-council/time-to-fix-australia-s-broken-media" +
  "?utm_source=frontpage&utm_medium=permalink&utm_campaign=media-reform";

const TECH_NAMES = {
  "accusation-as-question": "Accusation as a question",
  "unnamed-sources": 'Unnamed "sources" & "critics"',
  "guilt-by-proximity": "Guilt by proximity",
  "friends-say": '"Friends say" construction',
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function html(body, status = 200, cache = "public, max-age=300") {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cache,
    },
  });
}

function longDate(ts) {
  try {
    return new Date(ts || Date.now()).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
  } catch (_) {
    return new Date(ts || Date.now()).toDateString();
  }
}

function notFoundPage(origin) {
  return html(
    `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>This front page has been pulped</title>
<meta name="robots" content="noindex" />
<link rel="stylesheet" href="/css/style.css" />
</head>
<body>
<main>
  <header class="intro">
    <p class="kicker">A media reform campaign</p>
    <h1>This front page has been pulped</h1>
    <p class="lede">Old scandals expire after 30 days — unlike the real thing, which follows people around forever.</p>
    <p><a class="btn btn--primary" href="${esc(origin)}/">Print your own front page</a></p>
  </header>
</main>
</body>
</html>`,
    404,
    "no-store",
  );
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const origin = new URL(request.url).origin;

  const id = String(params.id || "").toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(id) || !env.KV) {
    return notFoundPage(origin);
  }

  let page = null;
  try {
    page = JSON.parse((await env.KV.get(`page:${id}`)) || "null");
  } catch (_) {
    page = null;
  }
  if (!page || !page.headline || !Array.isArray(page.paragraphs)) {
    return notFoundPage(origin);
  }

  const pageUrl = `${origin}/p/${id}`;
  const shareDesc = page.subhead || "A tabloid front page generated from someone's boring week.";
  const paragraphs = page.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n");

  const techs = (Array.isArray(page.techniques_used) ? page.techniques_used : [])
    .map(
      (t) => `<li>
  <span class="tech-label">${esc(TECH_NAMES[t.label] || t.label || "Technique")}</span>
  ${t.quote ? `<div class="tech-quote">“${esc(t.quote)}”</div>` : ""}
  ${t.note ? `<div class="tech-note">${esc(t.note)}</div>` : ""}
</li>`,
    )
    .join("\n");

  return html(`<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(page.headline)} — The Daily Telegram (satire)</title>
<meta name="description" content="${esc(shareDesc)}" />
<meta name="color-scheme" content="light dark" />
<link rel="canonical" href="${esc(pageUrl)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:site_name" content="Make Me Tomorrow's Front Page" />
<meta property="og:title" content="${esc(page.headline)}" />
<meta property="og:description" content="${esc(shareDesc)}" />
<meta property="og:image" content="${esc(origin)}/assets/share-card.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.headline)}" />
<meta name="twitter:description" content="${esc(shareDesc)}" />
<meta name="twitter:image" content="${esc(origin)}/assets/share-card.png" />
<link rel="stylesheet" href="/css/style.css" />
</head>
<body>
<header class="intro">
  <p class="kicker">A media reform campaign</p>
  <h1>Somebody's front page</h1>
  <p class="lede">A real person fed a fictional tabloid their boring week. This is what it printed.</p>
</header>
<main>
  <section aria-label="The front page">
    <div id="paper-wrap">
      <article class="paper">
        <div class="paper__masthead">
          <span class="paper__price">50¢</span>
          <span class="paper__name">The Daily Telegram</span>
          <span class="paper__date">${esc(longDate(page.created))}</span>
        </div>
        <div class="paper__flash">EXCLUSIVE</div>
        <h2 class="paper__headline">${esc(page.headline)}</h2>
        <p class="paper__subhead">${esc(page.subhead)}</p>
        <div class="paper__body">
${paragraphs}
        </div>
        <p class="paper__footer">Generated at ${esc(DISPLAY_URL)} — no watchdog would make them correct this.</p>
        <div class="paper__watermark" aria-hidden="true">SATIRE</div>
      </article>
    </div>

    ${
      techs
        ? `<details class="how" open>
      <summary>How they did it — the techniques in this story</summary>
      <ul class="how-list">
${techs}
      </ul>
      <p class="how-foot">
        None of these are made up. They're standard tabloid craft — and there's
        no watchdog that would make a newspaper correct any of it.
      </p>
    </details>`
        : ""
    }

    <div class="cta-inline">
      <p>Funny for them — real people don't get a <strong>SATIRE</strong> watermark.</p>
      <a class="btn btn--primary" href="${esc(PETITION_URL)}" rel="noopener">
        Sign the petition for real media accountability
      </a>
    </div>

    <div class="actions">
      <a class="btn" href="${esc(origin)}/?utm_source=frontpage&amp;utm_medium=permalink&amp;utm_campaign=media-reform">
        Make your own front page
      </a>
    </div>
  </section>
</main>
<footer class="site-foot">
  <p class="disclaimer">
    Satire for a media reform campaign. "The Daily Telegram" is a fictional
    masthead. Stories are generated about the person entering their own details.
  </p>
</footer>
</body>
</html>`);
}
