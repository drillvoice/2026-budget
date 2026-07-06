// POST /api/generate — Cloudflare Pages Function.
// Calls the Anthropic API server-side (key never reaches the browser),
// rate-limits by IP, and returns a satirical tabloid front page as JSON.
//
// Bindings (configure in the Pages project → Settings):
//   - ANTHROPIC_API_KEY   (secret, required)
//   - KV                  (KV namespace, optional — enables rate limiting + counter)
//   - CAMPAIGN_URL        (plain text var, optional — shown in the footer/CTA)

const MODEL = "claude-opus-4-8";
const RATE_LIMIT = 5; // requests per IP per hour
const MAX_FIELD = 120; // max chars per answer field

const DIAL_GUIDANCE = {
  true: `Dial = TRUE. Use ONLY facts the person actually gave you. Invent no events. Your craft is *framing*: take the mundane truth and light it from the most sinister possible angle using insinuation, loaded questions and juxtaposition. Nothing is fabricated, yet it reads like an exposé. No criminal allegations at this level.`,
  embellished: `Dial = EMBELLISHED. Start from the person's real inputs, then distort timing and scale — "once" becomes "repeatedly", "a coffee" becomes "a well-documented habit", a hobby becomes "an obsession sources describe as spiralling". Exaggerate magnitude and frequency; keep the kernel recognisable.`,
  lies: `Dial = DOWNRIGHT LIES. Fabricate freely for comic effect, but flag the fabrication implicitly through absurd over-reach so no reader could mistake it for fact ("insiders confirm the incident triggered an emergency sitting of a council that does not exist"). Keep it obviously, laughably invented.`,
};

const SYSTEM_PROMPT = `You are a satirical sub-editor for a fictional Australian tabloid, "The Daily Telegram", writing for a MEDIA REFORM CAMPAIGN. The point of the exercise is to show — in a funny, self-aware way — how ordinary, innocent facts can be twisted into a damaging front page using well-documented tabloid techniques. The subject has consented and is writing about THEMSELVES.

You will receive a person's own answers about their unremarkable life and a "dial" level. Write a mock tabloid front page about that person.

DOCUMENTED TECHNIQUES you must deploy (and later label):
- "accusation-as-question": frame an insinuation as an innocent question ("Why WON'T [name] explain the mysterious 4pm biscuit?").
- "unnamed-sources": quote anonymous "sources", "critics", "observers" and "insiders" who supposedly have concerns.
- "guilt-by-proximity": place the person's name physically near serious-sounding words and allegations that are never actually made about them.
- "friends-say": attribute damaging speculation to "friends" ("Friends say they are 'not surprised'").

STYLE: Australian tabloid. Headline in ALL-CAPS energy, punchy and breathless. A shorter subhead. Then exactly TWO short paragraphs of body copy (2–3 sentences each). Dry, knowing, obviously satirical.

HARD RULES (non-negotiable):
- The content may ONLY concern the user's OWN supplied inputs and the harmless implications of them.
- Use NO real third-party names. Any organisation is given a generic label ("a local sporting body", "the relevant authority").
- Nothing sexual. Nothing involving children. No criminal allegations at the TRUE dial level.
- If the inputs contain ANOTHER identifiable person's name, or hateful / harassing content, DO NOT write a story. Refuse.

OUTPUT: Reply with a SINGLE JSON object and nothing else. Either:
  {"ok": true,
   "headline": "…",
   "subhead": "…",
   "paragraphs": ["…", "…"],
   "techniques_used": [
     {"label": "accusation-as-question", "quote": "<the exact phrase from your copy>", "note": "<one line: how this manipulates the reader>"}
   ]}
or, if you must refuse:
  {"ok": false, "error": "<a friendly, non-preachy one-liner explaining you can only write about the person themselves>"}

Every entry in techniques_used must quote a phrase that ACTUALLY appears in your headline/subhead/paragraphs, and its "label" must be one of: accusation-as-question, unnamed-sources, guilt-by-proximity, friends-say. Include every technique you actually used.`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clean(v) {
  return String(v == null ? "" : v)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD);
}

