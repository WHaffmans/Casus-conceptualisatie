# Casusconceptualisatie schema's

PWA waarmee een cliënt op de eigen telefoon de casusconceptualisatie bijhoudt (kind, vader, moeder, gezinsregels en schema's met overgave, vermijding, overcompensatie en probleem). Alles blijft lokaal op het toestel (localStorage); er is geen server. Via **Delen als PDF** wordt een liggende A4-PDF gemaakt in de opmaak van `Formulier_Casusconceptualisatie_schema_grafisch.pdf`, die via het deelmenu naar de zorgverlener kan.

## Ontwikkelen

```sh
npm install
npm run dev       # ontwikkelserver
npm run build     # productiebuild in dist/
npm run preview   # build lokaal bekijken
```

## Publiceren

`dist/` is een statische site (relatieve paden, dus ook in een submap). Host via HTTPS, bijvoorbeeld GitHub Pages of Netlify; HTTPS is nodig voor installeren en offline gebruik.

## Gegevens

- Automatisch opgeslagen in de browser van het toestel.
- Menu ⋮ → *Backup maken* / *Backup terugzetten* (JSON-bestand) en *Alles wissen*.
- Worden de browsergegevens gewist of de app verwijderd, dan zijn de gegevens zonder backup weg.
