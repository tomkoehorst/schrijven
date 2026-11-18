# Roadmap Schrijfkamer

Ideeën die bewaard zijn voor later. Bovenaan staat wat Tom als volgende wil.

## Volgende (gekozen)

### 6. Personen & plekken (verhaalbijbel)
- Namen die vaak terugkomen (woorden met een hoofdletter die niet aan het begin van een zin staan, bv. *Opa Kees*, *Ouwerkerk*) automatisch herkennen.
- Per naam een kaartje met eigen notities, eerste vermelding, aantal keer genoemd en gekoppelde fragmenten/bronnen.
- Bij hover (of tik) op de naam in de editor het kaartje tonen; overzicht als tabblad in het onderzoekspaneel.
- Opslag: nieuwe tabel (bv. `entities`: id, user_id, grp, name, aliases jsonb, note, created, updated) met RLS zoals de andere tabellen.

### 7. Tijdlijn naast je tekst
- Jaartallen en datums in de huidige tekst (zelfde herkenning als `detectDate`/`parseDate`) naast de tijdlijn-fragmenten tonen.
- Zichtbaar maken of de volgorde klopt, en welke periodes nog geen fragmenten hebben.
- Waarschijnlijk als tabblad "Tijdlijn" in het onderzoekspaneel, gefilterd op het project van de tekst.

### 8. Gesplitst scherm
- Twee teksten naast elkaar (bv. hoofdstuk + aantekeningen), beide bewerkbaar en synchroon.
- Op de telefoon: wisselen tussen de twee met een tab.

## Andere ideeën (nog niet gekozen)

- **Verder lezen:** in "Gerelateerd" ook Wikipedia-suggesties bij de kernwoorden van de alinea.
- **Bronnengebruik & bronnenlijst:** per tekst "gebruikte bronnen", per project wat nog niet gebruikt is; automatische literatuurlijst bij export. (Basis bestaat al: `usedIn()` herkent bronnen via URL en `[[titel]]`.)
- **Kopjes-bord:** kopjes van een tekst als kaartjes om te herordenen (zoals Ulysses).
- **Link plakken in de editor:** vraag "bewaren als bron en citeren?".
- **Foto → tekst (OCR)** met Tesseract.js (Nederlands), foto bewaren in Supabase Storage.
- **PDF's uploaden** en lezen/fragmenten maken (pdf.js).
- **Inspreken** via de spraakherkenning van de browser.
- **Leeslijst:** bronnen als "te lezen / gelezen" markeren; bewaarde fragmenten gemarkeerd in de lezer.
- **Herontdekken:** dagelijks één oud fragment op het Vandaag-kaartje.
- **Project exporteren:** tekst + fragmenten + bronnenlijst als Markdown of Word.
- **Delen:** alleen-lezen-link naar een tekst of verzameling.
- **AI-coach** (optioneel, kost tokens): feedback via Claude, sleutel veilig in een Supabase Edge Function.

## Werkwijze

- Alles staat in `index.html` (één bestand), Supabase-config in `config.js`, database in `supabase/schema.sql`, Edge Function in `supabase/functions/bronnen/index.ts`.
- Nieuwe tabellen/kolommen: toevoegen aan `schema.sql` (idempotent: `if not exists`), met RLS-policy en `grant ... to authenticated`; de app moet blijven werken als Tom de SQL nog niet heeft gedraaid.
- Huisstijl: crèmewit, saliegroene accenten, Nunito, Nederlands, katjes spaarzaam.
- Testen met Playwright en een nagebootste Supabase-client voordat er gepusht wordt; GitHub Pages publiceert `main` automatisch.
