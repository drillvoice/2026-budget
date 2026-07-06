// GET /api/counter — returns the running total of front pages generated.
// Best-effort; returns null when the KV namespace isn't bound.
export async function onRequestGet(context) {
  const { env } = context;
  let total = null;
  if (env.KV) {
    try {
      total = parseInt((await env.KV.get("counter:total")) || "0", 10);
    } catch (_) {
      total = null;
    }
  }
  return new Response(JSON.stringify({ total }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
