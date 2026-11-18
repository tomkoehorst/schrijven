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

## Bronnen

- Artikelen bewaren via een link: titel, samenvatting en leesbare tekst worden opgehaald
- Zoeken op internet (Brave Search) en in Wikipedia, met één klik bewaren
- Eigen notities en citaten, tags, favorieten en zoeken door de volledige tekst
- Tekst selecteren in een bron → **Citeer in je tekst** (met bronvermelding)
- Bewaren vanaf de telefoon (deelmenu op Android, Opdracht op iPhone) of met een bladwijzer

**Fragmenten:** selecteer tekst in een bron en kies **Fragment** — met datum, tags en kleur.

- **Braindump:** bord met kaartjes voor fragmenten en losse gedachten (snel intikken bovenaan)
- **Tijdlijn:** fragmenten met een datum op volgorde, per jaar; jaartallen en datums worden herkend
- Elk kaartje kan met één klik in je tekst (als citaat met bronvermelding)

Hiervoor is de Edge Function `supabase/functions/bronnen` nodig (en voor webzoeken een `BRAVE_API_KEY`).

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
