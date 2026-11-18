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
| `manifest.json`, `icon*` | Beginscherm-icoon |

## Hoe opslag werkt

- Alles wordt eerst direct in je browser bewaard, dus schrijven werkt ook zonder internet.
- Ben je ingelogd, dan gaat elke wijziging binnen een seconde naar Supabase en verschijnt live op je andere apparaten.
- Zonder ingevulde `config.js` werkt de app alleen lokaal op het apparaat.
- Row Level Security zorgt dat alleen jij je eigen teksten kunt lezen.
