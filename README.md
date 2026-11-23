# Schrijfkamer

Een rustige schrijfapp in de browser, met een indeling zoals in Ulysses: bibliotheek, lijst met teksten en een schone editor met Markdown-opmaak. Werkt op computer en telefoon en synchroniseert via Supabase.

**App:** https://tomkoehorst.github.io/schrijven/

## Functies

- Inbox, alle teksten, laatste 7 dagen, favorieten, groepen met kleur, prullenbak
- Opmaak met `# kop`, `**vet**`, `*cursief*`, `==markeren==`, `> citaat`, lijsten, links en `++notities++`
- Schrijfdoel per tekst met voortgangsring, statistieken en een inhoudsopgave
- Voorbeeldweergave, focusmodus, typemachinemodus en alinea uitlichten
- Licht/donker thema, drie lettertypes, instelbare grootte en regelbreedte
- Exporteren als Markdown, platte tekst of HTML
- Inloggen met e-mail en wachtwoord, live synchronisatie tussen apparaten
- Te installeren op je beginscherm (eigen icoon)
- Focusscherm: alleen je blad, verder niets

## Een project is een boom

Open je een project, dan zie je **de boom**: een horizontale stam (zoals Plottr) met je scènes op volgorde. Elke scène is een plantje dat meegroeit met wat je schrijft — zaadje (nog leeg), kiem, groeit, staat stevig, en bloei als de status *klaar* is. Klik op een plantje om te schrijven; sleep plantjes om te schuiven. Extra verhaallijnen (bv. *Kader: de oude man*) zijn dunnere takken erboven (⋯ → Verhaallijn).

Onder de stam ligt **de aarde**: losse stukken (Werkbank) en ideeën als zaadjes. Sleep er een omhoog en hij wordt een scène; klik op een idee om ermee te beginnen. **✎ Gewoon schrijven** plant een nieuw zaadje en opent een leeg vel.

Bovenaan alleen: **Naslag** (personages, plaatsen, onderwerpen, losse teksten — schuift rechts in), **Hele verhaal** en **⋯** (groeistadia, historische tijd, wat ontdekte ik?, datums tonen, verhaallijn, losse teksten, project bewerken). De lijst met teksten is in een project verborgen.

**Werkwijze, in één ronde:**
- **Waar was ik?** — bij het openen zie je het stuk waar je het laatst aan schreef (ook als dat op je telefoon was), de laatste alinea en wat je vorige keer ontdekte. Eén klik: verder schrijven.
- **💡 Prikkel** — als je vastzit: iets uit je eigen materiaal (feit, scène-idee, personage, kaartje, journaal) met een vraag erbij. *Als notitie* zet hem als ++notitie++ in je tekst.
- **🌾 Oogsten** — na een flink stuk schrijven (40+ woorden) of via de knop: namen die opduiken (👤 personage of 📍 plaats/onderwerp), werkbank of lijn, open vragen, en één regel voor je **schrijfjournaal**.
- **Open vragen naar Claude** — typ `??` of `[check: vraag]` en schrijf door. Kopieer in Uitzoeken de opdracht voor Claude; Claude gebruikt `list_open_questions` en `answer_question`. Antwoorden verschijnen in Uitzoeken en in Naslag; je eigen tekst wordt niet veranderd.
- **Wat ontdekte ik?** — weergave in Verhaal: welke personages, onderwerpen en motieven (woorden die terugkomen) in welke scène zitten, namen die opduiken en je schrijfjournaal.

De lijn heeft deze weergaven:
- **Verhaallijnen** (zoals Plottr): kolommen = volgorde in het verhaal, rijen = verhaallijnen (bv. *Kader: de oude man*), onderaan de historische gebeurtenis per scène. Kaartjes slepen = volgorde of lijn veranderen.
- **Historische tijd** (zoals Aeon Timeline): scènes tussen de echte gebeurtenissen, op volgorde van de geschiedenis.
- **Status**: bord met idee / schets / concept / klaar (slepen = status veranderen).
- **Hele verhaal**: voegt het proza van alle scènes samen (kopiëren, .md, .txt of als tekst bewaren). ++Notities++ en kaartjes gaan niet mee.

