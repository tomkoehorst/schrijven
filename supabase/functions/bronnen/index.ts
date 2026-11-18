// Schrijfkamer — Edge Function "bronnen"
// Haalt artikelen op (leesbare tekst) en zoekt op internet via Brave Search.
// Plak dit in Supabase → Edge Functions → Deploy a new function → Via Editor (naam: bronnen).
// Voor zoeken op internet: Edge Functions → Secrets → BRAVE_API_KEY.
// Zet bij deze functie "Verify JWT" UIT: de functie controleert zelf of je bent ingelogd
// (werkt ook met de nieuwe sb_publishable_-sleutels).

import { Readability } from "npm:@mozilla/readability@0.5.0";
import { parseHTML } from "npm:linkedom@0.18.5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!(await isLoggedIn(req))) return json({ error: "Niet ingelogd — log opnieuw in in de app" }, 401);
    const { action, url, q } = await req.json();
    if (action === "fetch") return json(await fetchArticle(String(url || "")));
    if (action === "search") return json(await search(String(q || "")));
    if (action === "ping") return json({ ok: true, search: !!Deno.env.get("BRAVE_API_KEY") });
    return json({ error: "Onbekende actie" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

/* ---------- Alleen voor ingelogde gebruikers van dit project ---------- */
async function isLoggedIn(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const base = Deno.env.get("SUPABASE_URL");
  if (!auth.startsWith("Bearer ") || !base) return false;
  try {
    const r = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  } catch { return false; }
}

/* ---------- Artikel ophalen ---------- */
async function fetchArticle(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Dat is geen geldige link"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Alleen http- en https-links");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) throw new Error("Deze link kan niet");

  const res = await fetch(u, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "nl,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`De website gaf een fout (${res.status})`);
  const type = res.headers.get("content-type") || "";
  if (!/html|xml/.test(type)) return { url: res.url, title: u.hostname + u.pathname, site: u.hostname, excerpt: "", content: "", note: "Geen webpagina (" + type.split(";")[0] + ")" };
  const html = (await res.text()).slice(0, 4_000_000);
  return extract(html, res.url || u.href);
}

export function extract(html: string, url: string) {
  const { document } = parseHTML(html);
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute("content")?.trim() || "";
  const host = new URL(url).hostname.replace(/^www\./, "");
  const info = {
    url,
    title: meta('meta[property="og:title"]') || document.querySelector("title")?.textContent?.trim() || host,
    site: meta('meta[property="og:site_name"]') || host,
    excerpt: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
    byline: meta('meta[name="author"]') || meta('meta[property="article:author"]'),
    published: meta('meta[property="article:published_time"]') || meta('meta[name="date"]') || document.querySelector("time[datetime]")?.getAttribute("datetime") || "",
    content: "",
  };
  try {
    const art = new Readability(document as unknown as Document, { charThreshold: 300 }).parse();
    if (art) {
      if (art.title && art.title.length > 3) info.title = art.title.trim();
      if (!info.excerpt && art.excerpt) info.excerpt = art.excerpt.trim();
      if (!info.byline && art.byline) info.byline = art.byline.trim();
      if (art.siteName) info.site = art.siteName.trim();
      info.content = toMarkdown(art.content || "");
    }
  } catch (_) { /* leave content empty */ }
  // "Titel | Site" → "Titel"
  for (const sep of [" | ", " - ", " – ", " — ", " · "]) {
    const i = info.title.lastIndexOf(sep);
    if (i > 10 && info.title.slice(i + sep.length).length < 40) { info.title = info.title.slice(0, i).trim(); break; }
  }
  info.excerpt = info.excerpt.slice(0, 400);
  info.content = info.content.slice(0, 200_000);
  return info;
}

/* Simple HTML → Markdown for reading in the app */
function toMarkdown(html: string) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  const out: string[] = [];
  const inline = (el: any): string => {
    let s = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.textContent;
      else if (n.nodeType === 1) {
        const t = n.tagName.toLowerCase();
        const inner = inline(n);
        const [, lead, core, trail] = inner.match(/^(\s*)([\s\S]*?)(\s*)$/) || ["", "", inner, ""];
        if (t === "strong" || t === "b") s += core ? `${lead}**${core}**${trail}` : inner;
        else if (t === "em" || t === "i") s += core ? `${lead}*${core}*${trail}` : inner;
        else if (t === "a" && /^https?:/.test(n.getAttribute("href") || "")) s += inner.trim() ? `[${inner.trim()}](${n.getAttribute("href")})` : "";
        else if (t === "br") s += "\n";
        else if (t === "img" || t === "script" || t === "style" || t === "figure" || t === "svg") s += "";
        else s += inner;
      }
    }
    return s;
  };
  const clean = (s: string) => s.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim();
  const walk = (el: any) => {
    for (const n of el.children) {
      const t = n.tagName.toLowerCase();
      if (/^h[1-6]$/.test(t)) { const s = clean(n.textContent || ""); if (s) out.push("#".repeat(Math.min(3, Math.max(2, +t[1]))) + " " + s); }
      else if (t === "p") { const s = clean(inline(n)); if (s) out.push(s); }
      else if (t === "blockquote") { const s = clean(n.textContent || ""); if (s) out.push(s.split("\n").map((l) => "> " + l).join("\n")); }
      else if (t === "ul" || t === "ol") {
        let i = 1;
        const items = [...n.children].filter((li: any) => li.tagName.toLowerCase() === "li").map((li: any) => (t === "ol" ? `${i++}. ` : "- ") + clean(inline(li)).replace(/\n/g, " ")).filter((x: string) => x.length > 3);
        if (items.length) out.push(items.join("\n"));
      }
      else if (t === "pre") { const s = (n.textContent || "").trim(); if (s) out.push("```\n" + s + "\n```"); }
      else if (t === "hr") out.push("---");
      else if (t === "figure" || t === "img" || t === "picture" || t === "script" || t === "style" || t === "table" || t === "nav" || t === "aside") continue;
      else if (n.children.length) walk(n);
      else { const s = clean(n.textContent || ""); if (s) out.push(s); }
    }
  };
  walk(document.body);
  return out.join("\n\n");
}

/* ---------- Zoeken op internet (Brave Search) ---------- */
async function search(q: string) {
  const key = Deno.env.get("BRAVE_API_KEY");
  if (!key) throw new Error("Zoeken op internet is nog niet ingesteld (BRAVE_API_KEY ontbreekt)");
  if (!q.trim()) return { results: [] };
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", q);
  u.searchParams.set("count", "12");
  u.searchParams.set("country", "NL");
  u.searchParams.set("search_lang", "nl");
  u.searchParams.set("safesearch", "moderate");
  const res = await fetch(u, { headers: { "Accept": "application/json", "X-Subscription-Token": key }, signal: AbortSignal.timeout(10000) });
  if (res.status === 429) throw new Error("Zoeklimiet bereikt — probeer het later of volgende maand opnieuw");
  if (!res.ok) throw new Error(`Zoeken mislukt (${res.status})`);
  const data = await res.json();
  const strip = (s = "") => s.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  return {
    results: (data?.web?.results || []).map((r: any) => ({
      title: strip(r.title), url: r.url, description: strip(r.description),
      site: r.profile?.name || r.meta_url?.hostname || "", age: r.age || "",
    })),
  };
}
