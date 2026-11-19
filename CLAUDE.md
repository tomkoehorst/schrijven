# Schrijfkamer — afspraken voor Claude

Schrijfapp van Tom (Nederlands), live op https://tomkoehorst.github.io/schrijven/ via GitHub Pages (`main` publiceert automatisch).

## Voorkeuren van Tom
- **Koppelingen, plugins en MCP-servers: altijd één versie die op álle platformen werkt** — telefoon (Claude-app), claude.ai in de browser én Claude Desktop. Bouw ze dus als **online (remote) MCP-server** die je als *custom connector* toevoegt, niet als lokale extensie die alleen op de pc draait. Een lokale variant (bv. `.mcpb`) hooguit als extra, uit dezelfde code.
- Uitleg stap voor stap, in het Nederlands, met precies waar hij moet klikken.
- Huisstijl: crèmewit, saliegroene accenten, Nunito; katjes spaarzaam.
- Wees eerlijk over wat wel en niet getest is (deze omgeving kan Supabase, Wikipedia e.d. vaak niet bereiken).

## Opbouw
- `index.html` — de hele app (één bestand). `config.js` — Supabase-URL, publieke sleutel, naam Edge Function.
- `supabase/schema.sql` — tabellen + RLS; idempotent, Tom draait het geheel opnieuw in de SQL Editor. Nieuwe kolommen/tabellen hier toevoegen; de app moet blijven werken als de SQL nog niet gedraaid is (fallback zoals `noGrpCol`, `noFolderCol`).
- `supabase/functions/bronnen` — artikelen ophalen + Brave-zoeken. `supabase/functions/mcp` — online Claude-koppeling (gebouwd uit `mcp/src/http.js` + `mcp/src/core.js`).
- `mcp/` — gedeelde kern met alle Claude-gereedschappen (`src/core.js`), pc-versie (`src/index.js` → `schrijfkamer-claude.mcpb`).
- `extension/` — browser-extensie "Bewaar in Schrijfkamer" (zip: `schrijfkamer-extensie.zip`).
- `ROADMAP.md` — ideeën voor later.

## Werkwijze
- Edge Functions zet Tom zelf neer via het Supabase-dashboard (Via Editor): geef een directe raw-GitHub-link en benadruk de **functienaam** en **Verify JWT uit**.
- Interne velden (beginnend met `_`) nooit naar Supabase sturen (`stripLocal`).
- Testen met Playwright en een strenge nagebootste Supabase vóór pushen; MCP testen met de officiële SDK-client (stdio en HTTP); Edge Functions in Deno.
- Bij de MCP-prompt: de tekst in `mcp/manifest.json` moet exact gelijk zijn aan `PROMPT_ONDERZOEK` in `core.js` (anders weigert Claude Desktop hem).