Een scène open je met één klik: bovenaan het **kaartje** (titel, status, datum, plaats, verhaallijn, wat gebeurt er, wat voelt de verteller; onder *Meer*: stempelmetafoor, zintuigen, feiten, open vragen, zie ook, gekoppelde gebeurtenis), daaronder schrijf je de scène. Alleen het proza telt voor woorden en dagdoel. Personages en onderwerpen die in de scène voorkomen verschijnen vanzelf als knopjes.

**Materiaal** – onderwerpen (achtergrond, feiten, scène-ideeën, bronnen), personages, losse teksten en alle bronnen.

**Ideeën** – snel intikken, later naar een onderwerp verplaatsen.

**Claude en je verhaal (koppeling 1.8.0):** `list_scenes`, `get_scene`, `create_scene`, `update_scene` (kaartvelden, status, verhaallijn, gebeurtenis, tekst vervangen/aanvullen/verbeteren), `reorder_scenes`, `read_text`, `update_text`, `move_text` en `delete_text` (alleen na bevestiging, naar de prullenbak).

Oude teksten met `## Kaartje` / `## Tekst` zet je om met **Verhaal → Omzetten naar scènes…** (met voorbeeld vooraf). Voor scènes is `schema.sql` nodig (kolommen `kind`, `meta`, `ord` in `sheets`). Onder **Instellingen → Back-up downloaden** bewaar je alles als één JSON-bestand.

## Bronnen

- Artikelen bewaren via een link: titel, samenvatting en leesbare tekst worden opgehaald
- Zoeken op internet (Brave Search) en in Wikipedia, met één klik bewaren
- Eigen notities en citaten, tags, favorieten en zoeken door de volledige tekst
- Tekst selecteren in een bron → **Citeer in je tekst** (met bronvermelding)
- Bewaren vanaf de telefoon (deelmenu op Android, Opdracht op iPhone) of met een bladwijzer
- **Overzicht:** groeperen per thema, site, soort of project; sorteren (nieuw, oud, A–Z, meeste fragmenten); filters (met fragmenten, nog niet gebruikt, favoriet, zonder tekst); groepen in- en uitklappen
- **Claude laat ordenen:** vraag *“Orden mijn bronnen en fragmenten in De muntenmaker in thema's”* — Claude gebruikt `list_collection` en `set_tags` (eerste tag = thema)

**Fragmenten:** selecteer tekst in een bron en kies **Fragment** — met datum, tags en kleur.

- **Braindump:** bord met kaartjes voor fragmenten en losse gedachten (snel intikken bovenaan); weergave Alles, Per thema of Per bron, sorteren op nieuw/oud/datum
- **Schone tekst:** knop in Info (ⓘ → Tekst → Schone tekst) of het opdrachtenmenu haalt `**`, `*`, tabellen e.d. weg; kopjes en lijstjes blijven. Claude levert via de koppeling sowieso schone tekst aan.
- **Tijdlijn:** fragmenten met een datum op volgorde, per jaar; jaartallen en datums worden herkend
- Elk kaartje kan met één klik in je tekst (als citaat met bronvermelding)

Hiervoor is de Edge Function `supabase/functions/bronnen` nodig (en voor webzoeken een `BRAVE_API_KEY`).

## Browser-extensie: bewaren vanuit elke website

