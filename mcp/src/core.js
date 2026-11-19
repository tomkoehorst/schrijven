// Schrijfkamer — kern van de Claude-koppeling (gedeeld door de pc-extensie en de online koppeling)
import { z } from 'zod';
export const VERSION = '1.6.1';
/* Schone tekst: haal Markdown-opmaaktekens weg (**vet**, *cursief*, `code`, tabellen, ---),
   maar laat kopjes (#), lijstjes (-), citaten (>), [[links]] en ?? staan. */
function cleanInline(s){
  return String(s)
    .replace(/<\/?(b|strong|i|em|u)>/gi, '')
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/(^|[^*\w])(\*|_)(?=[^\s*_])([^*_\n]+?)(?<=\S)\2(?![*\w])/g, '$1$3')
    .replace(/\*\*/g, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/(^|[^\[])\[([^\[\]\n]+)\]\((https?:[^)\s]+)\)/g, '$1$2 ($3)');
}
function tableToText(rows){
  const cells = rows.map(r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => cleanInline(c.trim())))
    .filter(r => !r.every(c => /^:?-{2,}:?$/.test(c) || c === ''));
  if (!cells.length) return [];
  if (cells.length === 1) return [cells[0].filter(Boolean).join(' · ')];
  const head = cells[0], out = [];
  for (const r of cells.slice(1)){
    const label = r[0], rest = r.slice(1).map((c, j) => c ? (head[j + 1] && r.length > 2 ? `${head[j + 1]}: ${c}` : c) : '').filter(Boolean);
    if (!label && !rest.length) continue;
    out.push('- ' + (label ? label + (rest.length ? (r.length > 2 ? ' — ' : ': ') + rest.join('; ') : '') : rest.join('; ')));
  }
  return out;
}
export function cleanText(md){
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n'), out = [];
  let code = false;
  for (let i = 0; i < lines.length; i++){
    const l = lines[i];
    if (/^\s*```/.test(l)){ code = !code; continue; }
    if (code){ out.push(l); continue; }
    if (/^\s*\|.*\|\s*$/.test(l)){
      const block = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) block.push(lines[i++]); i--;
      out.push(...tableToText(block)); continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){ out.push(''); continue; }
    out.push(cleanInline(l.replace(/^(\s*)[*+]\s+/, '$1- ')));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function createCore(cfg = {}) {
const SUPABASE_URL = cfg.url || 'https://ssnbuwuqacjaxewrmdgg.supabase.co';
// Keys to try, in order; the first that the project accepts is remembered.
const KEYS = [...new Set([cfg.key, 'sb_publishable_4QtjFhDoIjPgvp0gAnPLkg_AqBLnxxz', ...(cfg.fallbackKeys || [])].filter(Boolean))];
let SUPABASE_KEY = KEYS[0];
const keyKind = k => /^sb_publishable_/.test(k) ? 'publishable-sleutel' : /^eyJ/.test(k) ? 'anon-sleutel (JWT)' : 'sleutel';
const FUNCTION = cfg.fn || 'bronnen';
const EMAIL = cfg.email || '';
const PASSWORD = cfg.password || '';

/* ---------------- Auth & REST ---------------- */
let session = null; // {access_token, refresh_token, expires_at, user_id}
async function authRequest(grant, body) {
  let r, j, tried = [];
  for (const k of [SUPABASE_KEY, ...KEYS.filter(x => x !== SUPABASE_KEY)]) {
    r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: { apikey: k, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    j = await r.json().catch(() => ({}));
    tried.push(keyKind(k));
    if (!/invalid api key|no api key/i.test(j.message || j.msg || '')) { SUPABASE_KEY = k; break; }
  }
  if (!r.ok) {
    const m = j.error_description || j.msg || j.message || `Inloggen mislukt (${r.status})`;
    throw new Error(/invalid api key/i.test(m) ? `${m} — geprobeerd op ${new URL(SUPABASE_URL).host} met: ${tried.join(', ')}` : m);
  }
  session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user_id: j.user && j.user.id };
  return session;
}
async function token() {
  if (session && Date.now() < session.expires_at - 60000) return session.access_token;
  if (session && session.refresh_token) { try { await authRequest('refresh_token', { refresh_token: session.refresh_token }); return session.access_token; } catch (e) { session = null; } }
  if (!EMAIL || !PASSWORD) throw new Error('Vul je e-mailadres en wachtwoord van de Schrijfkamer in bij de instellingen van deze extensie.');
  await authRequest('password', { email: EMAIL, password: PASSWORD });
  return session.access_token;
}
async function rest(method, path, body, prefer) {
  const t = await token();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { j = text; }
  if (!r.ok) throw new Error((j && (j.message || j.error)) || `Database-fout (${r.status})`);
  return j;
}
async function callFunction(body) {
  const t = await token();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}`, {
    method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Edge Function-fout (${r.status})`);
  return j;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const enc = encodeURIComponent;

/* ---------------- Dates (same rules as the app) ---------------- */
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON_RE = MONTHS.join('|') + '|' + EN.join('|') + '|jan|feb|mrt|mar|apr|jun|jul|aug|sep|sept|okt|oct|nov|dec';
function monthIdx(m) {
  m = m.toLowerCase().replace(/\.$/, '');
  if (m === 'mrt' || m === 'mar') return 2; if (m === 'may' || m === 'mei') return 4; if (m === 'okt' || m === 'oct') return 9;
  let i = MONTHS.findIndex(x => x === m || x.startsWith(m.slice(0, 3))); if (i < 0) i = EN.findIndex(x => x === m || x.startsWith(m.slice(0, 3))); return i;
}
function parseDate(str) {
  str = String(str || '').trim(); if (!str) return null;
  let m, bc = false;
  if ((m = str.match(/^(.*?)\s*(v\.\s?chr\.?|v\.\s?c\.?|voor christus|b\.?\s?c\.?(?:e\.?)?)$/i))) { bc = true; str = m[1].trim(); }
  else if ((m = str.match(/^(.*?)\s*(n\.\s?chr\.?|a\.?\s?d\.?|c\.?e\.?)$/i))) str = m[1].trim();
  str = str.replace(/,/g, '');
  const mk = (y, mo, d) => {
    if (!y || mo > 12 || d > 31 || mo < 0) return null;
    if (bc) y = -y;
    return { key: String(y + 100000).padStart(6, '0') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'),
      label: (d ? d + ' ' : '') + (mo ? MONTHS[mo - 1] + ' ' : '') + (y < 0 ? (-y) + ' v.Chr.' : y), year: y };
  };
  if ((m = str.match(new RegExp('^(' + MON_RE + ')\\.?\\s+(\\d{1,2})\\s+(\\d{1,4})$', 'i')))) return mk(+m[3], monthIdx(m[1]) + 1, +m[2]);
  if ((m = str.match(/^(\d{1,4})-(\d{1,2})(?:-(\d{1,2}))?$/)) && m[1].length >= 3) return mk(+m[1], +m[2], m[3] ? +m[3] : 0);
  if ((m = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return mk(+m[3], +m[2], +m[1]);
  if ((m = str.match(new RegExp('^(\\d{1,2})\\s+(' + MON_RE + ')\\.?\\s+(\\d{1,4})$', 'i')))) return mk(+m[3], monthIdx(m[2]) + 1, +m[1]);
  if ((m = str.match(new RegExp('^(' + MON_RE + ')\\.?\\s+(\\d{1,4})$', 'i')))) return mk(+m[2], monthIdx(m[1]) + 1, 0);
  if ((m = str.match(/^(?:ca\.?\s*|rond\s+|circa\s+)?(\d{1,4})$/i))) return mk(+m[1], 0, 0);
  return null;
}

/* ---------------- Helpers ---------------- */
async function groups() {
  const rows = await rest('GET', `profiles?select=groups&user_id=eq.${session.user_id}`);
  return (rows && rows[0] && rows[0].groups) || [];
}
async function projectId(name) {
  if (!name) return '';
  const gs = await groups();
  const g = gs.find(x => x.name.toLowerCase() === String(name).toLowerCase()) || gs.find(x => x.name.toLowerCase().includes(String(name).toLowerCase()));
  if (!g) throw new Error(`Project “${name}” bestaat niet. Bestaande projecten: ${gs.map(x => x.name).join(', ') || '(nog geen)'}. Maak een project aan in de app (Groepen → +).`);
  return g.id;
}
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
/* Same page, different spelling: https/http, www., #anchor, tracking codes, trailing slash */
function normUrl(u) {
  try {
    const x = new URL(String(u).trim());
    x.hash = ''; x.hostname = x.hostname.toLowerCase().replace(/^www\./, ''); x.protocol = 'https:';
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src|igshid|si$)/i.test(k)) x.searchParams.delete(k);
    return decodeURIComponent(x.href).replace(/\/+$/, '').toLowerCase();
  } catch (e) { return String(u || '').trim().toLowerCase(); }
}
let srcIndex = null, srcIndexAt = 0; const inflight = new Map();
async function sourceIndex() {
  if (srcIndex && Date.now() - srcIndexAt < 60000) return srcIndex;
  const rows = await rest('GET', `sources?select=id,title,url&limit=5000`);
  srcIndex = new Map(); for (const r of rows || []) if (r.url) srcIndex.set(normUrl(r.url), { id: r.id, title: r.title });
  srcIndexAt = Date.now(); return srcIndex;
}
const BLOCKED = /just a moment|even checken of je een bot|are you a robot|attention required|checking your browser|verify you are human|access denied|captcha|enable javascript and cookies|ddos protection|pardon our interruption/i;
async function ensureSource(args) {
  await token();
  const key = normUrl(args.url);
  const known = (await sourceIndex()).get(key);
  if (known) return { ...known, existed: true };
  if (inflight.has(key)) return { ...(await inflight.get(key)), existed: true };   // parallel calls for the same page
  const p = createSource(args).then(r => { srcIndex && srcIndex.set(key, { id: r.id, title: r.title }); return r; });
  inflight.set(key, p);
  try { return await p; } finally { inflight.delete(key); }
}
async function createSource({ url, title, project, note, tags }) {
  await checkBudget(project, 'source');
  const id = uid(), now = Date.now();
  const row = { id, user_id: session.user_id, kind: 'article', url, title: title || host(url) || url, site: host(url), byline: '', published: '', excerpt: '', content: '', tags: [...new Set(['ai', ...(tags || [])])], note: note || '', fav: false, created: now, updated: now };
  const grp = await projectId(project); if (grp) row.grp = grp;
  await upsert('sources', row);
  let fetched = false;
  try {
    const a = await callFunction({ action: 'fetch', url });
    if (a.blocked || BLOCKED.test(a.title || '')) {
      row.note = [row.note, 'De website liet de tekst niet ophalen (beveiliging/bot-controle) — open de link zelf.'].filter(Boolean).join(' ');
      row.updated = Date.now(); await upsert('sources', row);
      return { id, title: row.title, existed: false, fetched: false, blocked: true };
    }
    Object.assign(row, { url: a.url || url, title: a.title || row.title, site: a.site || row.site, byline: a.byline || '', published: a.published || '', excerpt: a.excerpt || '', content: a.content || '', updated: Date.now() });
    await upsert('sources', row); fetched = !!a.content;
  } catch (e) { /* keep the link */ }
  return { id, title: row.title, existed: false, fetched };
}
/* ---------- Onderzoeksplan (regelaar) ---------- */
const DEPTHS = { kort: { sources: 6, fragments: 20 }, gemiddeld: { sources: 12, fragments: 40 }, diep: { sources: 25, fragments: 90 } };
const PLAN_HOURS = 12;
async function activePlan(project) {
  if (!project) return null;
  const gs = await groups(); const g = gs.find(x => x.name.toLowerCase() === String(project).toLowerCase()) || gs.find(x => x.name.toLowerCase().includes(String(project).toLowerCase()));
  const r = g && g.research;
  if (!r || r.done || Date.now() - r.start > PLAN_HOURS * 3600e3) return null;
  return { g, gs, r };
}
async function planCounts(gid, since) {
  const [src, sn] = await Promise.all([
    rest('GET', `sources?select=id&grp=eq.${gid}&created=gte.${since}&limit=1000`),
    rest('GET', `snippets?select=id&grp=eq.${gid}&created=gte.${since}&limit=2000`)
  ]);
  return { sources: (src || []).length, fragments: (sn || []).length };
}
const FREE = { sources: 3, fragments: 6, hours: 2 };
const QUESTIONS = 'Vraag de gebruiker eerst, en wacht op het antwoord: (1) waarvoor heb je dit nodig — achtergrond, scènedetails of feiten checken? (2) hoe diep — kort (±6 bronnen), gemiddeld (±12) of diep (±25)? (3) welke focus of periode? (4) wat moet er komen — tijdlijn, fragmenten, personages, dossier? Roep daarna research_plan aan met zijn antwoord.';
async function checkBudget(project, kind, adding = 1) {
  const a = await activePlan(project);
  if (!a) {
    // Without a research plan only a few quick saves are allowed; bulk research needs the user's answers first.
    const since = Date.now() - FREE.hours * 3600e3;
    const gid = project ? await projectId(project).catch(() => '') : '';
    const table = kind === 'source' ? 'sources' : 'snippets';
    const rows = await rest('GET', `${table}?select=id&created=gte.${since}&tags=cs.${enc('["ai"]')}${gid ? '&grp=eq.' + gid : ''}&limit=500`);
    const max = kind === 'source' ? FREE.sources : FREE.fragments, have = (rows || []).length;
    if (have + adding > max) throw new Error(`Zonder onderzoeksplan mag je maar ${max} ${kind === 'source' ? 'bronnen' : 'fragmenten'} per ${FREE.hours} uur bewaren (er zijn er al ${have}). Stop met bewaren. ${QUESTIONS}`);
    return null;
  }
  const c = await planCounts(a.g.id, a.r.start);
  const max = kind === 'source' ? a.r.max_sources : a.r.max_fragments, have = kind === 'source' ? c.sources : c.fragments;
  if (have + adding > max) throw new Error(`Limiet van het onderzoeksplan bereikt (${have}/${max} ${kind === 'source' ? 'bronnen' : 'fragmenten'}, diepte “${a.r.depth}”). Bewaar niets meer: vat samen wat je hebt en vraag de gebruiker of je door mag (dan research_plan opnieuw aanroepen met een hoger maximum) of rond af met finish_research.`);
  return { have: have + adding, max };
}
async function budgetNote(project) {
  const a = await activePlan(project); if (!a) return '';
  const c = await planCounts(a.g.id, a.r.start);
  return ` [Onderzoeksplan: ${c.sources}/${a.r.max_sources} bronnen, ${c.fragments}/${a.r.max_fragments} fragmenten]`;
}
async function upsert(table, row) {
  try { return await rest('POST', table, row, 'resolution=merge-duplicates,return=minimal'); }
  catch (e) { if (/grp/.test(e.message) && 'grp' in row) { const r = { ...row }; delete r.grp; return rest('POST', table, r, 'resolution=merge-duplicates,return=minimal'); } throw e; }
}
async function saveSnippet({ text, date, tags, note, source_url, source_title, project, color }) {
  await token();
  await checkBudget(project, 'fragment');
  let source = null;
  if (source_url) source = await ensureSource({ url: source_url, title: source_title, project });
  const now = Date.now();
  const allTags = [...new Set(['ai', ...(tags || [])].map(t => String(t).replace(/^#/, '').trim()).filter(Boolean))];
  const d = parseDate(date);
  const row = { id: uid(), user_id: session.user_id, source_id: source ? source.id : '', text: cleanText(text).trim(), note: cleanText(note || '').trim(), tags: allTags, date: d ? d.label : '', color: color || '', created: now, updated: now };
  const grp = await projectId(project); if (grp) row.grp = grp;
  await upsert('snippets', row);
  return { row, source };
}
const RULE_TEXT = 'ONDERZOEK: stel de gebruiker bij een onderzoeksvraag EERST deze vragen en wacht op het antwoord — doel (achtergrond/scènes/feiten), diepte (kort/gemiddeld/diep), focus of periode, en wat er moet komen — en leg het vast met research_plan. Zonder plan weigert de koppeling na een paar items.';
const ok = text => ({ content: [{ type: 'text', text }] });
const fail = e => ({ content: [{ type: 'text', text: 'Dat lukte niet: ' + (e.message || e) }], isError: true });
const like = q => `*${String(q).replace(/[,()*%\\]/g, ' ').trim()}*`;

/* ---------------- Server & tools ---------------- */
const tools = [], prompts = [];
  const server = {
    tool: (name, description, shape, handler) => tools.push({ name, description, shape, handler }),
    prompt: (name, description, shape, render) => prompts.push({ name, description, shape, render })
  };

server.tool('list_collection',
  'Geef een overzicht van alle bronnen en/of fragmenten van een project met hun id en huidige tags — bedoeld om de verzameling te ORDENEN (thema-tags geven met set_tags). Voegt niets toe.',
  { project: z.string(), type: z.enum(['bronnen', 'fragmenten', 'beide']).optional(), limit: z.number().int().min(1).max(500).optional() },
  async ({ project, type = 'beide', limit = 300 }) => {
    try {
      await token(); const gid = await projectId(project); const out = [];
      if (type !== 'fragmenten') {
        const rows = await rest('GET', `sources?select=id,title,site,url,tags&grp=eq.${gid}&order=created.desc&limit=${limit}`);
        out.push(`Bronnen (${rows.length}):\n` + rows.map(r => `- [bron ${r.id}] ${r.title} (${r.site || host(r.url)}) tags: ${(r.tags || []).join(', ') || '—'}`).join('\n'));
      }
      if (type !== 'bronnen') {
        const rows = await rest('GET', `snippets?select=id,text,date,tags&grp=eq.${gid}&order=created.desc&limit=${limit}`);
        out.push(`Fragmenten (${rows.length}):\n` + rows.map(r => `- [fragment ${r.id}] ${String(r.text).replace(/\s+/g, ' ').slice(0, 110)}${r.date ? ' (' + r.date + ')' : ''} tags: ${(r.tags || []).join(', ') || '—'}`).join('\n'));
      }
      return ok(out.join('\n\n') + '\n\nTip: kies 4–8 duidelijke thema’s (bv. ambacht, personen, politiek, munt, plaatsen, scène-ideeën) en geef elk item met set_tags één hoofdthema als EERSTE tag.');
    } catch (e) { return fail(e); }
  });

server.tool('set_tags',
  'Geef bronnen en fragmenten (nieuwe) tags om de verzameling te ordenen. De EERSTE tag is het hoofdthema waarop de app groepeert. Houd het overzichtelijk: kies samen met de gebruiker 4 à 6 BREDE thema's voor het hele project (bv. Ambacht, Munt, Politiek, Personen, Plaatsen) en gebruik voor elk item één daarvan als eerste tag — geen bijna-dubbele thema's (Ambacht/Ambachtsman/Stempelsnijder) en geen thema's voor één item; details mogen als 2e/3e tag. De tag "ai" blijft altijd behouden. Voegt geen items toe en telt niet mee voor het onderzoeksplan.',
  {
    items: z.array(z.object({
      id: z.string(), type: z.enum(['bron', 'fragment']),
      tags: z.array(z.string()).min(1).describe('Eerste = hoofdthema, kleine letters, zonder #'),
      mode: z.enum(['vervangen', 'toevoegen']).optional().describe('vervangen (standaard): thema-tags vervangen; toevoegen: erbij zetten')
    })).min(1).max(150)
  },
  async ({ items }) => {
    try {
      await token(); let n = 0; const bad = [];
      for (const it of items) {
        const table = it.type === 'bron' ? 'sources' : 'snippets';
        const rows = await rest('GET', `${table}?select=tags&id=eq.${enc(it.id)}`);
        if (!rows.length) { bad.push(it.id); continue; }
        const clean = it.tags.map(t => String(t).replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
        const old = rows[0].tags || [];
        const keep = old.filter(t => String(t).toLowerCase() === 'ai');
        const tags = [...new Set(it.mode === 'toevoegen' ? [...old.filter(t => t !== 'ai'), ...clean, ...keep] : [...clean, ...keep])];
        await rest('PATCH', `${table}?id=eq.${enc(it.id)}`, { tags, updated: Date.now() }, 'return=minimal');
        n++;
      }
      return ok(`${n} item(s) getagd.${bad.length ? ' Niet gevonden: ' + bad.join(', ') : ''} De app groepeert op de eerste tag (Bronnen → Groep: Thema, Braindump → Per thema).`);
    } catch (e) { return fail(e); }
  });

server.tool('research_plan',
  'Leg een onderzoeksplan vast vóórdat je voor de gebruiker gaat onderzoeken en bewaren. Stel EERST in de chat een paar korte vragen en wacht op het antwoord: (1) waarvoor is het — achtergrond, scènedetails, feiten checken; (2) hoe diep — kort, gemiddeld of diep; (3) welke focus of periode; (4) wat moet er komen — tijdlijn, fragmenten, personages, dossier. Roep dit daarna aan. De koppeling bewaakt het maximum: daarboven weigert hij nieuwe bronnen en fragmenten tot de gebruiker toestemming geeft.',
  {
    project: z.string(), onderwerp: z.string(),
    antwoord_gebruiker: z.string().min(3).describe('Het antwoord van de gebruiker op je vragen, letterlijk overgenomen uit de chat. Verzin dit nooit zelf: heb je de vragen nog niet gesteld, stel ze dan eerst en roep dit pas aan na zijn antwoord.'),
    diepte: z.enum(['kort', 'gemiddeld', 'diep']).describe('kort ≈ 6 bronnen/20 fragmenten, gemiddeld ≈ 12/40, diep ≈ 25/90'),
    doel: z.string().optional().describe('Waarvoor de gebruiker het nodig heeft'),
    focus: z.string().optional().describe('Afbakening: periode, personen, aspecten'),
    max_bronnen: z.number().int().min(1).max(100).optional().describe('Alleen als de gebruiker een eigen aantal noemt'),
    max_fragmenten: z.number().int().min(1).max(300).optional()
  },
  async (a) => {
    try {
      await token();
      const gs = await groups(); const g = gs.find(x => x.name.toLowerCase() === a.project.toLowerCase()) || gs.find(x => x.name.toLowerCase().includes(a.project.toLowerCase()));
      if (!g) return fail(new Error(`Project “${a.project}” bestaat niet. Maak het eerst met create_project.`));
      const d = DEPTHS[a.diepte];
      g.research = { start: Date.now(), depth: a.diepte, topic: a.onderwerp, answer: a.antwoord_gebruiker, goal: a.doel || '', focus: a.focus || '', max_sources: a.max_bronnen || d.sources, max_fragments: a.max_fragmenten || d.fragments, done: false };
      await saveGroups(gs);
      return ok(`Onderzoeksplan vastgelegd voor “${g.name}”: ${a.onderwerp} — diepte ${a.diepte}, maximaal ${g.research.max_sources} bronnen en ${g.research.max_fragments} fragmenten (tijdlijnpunten tellen als fragment). Kies de beste bronnen in plaats van zoveel mogelijk; sla geen dubbele of oppervlakkige pagina's op. Het plan geldt ${PLAN_HOURS} uur of tot finish_research.`);
    } catch (e) { return fail(e); }
  });

server.tool('research_status',
  'Hoeveel bronnen en fragmenten zijn er volgens het lopende onderzoeksplan van een project al bewaard, en hoeveel mogen er nog?',
  { project: z.string() },
  async ({ project }) => {
    try {
      await token(); const a = await activePlan(project);
      if (!a) return ok(`Er loopt geen onderzoeksplan voor “${project}”. ${RULE_TEXT}`);
      const c = await planCounts(a.g.id, a.r.start);
      return ok(`Plan “${a.r.topic}” (${a.r.depth}): ${c.sources}/${a.r.max_sources} bronnen, ${c.fragments}/${a.r.max_fragments} fragmenten.${a.r.focus ? ' Focus: ' + a.r.focus + '.' : ''}`);
    } catch (e) { return fail(e); }
  });

server.tool('finish_research',
  'Rond het lopende onderzoeksplan van een project af (na de samenvatting voor de gebruiker).',
  { project: z.string() },
  async ({ project }) => {
    try {
      await token(); const a = await activePlan(project); if (!a) return ok('Er liep geen onderzoeksplan.');
      const c = await planCounts(a.g.id, a.r.start); a.r.done = true; await saveGroups(a.gs);
      return ok(`Onderzoek “${a.r.topic}” afgerond: ${c.sources} bronnen en ${c.fragments} fragmenten bewaard.`);
    } catch (e) { return fail(e); }
  });

server.tool('save_fragment',
  'Bewaar een fragment (citaat, feit, idee of samenvatting) op de braindump in de Schrijfkamer van de gebruiker. Geef bij voorkeur de bron-URL mee als de informatie van een webpagina komt. Krijgt automatisch de tag "ai". Gebruik dit wanneer de gebruiker vraagt iets te bewaren, op te slaan of te noteren.',
  {
    text: z.string().describe('De tekst van het fragment, in de taal van de gebruiker.'),
    tags: z.array(z.string()).optional().describe('Trefwoorden zonder #, bv. ["rome","munt"].'),
    note: z.string().optional().describe('Korte eigen notitie of context.'),
    date: z.string().optional().describe('Optioneel: datum waarop het fragment betrekking heeft (zet het dan ook op de tijdlijn). Formaten: "1953", "maart 1953", "15 maart 44 v.Chr.", "42 BC".'),
    source_url: z.string().optional().describe('URL van de bron; wordt ook als bron bewaard en het artikel wordt opgehaald.'),
    source_title: z.string().optional().describe('Titel van de bron.'),
    project: z.string().optional().describe('Naam van een project (groep) in de Schrijfkamer, bv. "Roman".')
  },
  async (a) => {
    try {
      if (a.date && !parseDate(a.date)) return fail(new Error(`De datum “${a.date}” herken ik niet. Gebruik bv. 1953, maart 1953, 12 maart 1953 of 42 v.Chr.`));
      const { row, source } = await saveSnippet(a);
      const d = parseDate(row.date);
      return ok(`Bewaard op de braindump${d ? ' en op de tijdlijn bij ' + d.label : ''}.${source ? ` Bron: “${source.title}”${source.existed ? ' (stond er al)' : source.fetched ? ' (artikel opgehaald)' : ''}.` : ''} Tags: ${row.tags.map(t => '#' + t).join(' ')}.`);
    } catch (e) { return fail(e); }
  });

server.tool('add_to_timeline',
  'Zet een gebeurtenis of feit met een datum op de tijdlijn van de gebruiker in de Schrijfkamer. Gebruik dit wanneer de gebruiker iets "op de tijdlijn" wil, of bij een reeks gebeurtenissen met datums (roep het dan per gebeurtenis aan). Datums vóór Christus worden ondersteund.',
  {
    text: z.string().describe('Korte beschrijving van de gebeurtenis, bv. "Brutus laat de Eid Mar-munt slaan".'),
    date: z.string().describe('Datum: "1953", "maart 1953", "1 februari 1953", "15 maart 44 v.Chr." of "42 BC".'),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    source_url: z.string().optional(),
    source_title: z.string().optional(),
    project: z.string().optional()
  },
  async (a) => {
    try {
      const d = parseDate(a.date);
      if (!d) return fail(new Error(`De datum “${a.date}” herken ik niet. Gebruik bv. 1953, maart 1953, 12 maart 1953 of 42 v.Chr.`));
      const { source } = await saveSnippet(a);
      return ok(`Op de tijdlijn gezet bij ${d.label}: “${a.text.slice(0, 80)}”.${source ? ` Bron: “${source.title}”.` : ''}`);
    } catch (e) { return fail(e); }
  });

server.tool('save_source',
  'Bewaar een webpagina of artikel als bron in de Schrijfkamer. De leesbare tekst wordt automatisch opgehaald. Gebruik dit voor nuttige links die de gebruiker later wil lezen of citeren.',
  {
    url: z.string().describe('De URL van de pagina.'),
    title: z.string().optional(),
    note: z.string().optional().describe('Waarom deze bron nuttig is.'),
    tags: z.array(z.string()).optional(),
    project: z.string().optional()
  },
  async (a) => {
    try {
      const s = await ensureSource(a);
      return ok(s.existed ? `Die bron stond al in de Schrijfkamer: “${s.title}”.` : `Bron bewaard: “${s.title}”${s.fetched ? ' (artikel opgehaald)' : ' (alleen de link — de tekst kon niet worden opgehaald)'}.`);
    } catch (e) { return fail(e); }
  });

server.tool('search_collection',
  'Doorzoek de verzameling van de gebruiker in de Schrijfkamer (fragmenten en bronnen, inclusief de volledige tekst van bewaarde artikelen). Gebruik dit om te kijken wat de gebruiker al over een onderwerp heeft verzameld, vóórdat je nieuwe informatie geeft.',
  { query: z.string().describe('Zoekterm, bv. "Brutus" of "munt".'), limit: z.number().int().min(1).max(50).optional() },
  async ({ query, limit = 15 }) => {
    try {
      await token();
      const p = like(query);
      const [sn, src] = await Promise.all([
        rest('GET', `snippets?select=id,text,note,tags,date,source_id&or=(text.ilike.${enc(p)},note.ilike.${enc(p)})&order=created.desc&limit=${limit}`),
        rest('GET', `sources?select=id,kind,title,site,url,excerpt,note,tags&or=(title.ilike.${enc(p)},excerpt.ilike.${enc(p)},note.ilike.${enc(p)},content.ilike.${enc(p)})&order=created.desc&limit=${limit}`)
      ]);
      if (!sn.length && !src.length) return ok(`Niets gevonden voor “${query}” in de Schrijfkamer.`);
      const out = [];
      if (sn.length) out.push(`Fragmenten (${sn.length}):\n` + sn.map(s => `- ${s.date ? '[' + (parseDate(s.date) || { label: s.date }).label + '] ' : ''}${s.text.replace(/\s+/g, ' ').slice(0, 300)}${(s.tags || []).length ? ' ' + s.tags.map(t => '#' + t).join(' ') : ''}`).join('\n'));
      if (src.length) out.push(`Bronnen (${src.length}):\n` + src.map(s => `- ${s.title} (${s.site || host(s.url)})${s.url ? ' ' + s.url : ''}${s.note ? ' — notitie: ' + s.note : ''} [id: ${s.id}]`).join('\n'));
      return ok(out.join('\n\n'));
    } catch (e) { return fail(e); }
  });

server.tool('get_timeline',
  'Toon de tijdlijn van de gebruiker: alle fragmenten met een datum, op volgorde. Optioneel filteren op tag of zoekterm.',
  { tag: z.string().optional(), query: z.string().optional() },
  async ({ tag, query }) => {
    try {
      await token();
      let path = `snippets?select=text,date,tags&date=neq.&limit=2000`;
      if (query) path += `&text=ilike.${enc(like(query))}`;
      let rows = await rest('GET', path);
      if (tag) rows = rows.filter(r => (r.tags || []).map(t => t.toLowerCase()).includes(tag.toLowerCase().replace(/^#/, '')));
      const items = rows.map(r => ({ r, d: parseDate(r.date) })).filter(x => x.d).sort((a, b) => a.d.key.localeCompare(b.d.key));
      if (!items.length) return ok('De tijdlijn is (voor dit filter) nog leeg.');
      return ok(items.map(x => `${x.d.label}: ${x.r.text.replace(/\s+/g, ' ').slice(0, 200)}`).join('\n'));
    } catch (e) { return fail(e); }
  });

server.tool('read_source',
  'Lees de bewaarde tekst van een bron uit de Schrijfkamer (op id of URL), bv. om eruit te citeren.',
  { id: z.string().optional(), url: z.string().optional() },
  async ({ id, url }) => {
    try {
      await token();
      if (!id && !url) return fail(new Error('Geef een id of url.'));
      const rows = await rest('GET', `sources?select=title,site,url,excerpt,note,content&${id ? 'id=eq.' + enc(id) : 'url=eq.' + enc(url)}`);
      if (!rows.length) return ok('Die bron staat niet in de Schrijfkamer.');
      const s = rows[0];
      return ok(`# ${s.title}\n${s.site || ''} ${s.url || ''}\n${s.note ? 'Notitie: ' + s.note + '\n' : ''}\n${(s.content || s.excerpt || '(geen tekst bewaard)').slice(0, 15000)}`);
    } catch (e) { return fail(e); }
  });

server.tool('list_projects',
  'Geef de projecten (groepen) in de Schrijfkamer van de gebruiker, zodat je fragmenten en bronnen in het juiste project kunt zetten.',
  {},
  async () => {
    try { await token(); const gs = await groups(); return ok(gs.length ? 'Projecten: ' + gs.map(g => g.name).join(', ') : 'Er zijn nog geen projecten. Die maak je in de app onder Groepen → +.'); }
    catch (e) { return fail(e); }
  });

/* ---------- Research framework: projects, texts, batches ---------- */
const COLORS = ['#B8D8C8', '#CFC6EA', '#F6D2BE', '#C4DCEF', '#F4E6B0', '#E9A9A0'];
async function saveGroups(gs) {
  const have = await rest('GET', `profiles?select=user_id&user_id=eq.${session.user_id}`);
  if (have && have.length) return rest('PATCH', `profiles?user_id=eq.${session.user_id}`, { groups: gs }, 'return=minimal');
  return rest('POST', 'profiles', { user_id: session.user_id, groups: gs }, 'resolution=merge-duplicates,return=minimal');
}
async function ensureFolder(gid, folder) {
  const gs = await groups(); const g = gs.find(x => x.id === gid); if (!g) return;
  if (!(g.folders || []).includes(folder)) { g.folders = [...(g.folders || []), folder]; await saveGroups(gs); }
}
async function insertSheet({ body, grp, folder }) {
  const now = Date.now();
  const row = { id: uid(), user_id: session.user_id, body, grp, folder: folder || '', fav: false, trashed: false, goal: 0, created: now, updated: now };
  try { await rest('POST', 'sheets', row, 'return=minimal'); }
  catch (e) { if (/folder/.test(e.message)) { delete row.folder; await rest('POST', 'sheets', row, 'return=minimal'); } else throw e; }
  return row.id;
}
const titleOf = body => (String(body || '').split('\n').find(l => l.trim()) || '').replace(/^#{1,6}\s+/, '').trim();

server.tool('create_project',
  'Maak een nieuw project (groep) aan in de Schrijfkamer, bijvoorbeeld voor een boek of onderzoek. Bestaat het al, dan gebeurt er niets.',
  { name: z.string(), color: z.string().optional().describe('Optioneel: een kleur als #B8D8C8.') },
  async ({ name, color }) => {
    try {
      await token();
      const gs = await groups();
      const ex = gs.find(g => g.name.toLowerCase() === name.toLowerCase());
      if (ex) return ok(`Project “${ex.name}” bestaat al.`);
      gs.push({ id: uid(), name, color: color || COLORS[gs.length % COLORS.length] });
      await saveGroups(gs);
      return ok(`Project “${name}” aangemaakt. Het staat in de app onder Groepen.`);
    } catch (e) { return fail(e); }
  });

server.tool('project_overview',
  'Geef een overzicht van een project: teksten, aantallen, tijdlijn, bronnen, tags en open uitzoekpunten (??). Gebruik dit vóór je gaat onderzoeken, zodat je niets dubbel doet.',
  { project: z.string() },
  async ({ project }) => {
    try {
      await token();
      const gid = await projectId(project);
      const [texts, sn, src] = await Promise.all([
        rest('GET', `sheets?select=id,body,updated,folder&grp=eq.${gid}&trashed=eq.false&order=updated.desc`).catch(() => rest('GET', `sheets?select=id,body,updated&grp=eq.${gid}&trashed=eq.false&order=updated.desc`)),
        rest('GET', `snippets?select=text,date,tags&grp=eq.${gid}&order=created.desc&limit=500`),
        rest('GET', `sources?select=title,url,site&grp=eq.${gid}&order=created.desc&limit=200`)
      ]);
      const todos = texts.flatMap(t => [...String(t.body).matchAll(/([^.!?\n]{0,140})(\?\?|\[check[^\]]*\])/g)].map(m => `${m[1].trim()} ${m[2]} (in “${titleOf(t.body)}”)`));
      const dated = sn.map(x => ({ x, d: parseDate(x.date) })).filter(y => y.d).sort((a, b) => a.d.key.localeCompare(b.d.key));
      const tags = {}; for (const x of sn) for (const t of (x.tags || [])) tags[t] = (tags[t] || 0) + 1;
      return ok([
        `Project “${project}”: ${texts.length} teksten, ${sn.length} fragmenten (${dated.length} op de tijdlijn), ${src.length} bronnen.`,
        texts.length ? 'Teksten:\n' + texts.map(t => `- ${t.folder ? '[' + t.folder + '] ' : ''}${titleOf(t.body) || '(naamloos)'} (${String(t.body).split(/\s+/).length} woorden)`).join('\n') : '',
        dated.length ? 'Tijdlijn:\n' + dated.map(y => `- ${y.d.label}: ${y.x.text.replace(/\s+/g, ' ').slice(0, 120)}`).join('\n') : '',
        src.length ? 'Bronnen:\n' + src.slice(0, 60).map(s => `- ${s.title} ${s.url || ''}`).join('\n') : '',
        Object.keys(tags).length ? 'Tags: ' + Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `#${t} (${n})`).join(' ') : '',
        todos.length ? 'Nog uitzoeken:\n' + todos.slice(0, 40).map(t => '- ' + t).join('\n') : ''
      ].filter(Boolean).join('\n\n'));
    } catch (e) { return fail(e); }
  });

server.tool('create_text',
  'Maak een nieuwe tekst (document) in de Schrijfkamer, bijvoorbeeld een onderzoeksdossier, personenoverzicht of hoofdstukopzet. Schrijf schone, gewone tekst: alleen ## kopjes en - lijstjes; GEEN **vet**, *cursief*, tabellen of andere opmaaktekens (die worden toch weggehaald). Zet ?? achter feiten die nog gecontroleerd moeten worden; gebruik [[Titel]] om naar andere teksten of bronnen te linken.',
  { title: z.string(), body: z.string().describe('De inhoud als schone tekst (zonder de titel); alleen ## kopjes en - lijstjes.'), project: z.string().optional(), folder: z.string().optional().describe('Map binnen het project, bv. "Hoofdstukken" of "Onderzoek". Gebruik voor personages liever create_character.') },
  async ({ title, body, project, folder }) => {
    try {
      await token();
      const gid = project ? await projectId(project) : 'inbox';
      if (folder && gid !== 'inbox') await ensureFolder(gid, folder);
      await insertSheet({ body: `# ${cleanInline(title)}\n\n${cleanText(body).trim()}\n`, grp: gid, folder: gid !== 'inbox' ? (folder || '') : '' });
      return ok(`Tekst “${title}” aangemaakt${project ? ' in project ' + project : ''}${folder ? ', map ' + folder : ''}. De gebruiker ziet hem direct in de app.`);
    } catch (e) { return fail(e); }
  });

const CHAR_FIELDS = [['kort', 'In één zin'], ['uiterlijk', 'Uiterlijk'], ['karakter', 'Karakter'], ['verlangen', 'Wat wil hij/zij?'], ['angst', 'Waar is hij/zij bang voor?'], ['achtergrond', 'Achtergrond'], ['relaties', 'Relaties'], ['stem', 'Stem en taal'], ['ontwikkeling', 'Ontwikkeling'], ['notities', 'Notities']];
server.tool('create_character',
  'Maak een personage (character sheet) in een project van de Schrijfkamer. Verschijnt in het onderdeel Personages van de app. Vul alleen in wat je weet; zet ?? achter onzekere of verzonnen details die de schrijver nog moet beslissen. Gebruik [[Naam]] bij relaties om naar andere personages te linken.',
  {
    project: z.string(), name: z.string(),
    role: z.string().optional().describe('bv. Hoofdpersoon, Tegenspeler, Bijfiguur, Verteller'), age: z.string().optional(),
    in_one_sentence: z.string().optional(), appearance: z.string().optional(), personality: z.string().optional(),
    wants: z.string().optional().describe('Wat wil het personage?'), fears: z.string().optional().describe('Angst, geheim of zwakke plek'),
    background: z.string().optional(), relationships: z.string().optional(), voice: z.string().optional().describe('Stem en manier van praten'),
    development: z.string().optional().describe('Ontwikkeling in het verhaal'), notes: z.string().optional(), historical: z.boolean().optional().describe('true als het een historisch persoon is')
  },
  async (a) => {
    try {
      await token();
      const gid = await projectId(a.project);
      const existing = await rest('GET', `sheets?select=id,body&grp=eq.${gid}&trashed=eq.false`);
      if (existing.some(r => titleOf(r.body).replace(/^(personage|karakter)\s*[-–—:]\s*/i, '').toLowerCase() === a.name.toLowerCase())) return ok(`Personage “${a.name}” bestaat al in ${a.project}. Gebruik append_to_text met titel “${a.name}” om aan te vullen.`);
      const vals = { kort: a.in_one_sentence, uiterlijk: a.appearance, karakter: a.personality, verlangen: a.wants, angst: a.fears, achtergrond: a.background, relaties: a.relationships, stem: a.voice, ontwikkeling: a.development, notities: [a.historical ? 'Historisch persoon.' : '', a.notes || ''].filter(Boolean).join(' ') };
      const meta = [a.role && `**Rol:** ${a.role}`, a.age && `**Leeftijd:** ${a.age}`].filter(Boolean).join(' · ');
      let md = `# ${a.name}\n\n${meta ? meta + '\n\n' : ''}`;
      for (const [k, label] of CHAR_FIELDS) if ((vals[k] || '').trim()) md += `## ${label}\n\n${cleanText(vals[k]).trim()}\n\n`;
      await ensureFolder(gid, 'Personages');
      await insertSheet({ body: md.trimEnd() + '\n', grp: gid, folder: 'Personages' });
      return ok(`Personage “${a.name}” aangemaakt in ${a.project} (onderdeel Personages).`);
    } catch (e) { return fail(e); }
  });

server.tool('append_to_text',
  'Voeg tekst toe aan het einde van een bestaande tekst in de Schrijfkamer (gevonden op titel), bijvoorbeeld nieuwe bevindingen in het onderzoeksdossier. Overschrijft niets.',
  { title: z.string().describe('Titel (eerste regel) van de bestaande tekst.'), content: z.string().describe('Schone tekst die onderaan wordt toegevoegd (alleen ## kopjes en - lijstjes, geen **vet** of tabellen).'), project: z.string().optional() },
  async ({ title, content, project }) => {
    try {
      await token();
      let path = `sheets?select=id,body&trashed=eq.false&order=updated.desc&limit=500`;
      if (project) path += `&grp=eq.${await projectId(project)}`;
      const rows = await rest('GET', path);
      const t = title.toLowerCase().trim();
      const hit = rows.find(r => titleOf(r.body).toLowerCase() === t) || rows.find(r => titleOf(r.body).toLowerCase().includes(t));
      if (!hit) return fail(new Error(`Geen tekst gevonden met de titel “${title}”. Bestaande teksten: ${rows.slice(0, 15).map(r => titleOf(r.body)).filter(Boolean).join(', ')}`));
      const body = String(hit.body).replace(/\s*$/, '') + '\n\n' + cleanText(content).trim() + '\n';
      await rest('PATCH', `sheets?id=eq.${enc(hit.id)}`, { body, updated: Date.now() }, 'return=minimal');
      return ok(`Toegevoegd aan “${titleOf(hit.body)}”.`);
    } catch (e) { return fail(e); }
  });

server.tool('add_timeline_events',
  'Zet meerdere gebeurtenissen tegelijk op de tijdlijn (handig bij het opbouwen van een chronologie). Geef per gebeurtenis een datum, korte tekst en bij voorkeur een bron-URL.',
  {
    project: z.string().optional(),
    events: z.array(z.object({
      date: z.string(), text: z.string(), source_url: z.string().optional(), source_title: z.string().optional(), tags: z.array(z.string()).optional()
    })).min(1).max(40)
  },
  async ({ project, events }) => {
    try {
      const out = [], bad = [];
      for (const ev of events) {
        const d = parseDate(ev.date);
        if (!d) { bad.push(`${ev.date} (${ev.text.slice(0, 40)})`); continue; }
        await saveSnippet({ ...ev, project });
        out.push(`${d.label}: ${ev.text.slice(0, 60)}`);
      }
      return ok(`${out.length} gebeurtenis(sen) op de tijdlijn gezet:\n${out.map(x => '- ' + x).join('\n')}${bad.length ? `\n\nNiet herkende datums (overgeslagen): ${bad.join('; ')}` : ''}`);
    } catch (e) { return fail(e); }
  });

const INSTRUCTIONS = 'Koppeling met de Schrijfkamer van de gebruiker: bewaar fragmenten, tijdlijnmomenten, bronnen, teksten en personages, en doorzoek de verzameling. Antwoord in het Nederlands. Schrijf in de Schrijfkamer schone, gewone tekst: geen **vet**, *cursief*, tabellen of andere Markdown-tekens, alleen ## kopjes en - lijstjes. ' + RULE_TEXT + ' Verzamel liever weinig goede bronnen dan veel; controleer met search_collection of iets er al is.';
const PROMPT_ONDERZOEK = "Je bent mijn onderzoeksassistent voor mijn schrijfproject “${arguments.project}”. Ik concentreer me op het creatieve schrijven; jij doet het feitenwerk en zet alles in mijn Schrijfkamer.\n\nOnderwerp: ${arguments.onderwerp}\n\nWerkwijze:\n0. Stel mij eerst een paar korte vragen en wacht op mijn antwoord: waarvoor heb ik dit nodig, hoe diep (kort, gemiddeld of diep), welke focus of periode, en wat moet er komen (tijdlijn, fragmenten, personages, dossier). Leg het daarna vast met research_plan en houd je aan het maximum.\n1. Roep eerst project_overview aan (bestaat het project niet, maak het dan met create_project) zodat je niets dubbel doet.\n2. Zoek op het web naar betrouwbare bronnen (encyclopedieën, musea, wetenschappelijke en historische bronnen). Bewaar de belangrijkste met save_source.\n3. Zet elke gebeurtenis met een datum op de tijdlijn (add_timeline_events), steeds met de bron-URL.\n4. Bewaar losse feiten, citaten en details die bruikbaar zijn voor een verhaal (zintuiglijke details, gebruiken, voorwerpen, plaatsen) als fragmenten met save_fragment, met tags en bron.\n5. Maak met create_text (map “Onderzoek”) een tekst “Onderzoeksdossier: ${arguments.onderwerp}” in het project met: korte samenvatting, belangrijkste personen en plekken (met [[links]] waar zinnig), chronologie in het kort, en een lijst “Open vragen”. Zet ?? achter alles wat onzeker of tegenstrijdig is. Maak voor belangrijke (historische) personen een character sheet met create_character.\n6. Werk in het Nederlands. Verzin niets: geen bron, dan markeren met ??.\n7. Sluit af met een korte samenvatting in de chat van wat je hebt toegevoegd en welke vragen nog open staan, en roep finish_research aan.";
server.prompt('onderzoek_project',
  'Laat Claude onderzoek doen en het researchkader van een project in de Schrijfkamer vullen.',
  { project: z.string().describe('Naam van het project, bv. De muntenmaker'), onderwerp: z.string().describe('Waar gaat het onderzoek over?') },
  ({ project, onderwerp }) => ({ messages: [{ role: 'user', content: { type: 'text', text: PROMPT_ONDERZOEK.replace(/\$\{arguments\.project\}/g, project).replace(/\$\{arguments\.onderwerp\}/g, onderwerp) } }] }));

for (const t of tools) if (['save_fragment', 'add_to_timeline', 'save_source', 'add_timeline_events'].includes(t.name)) {
  const h = t.handler;
  t.handler = async (a) => { const r = await h(a); if (!r.isError && a.project) { try { const n = await budgetNote(a.project); if (n) r.content[0].text += n; } catch (e) {} } return r; };
  t.description += ' ' + RULE_TEXT + ' Geef altijd het project mee.';
}
return { tools, prompts, PROMPT_ONDERZOEK, version: VERSION, instructions: INSTRUCTIONS };
}
