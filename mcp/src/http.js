// Schrijfkamer — online Claude-koppeling (Supabase Edge Function "mcp")
// Voor de Claude-app op je telefoon, claude.ai en Claude Desktop (custom connector).
// Spreekt MCP "Streamable HTTP" (stateless, JSON-antwoorden).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   MCP_SECRET        lange geheime code; staat in de link die je in Claude invult
//   SCHRIJF_EMAIL     je e-mailadres van de Schrijfkamer
//   SCHRIJF_PASSWORD  je wachtwoord van de Schrijfkamer
// Zet bij deze functie "Verify JWT" UIT. De link wordt:
//   https://<project>.supabase.co/functions/v1/mcp/<MCP_SECRET>
import { z } from 'zod';
import { createCore, VERSION } from './core.js';

const env = k => (globalThis.Deno ? Deno.env.get(k) : process.env[k]) || '';
// Always use the public project URL (the internal SUPABASE_URL of the Edge runtime may not accept the new
// sb_publishable_ keys); fall back to the legacy anon key that Supabase injects into every function.
const core = createCore({
  url: env('SCHRIJF_SUPABASE_URL') || undefined, key: env('SCHRIJF_SUPABASE_KEY') || undefined,
  fallbackKeys: [env('SUPABASE_ANON_KEY')].filter(Boolean),
  fn: env('SCHRIJF_FUNCTION') || undefined, email: env('SCHRIJF_EMAIL'), password: env('SCHRIJF_PASSWORD')
});
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const toolList = core.tools.map(t => {
  const schema = z.toJSONSchema(z.object(t.shape), { target: 'draft-7', io: 'input' });
  delete schema.$schema;
  return { name: t.name, description: t.description, inputSchema: schema };
});
const promptList = core.prompts.map(p => ({ name: p.name, description: p.description,
  arguments: Object.entries(p.shape).map(([name, s]) => ({ name, description: s.description || '', required: !s.isOptional() })) }));

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS', 'Access-Control-Expose-Headers': 'Mcp-Session-Id' };
const json = (obj, status = 200) => new Response(obj === null ? null : JSON.stringify(obj), { status, headers: { ...cors, ...(obj === null ? {} : { 'Content-Type': 'application/json' }) } });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function handle(msg) {
  const { id, method, params = {} } = msg || {};
  const isNotification = id === undefined || id === null;
  try {
    switch (method) {
      case 'initialize': {
        const v = PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0];
        return { jsonrpc: '2.0', id, result: { protocolVersion: v, capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: 'schrijfkamer', version: VERSION },
          instructions: 'Koppeling met de Schrijfkamer van de gebruiker: bewaar fragmenten, tijdlijnmomenten, bronnen, teksten en personages, en doorzoek de verzameling. Antwoord in het Nederlands.' } };
      }
      case 'ping': return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list': return { jsonrpc: '2.0', id, result: { tools: toolList } };
      case 'tools/call': {
        const t = core.tools.find(x => x.name === params.name);
        if (!t) return rpcError(id, -32602, `Onbekend gereedschap: ${params.name}`);
        const parsed = z.object(t.shape).safeParse(params.arguments || {});
        if (!parsed.success) return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Ongeldige invoer: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }], isError: true } };
        return { jsonrpc: '2.0', id, result: await t.handler(parsed.data) };
      }
      case 'prompts/list': return { jsonrpc: '2.0', id, result: { prompts: promptList } };
      case 'prompts/get': {
        const p = core.prompts.find(x => x.name === params.name);
        if (!p) return rpcError(id, -32602, `Onbekende opdracht: ${params.name}`);
        return { jsonrpc: '2.0', id, result: p.render(params.arguments || {}) };
      }
      case 'resources/list': return { jsonrpc: '2.0', id, result: { resources: [] } };
      default:
        if (isNotification) return null;           // notifications/initialized etc.
        return rpcError(id, -32601, `Methode niet ondersteund: ${method}`);
    }
  } catch (e) {
    return isNotification ? null : rpcError(id, -32603, String((e && e.message) || e));
  }
}

export async function serve(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const secret = env('MCP_SECRET');
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  if (!secret || secret.length < 16) return json({ error: 'MCP_SECRET is nog niet ingesteld (minstens 16 tekens).' }, 500);
  if (parts[parts.length - 1] !== secret) return json({ error: 'Onbekende link' }, 404);
  if (req.method === 'GET' || req.method === 'DELETE') return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST' } });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: cors });
  let body;
  try { body = await req.json(); } catch (e) { return json(rpcError(null, -32700, 'Ongeldige JSON'), 400); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? json(out) : json(null, 202);
  }
  const res = await handle(body);
  return res ? json(res) : json(null, 202);
}

if (globalThis.Deno && Deno.serve) Deno.serve(serve);