Map `extension/` (of download [schrijfkamer-extensie.zip](https://github.com/tomkoehorst/schrijven/raw/main/schrijfkamer-extensie.zip)) — voor Chrome en Edge.
Selecteer tekst op een website (ook in Claude, ChatGPT of Perplexity) en kies met de rechtermuisknop:
- **Bewaar als fragment** (Alt+Shift+S) — op je braindump, met de pagina als bron
- **Zet op tijdlijn** (Alt+Shift+D) — met herkende datum (ook BC/v.Chr. en Engelse maanden)
- **Bewaar pagina als bron** (Alt+Shift+L) of **Bewaar link als bron**

AI-gesprekken worden bewaard als bron "AI-gesprek" met tag *#ai*; links in je selectie kun je met één vinkje ook als bron bewaren.
Installeren: `chrome://extensions` (of `edge://extensions`) → Ontwikkelaarsmodus aan → *Uitgepakte extensie laden* → kies de map `extension`. Sneltoetsen aanpassen: `chrome://extensions/shortcuts`.

## Claude Desktop-koppeling

Download [schrijfkamer-claude.mcpb](https://github.com/tomkoehorst/schrijven/raw/main/schrijfkamer-claude.mcpb) en dubbelklik (of Claude Desktop → Instellingen → Extensies → installeren). Vul je Schrijfkamer-e-mail en -wachtwoord in. Daarna kun je Claude vragen:
- "Zet dit op mijn tijdlijn" · "Bewaar dit als fragment in project Roman" · "Bewaar deze bronnen"
- "Wat heb ik al verzameld over Brutus?" · "Laat mijn tijdlijn zien"
- **Onderzoeksopdracht** (prompt `onderzoek_project`): Claude zoekt op het web en vult het project met bronnen, tijdlijn, fragmenten en een onderzoeksdossier met open vragen (??)
- Extra gereedschappen: `create_project`, `project_overview`, `create_text`, `append_to_text`, `add_timeline_events`

**Op je telefoon en claude.ai:** zet de online koppeling `supabase/functions/mcp` neer (Edge Function `mcp`, Verify JWT uit, secrets `MCP_SECRET`, `SCHRIJF_EMAIL`, `SCHRIJF_PASSWORD`) en voeg op claude.ai bij Instellingen → Connectors een *custom connector* toe met de link `https://<project>.supabase.co/functions/v1/mcp/<MCP_SECRET>`.

**Regelaar:** bij een onderzoeksvraag stelt Claude eerst vragen (doel, diepte, focus) en legt een onderzoeksplan vast (`research_plan`: kort ≈ 6 bronnen/20 fragmenten, gemiddeld ≈ 12/40, diep ≈ 25/90). De koppeling weigert daarboven nieuwe bronnen en fragmenten tot je toestemming geeft. Dubbele links worden herkend (ook met/zonder www, #, trackingcodes) en bot-controlepagina's niet als artikel bewaard. In Bronnen ruimt de 🧹-knop bestaande dubbele en geblokkeerde bronnen op.

Broncode in `mcp/`.

## Ontdek

Druk op de onderzoeksknop (of Ctrl+Alt+O) en de app onderzoekt je alinea of selectie:
- herkent namen en kernwoorden (aan/uit te zetten) en zoekt het beste Wikipedia-artikel (NL, anders EN)
- **feitenkaart uit Wikidata**: datum, plaats, betrokkenen, geboren/overleden… — datums met één klik op de tijdlijn (ook v.Chr.)
- **personen & plekken** uit je alinea met een minikaartje
- **verwante onderwerpen** om op door te klikken, met kruimelpad terug
- **boeken** (Open Library) en **wetenschappelijke artikelen** (OpenAlex), te bewaren als bron
- bij `??`-punten een **mogelijk antwoord** met bron

## Onderzoekspaneel

Naast je tekst (Ctrl+Alt+R):
- **Gerelateerd:** fragmenten en bronnen die passen bij de alinea waar je schrijft
- **Zoeken:** in je verzameling (ook de volledige tekst van bronnen), Wikipedia of het web
- Bronnen lezen in het paneel, tekst selecteren → citeren of als fragment bewaren
- Fragmenten met één klik invoegen op de plek van je cursor

## Uitzoeken, opzoeken en links

- **Nog uitzoeken:** typ `??` of `[check: je vraag]` in je tekst; alles komt als lijst in het onderzoekspaneel, met zoekknoppen en afvinken
- **Opzoeken:** selecteer een woord → betekenis en synoniemen (WikiWoordenboek), Wikipedia en je eigen verzameling (Ctrl+Alt+L)
- **`[[Links]]`:** typ `[[` voor suggesties uit je teksten, bronnen en fragmenten; Ctrl/⌘+klik of de knop opent de link; terugverwijzingen en "gebruikt in"
- Markeringen en links verdwijnen netjes bij export en in het voorbeeld

## Sneltoetsen & MX-muis

Alle acties hebben een sneltoets (aan te passen via Instellingen → Sneltoetsen) en staan in het opdrachtenmenu (Ctrl+Alt+A). Ideaal om in Logi Options+ aan muisknoppen of F-toetsen te koppelen:
Ctrl+Alt+K markeer ??, J/H volgende/vorige uitzoekpunt, L opzoeken, B fragment, Q citeren, R onderzoekspaneel, S snel bewaren, F focus, T sprint.

## Mappen, personages en gesplitst scherm

- **Mappen** binnen een project (bv. Hoofdstukken, Personages, Onderzoek); teksten in een map staan op nummer. Slepen naar een map of via Info → Map. Op de projectpagina: “Mappen voorstellen”.
- **Personages:** per project een overzicht met character sheets (rol, leeftijd, uiterlijk, karakter, verlangen, angst, achtergrond, relaties, stem, ontwikkeling, notities + eigen onderdelen). Toont in welke teksten en fragmenten het personage voorkomt.
- **Gesplitst scherm** (Ctrl+Alt+G): rechts een tweede tekst of personage, lezen of bewerken; met ⇄ wissel je.

## Projectpagina

Klik in de bibliotheek op een groep (project) en je ziet alles bij elkaar: aantallen, teksten, open uitzoekpunten, een mini-tijdlijn, de laatste fragmenten en bronnen en de tags. Via het tegel-icoon naast de projectnaam kom je er altijd terug.

## Snel bewaren & projecten

- Plak een link in Bronnen of op de Braindump → wordt een bron; plak tekst → wordt een fragment
- **Snel bewaren** (✚ bij Verzamelen, Ctrl+Alt+S): één vak voor links en tekst
- Bronnen en fragmenten horen bij een project (groep); filter per project in Bronnen, Braindump en Tijdlijn
- Nieuwe items komen automatisch in het project van de tekst waar je aan werkt

## Schrijfcoach (zonder AI)

- **Vandaag:** dagdoel, reeks (dagen op rij), weekoverzicht en beste dag — gesynchroniseerd tussen apparaten
- **Schrijfsprint:** timer van 10–45 minuten in het focusscherm, met resultaat en tempo
- **Ik zit vast:** ideeën op basis van je eigen tekst (kernwoorden, laatste zin, ontbrekende zintuigen, dialoog) plus schrijftechnieken; in te voegen als notitie
- **Stijl:** markeert lange zinnen, vulwoorden, lijdende vorm, herhaalde woorden en gelijke zinsbeginnen
- **Analyse:** leesbaarheid (Flesch-Douma), ritme, woordenrijkdom, perspectief, tijd, dialoog en zintuigen
- **Stilval-hulp:** na een minuut stilte biedt de coach ideeën aan (uit te zetten)

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html` | De hele app |
| `config.js` | Supabase-URL en publieke sleutel |
| `supabase/schema.sql` | Tabellen en beveiligingsregels voor Supabase |
| `supabase/functions/bronnen/index.ts` | Edge Function: artikelen ophalen en zoeken op internet |
| `manifest.json`, `icon*` | Beginscherm-icoon |
| `ROADMAP.md` | Ideeën voor later |

## Hoe opslag werkt

- Alles wordt eerst direct in je browser bewaard, dus schrijven werkt ook zonder internet.
- Ben je ingelogd, dan gaat elke wijziging binnen een seconde naar Supabase en verschijnt live op je andere apparaten.
- Zonder ingevulde `config.js` werkt de app alleen lokaal op het apparaat.
- Row Level Security zorgt dat alleen jij je eigen teksten kunt lezen.
