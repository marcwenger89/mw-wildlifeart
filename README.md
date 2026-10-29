# MW-Wildlifeart

Webseite für Wildtierfotografie. Gebaut mit [Astro](https://astro.build), gehostet auf Netlify, Inhalte über den Admin-Bereich (Decap CMS) unter `/admin/`.

## Wo was liegt

| Inhalt | Ordner |
| --- | --- |
| Fotos (ein Eintrag pro Bild, mit Geschichte und Aufnahmedaten) | `src/content/fotos/` |
| Serien (Galerien) | `src/content/serien/` |
| Blog | `src/content/blog/` |
| Shop-Kacheln mit Saal-Links | `src/content/shop/` |
| Impressum, Datenschutz | `src/content/seiten/` |
| Texte Startseite, Über mich, Kontakt | `src/data/einstellungen.json` |
| Bilder (Web-Versionen, ca. 2000 px) | `public/bilder/` |
| Design (Farben, Schriften, Abstände) | `src/styles/global.css` |

Design und Inhalte sind getrennt: Das Design lässt sich ändern, ohne die Inhalte anzufassen.

## «Als Print kaufen»

Der Knopf auf jeder Foto-Detailseite nimmt den Saal-Link des Fotos. Ist dort keiner eingetragen, gilt der Saal-Link der Serie.

## Lokal starten

```sh
npm install
npm run dev
```