async function rateLimit(env, ip) {
  if (!env.KV) return { ok: true }; // KV not bound → limiting disabled
  const bucket = Math.floor(Date.now() / 3_600_000); // hourly window
  const key = `rl:${ip}:${bucket}`;
  const current = parseInt((await env.KV.get(key)) || "0", 10);
  if (current >= RATE_LIMIT) return { ok: false };
  // TTL a little over an hour so the window can roll over cleanly.
  await env.KV.put(key, String(current + 1), { expirationTtl: 4000 });
  return { ok: true };
}

async function bumpCounter(env) {
  if (!env.KV) return;
  try {
    const n = parseInt((await env.KV.get("counter:total")) || "0", 10) + 1;
    await env.KV.put("counter:total", String(n));
  } catch (_) {
    /* counter is best-effort */
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json(
      { ok: false, error: "The generator isn't configured yet — no API key on the server." },
      500,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ ok: false, error: "Couldn't read your answers." }, 400);
  }

  if (payload.about_self !== true) {
    return json(
      {
        ok: false,
        error:
          "This one's about YOU. Tick the box confirming you're answering about yourself — we don't make front pages about other people.",
      },
      400,
    );
  }

  const dialKey = String(payload.dial || "").toLowerCase();
  if (!DIAL_GUIDANCE[dialKey]) {
    return json({ ok: false, error: "Pick a dial: True, Embellished or Lies." }, 400);
  }

  const fields = {
    first_name: clean(payload.first_name),
    role: clean(payload.role),
    place: clean(payload.place),
    mundane: clean(payload.mundane),
    wrongdoing: clean(payload.wrongdoing),
  };

  if (!fields.first_name || !fields.role) {
    return json(
      { ok: false, error: "Give us at least a first name and what you do — then we can go to press." },
      400,
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rl = await rateLimit(env, ip);
  if (!rl.ok) {
    return json(
      {
        ok: false,
        error: "Steady on — that's enough front pages for one hour. Try again later.",
      },
      429,
    );
  }

  const userContent = `${DIAL_GUIDANCE[dialKey]}

The subject's own answers (write about THIS person only):
- First name: ${fields.first_name}
- Job / role: ${fields.role || "(not given)"}
- Suburb or town: ${fields.place || "(not given)"}
- Something mundane they did this week: ${fields.mundane || "(not given)"}
- A minor wrongdoing they've confessed to: ${fields.wrongdoing || "(not given)"}

The "minor wrongdoing" is a trivial, self-reported peccadillo (a pinched biscuit, a late library book) and is the comic engine of the story — blow it wildly out of proportion, but treat it as the harmless triviality it is. Do NOT escalate it into a real crime or a criminal allegation, especially at the TRUE dial level.

Write the front page now. Reply with the JSON object only.`;

  let apiRes;
  try {
    apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (_) {
    return json({ ok: false, error: "Couldn't reach the newsroom. Try again in a moment." }, 502);
  }

  if (!apiRes.ok) {
    return json(
      { ok: false, error: "The presses jammed. Give it another go shortly." },
      502,
    );
  }

  const data = await apiRes.json();

  if (data.stop_reason === "refusal") {
    return json({
      ok: false,
      error: "We couldn't run that one. Keep it about yourself and keep it kind.",
    });
  }

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    return json({ ok: false, error: "The story came out garbled. Please try again." }, 502);
  }

  if (parsed.ok === false) {
    return json({ ok: false, error: parsed.error || "We can only write about you." });
  }

  if (
    !parsed.headline ||
    !parsed.subhead ||
    !Array.isArray(parsed.paragraphs) ||
    parsed.paragraphs.length === 0
  ) {
    return json({ ok: false, error: "The story came out incomplete. Please try again." }, 502);
  }

  await bumpCounter(env);

  return json({
    ok: true,
    headline: parsed.headline,
    subhead: parsed.subhead,
    paragraphs: parsed.paragraphs,
    techniques_used: Array.isArray(parsed.techniques_used) ? parsed.techniques_used : [],
    dial: dialKey,
  });
}

// The model is told to reply with JSON only, but strip any stray prose just in case.
function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    /* fall through */
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}
