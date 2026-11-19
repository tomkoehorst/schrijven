# Schrijfkamer voor Claude Desktop

Koppeling (MCP-server) waarmee Claude rechtstreeks in je Schrijfkamer kan bewaren en zoeken.

- Installeren: dubbelklik op `schrijfkamer-claude.mcpb` (in de hoofdmap) of kies in Claude Desktop
  *Instellingen → Extensies → Extensie installeren…* en vul je e-mailadres en wachtwoord in.
- Gereedschappen: `save_fragment`, `add_to_timeline`, `add_timeline_events`, `save_source`, `search_collection`,
  `get_timeline`, `read_source`, `list_projects`, `create_project`, `project_overview`, `create_text`, `append_to_text`.
- Prompt: `onderzoek_project` (project, onderwerp).
- Online versie (telefoon, claude.ai): `supabase/functions/mcp/index.ts`, gebouwd uit `src/http.js` + `src/core.js` met
  `esbuild src/http.js --bundle --format=esm --platform=neutral --external:zod` (daarna `"zod"` → `"npm:zod@4.1.12"`).
- Bron: `src/core.js` (alle gereedschappen), `src/index.js` (pc, stdio), `src/http.js` (online). Bouwen: `esbuild src/index.js --bundle --minify --platform=node --format=cjs --outfile=server/index.js`,
  daarna `npx @anthropic-ai/mcpb pack . ../schrijfkamer-claude.mcpb`.
- Praat via REST met Supabase (zelfde RLS als de app); het wachtwoord blijft op je eigen computer.
