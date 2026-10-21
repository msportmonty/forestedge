# Forest Edge Kart Motorsport

A modern, responsive, single-page website for Forest Edge Kart Motorsport. Plain HTML, CSS and JavaScript with no build step and no dependencies.

## Design

A light "forest" theme: off-white (`#f7f9f6`) and cream surfaces, pine and hunter greens for headings, buttons and anchors, and sage tints for borders, hover states and card backgrounds. Headings are set in **Fraunces** (serif) and body text in **Manrope**. Both are open-licensed and self-hosted in `assets/fonts/`, so the site makes no third-party font requests. All colours are CSS variables at the top of `styles.css`.

Every text/background pairing meets WCAG AA contrast (4.5:1 for body text). The page has no layout shift: the leaderboard, kart panel and stat counters reserve their space before content changes.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). For GitHub Pages: **Settings → Pages → Deploy from branch → root**.

## Sections

- **Hero**: animated headline, count-up track stats and a scrolling ticker
- **Racing programmes**: Arrive & Drive, Junior Academy, Club Championship
- **Circuit**: interactive SVG track map with sector highlighting and an animated lap marker
- **Fleet**: kart class switcher (Cadet / Sport / Pro) with specs
- **Live timing**: filterable fastest-lap leaderboard
- **Events**: race calendar
- **Pricing**: packages that preselect the booking form
- **Reviews** and a **booking form** with client-side validation

## Before going live, replace the placeholder content

| What | Where |
| --- | --- |
| Phone, email, opening hours | `index.html` → `#book` section |
| Prices and packages | `index.html` → `#pricing` |
| Track stats (length, corners, lap record) | `index.html` → hero `data-count` values |
| Event dates | `index.html` → `#events` |
| Kart specs | `script.js` → `karts` object |
| Leaderboard sample data | `script.js` → `laps` array (or wire it to your timing system) |
| Testimonials | `index.html` → `#reviews` |
| Booking submission | `script.js` → form handler (connect to email, Formspree or a booking API) |

Right now the booking form only shows a confirmation message. It doesn't send anything yet.
