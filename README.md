# Stüve Diagram Tool — S2/RR4 Radiosonde (v1.03.01)

> The in-app title now reads "Radiosonde Sounding Diagram" (it covers more
> than just Stüve diagrams) — this repository/document keeps its original
> name for continuity.

> **License:** This project uses a custom, non-standard license (see
> `LICENSE`). Using the app is permitted, but modifying, redistributing, or
> publishing a derivative version is **not** permitted without the
> copyright holder's prior written permission, and attribution must be
> retained. This is not an open-source (MIT/Apache/GPL-style) license.

A self-contained, single-file web app for visualizing radiosonde ascent data
(Stüve diagram, Emagram, or Skew-T) from the S2/RR4 system. No installation,
no server, no build step — open the HTML file in a browser, or host it as a
static page (e.g. GitHub Pages).

**Live version:** https://sparv.io/ · this repository

> The version number in this title matches the "· v1.DD.YY (date)" stamp
> shown next to the launch location in the app's own header — check that
> stamp against this README's title to confirm you're looking at matching
> documentation for the file you have. DD counts the working day, YY the
> build within that day.

## What it does

- On first load, shows a short "quick start" popup (auto-dismisses after
  10 seconds — pauses while your cursor is on it — or close it manually)
  explaining what the tool does
- Plots temperature, dew point, and Theta-E against pressure/height on a
  Stüve, Emagram, or Skew-T background grid, with a configurable altitude
  unit (m AMSL, m AGL, ft, or Flight Level) shown on its own axis column.
  Switching to Flight Level asks you to confirm a transition altitude
  (pre-filled with an estimate based on the launch site's elevation, or
  5000 ft) — below that altitude, everything is shown in plain feet instead
  of a flight level, matching real aviation practice. This can be
  re-adjusted any time via the small "TA: ... ft (edit)" link that appears
  under the altitude unit selector. A separate "Speed" dropdown next to it
  switches wind-speed numbers (tooltips, the wind-speed curve, and the
  Wind max / bulk shear stats) between km/h (default) and kt — wind barbs
  and the hodograph stay in knots regardless, since that's the fixed
  international convention their shapes/rings are built around, not a
  display preference
- Hovering the main chart shows a prominent red crosshair marker exactly
  where the tooltip's numbers come from — and the same height is
  simultaneously marked on the wind-speed curve, the nearest wind barb, the
  main chart's own Theta-E curve (if switched on, with its value added to
  the tooltip), and — smaller — on the hodograph, rise-speed, Theta-E, and
  flight-path map panels, so it's easy to see how one altitude shows up
  across every view at once. Hovering any of those side panels shows its
  own tooltip too, in the currently selected altitude unit
- Shades inversions, isothermal layers, and cloud layers continuously by
  relative humidity (configurable threshold, e.g. "shade from 70% RH")
- Marks LCL, LFC, the freezing level, and the tropopause directly on the
  diagram, in addition to the parcel path and CAPE/CIN shading
- Computes a full set of sounding diagnostics — LCL, LFC, CAPE, the Lifted
  Index, CIN, DCAPE, precipitable water, freezing level, tropopause height,
  thunderstorm likelihood (K-Index), estimated cloud cover (with its METAR
  abbreviation and octas symbol), 0–6 km bulk wind shear, inversions, and
  isothermal layers. **Every one of these 14 fields, plus the Analytical
  Comments section itself, has a small "i" icon**: hovering it shows a
  one-line explanation, and clicking opens a full popup with the
  derivation, general meaning, standard interpretation ranges, **and a
  dedicated section interpreting this specific flight's actual computed
  value** against those ranges, plus reference links to further reading
  and a button to download that popup as a PDF
- Includes a plain-language "Analytical Comments" section with a simple
  traffic-light read (🟢🟡🔴) on rain risk and thunderstorm risk, each on
  its own line — also included in the CSV export (as comment lines) and the
  main-chart PNG export (as an extra footer strip), not just shown in-app
- Draws wind barbs (or, optionally, numeric wind direction labels) and a
  resizable wind-speed profile alongside the main chart — drag the handle
  between them to make the wind panel wider or narrower
- Adds a hodograph, a rise-speed profile, a Theta-E profile, and a
  flight-path map as separate panels, each individually exportable as PNG.
  The flight-path map can also be opened full-size in a new window (⛶),
  with the flight still drawn, plus "Center in OSM" (opens openstreetmap.org
  centered on the flight — OSM's website has no way to render an arbitrary
  custom track, so this is the closest it supports) and "Open in Google
  Earth" (downloads a KML of the flight and opens Google Earth Web, ready
  to import it via the ☰ menu — Google Earth Web also has no URL format for
  loading arbitrary external data, so this two-step flow is the correct way
  to get it in)
- Lets you load your own CSV (`..._raw_flight_history.csv` format), compare
  multiple flights, save flights locally in the browser (with a proper list
  view, not just a dropdown), export CSV/PNG (each PNG stamped with the
  flight's date/time and peak altitude), print a one-page PDF summary (with
  or without the side panels, your choice), and share a link with a QR code
- Can upload a flight's telemetry to [SondeHub Amateur](https://amateur.sondehub.org/)
  ("☁ Upload to SondeHub", next to "Compare flight"), making it publicly
  visible on their live map — see the notes below before using this
- The bold title in the header links to [sparv.io](https://sparv.io/)

## Files in this repository

| File | Purpose |
|---|---|
| `index.html` | The tool itself. This is the only file needed to run it. |
| `stueve-flights-worker.js` | Optional Cloudflare Worker script that enables full-resolution short share-links (see below). Not required for the tool to work. |
| `LICENSE` | Custom usage license — see below. |

## Hosting it yourself

1. Upload `index.html` to this repository.
2. In the repo settings, enable **GitHub Pages** for the branch/folder
   containing it.
3. Open the resulting `https://<your-username>.github.io/<repo>/` URL.

That's it — everything else (data processing, charting, export) runs
entirely in the visitor's browser. No backend, no database, no tracking.

## Using your own flight data

Click **"Load new CSV"** and select a `..._raw_flight_history.csv` export
from the S2/RR4 ground station software. The tool auto-detects the sonde ID
from the filename and trims the pre-launch ground-idle period automatically.
Loading a new file (or clicking "Sample data") resets the display settings
— diagram type, altitude unit, transition altitude, barb density, wind
smoothing, Theta-E, and cloud-shading threshold — back to their standard
defaults, so every flight starts from the same known view (and, since
transition altitude depends on the launch site, you'll be asked to confirm
it again for each new flight).

Every button and control besides loading data itself, "My flights", the
light/dark toggle, and the keyboard-shortcuts panel stays locked (visibly
grayed out) until a flight — sample or your own — is actually loaded, so
there's no way to accidentally export, print, save, compare, or upload
data that isn't really showing on screen. If an uploaded CSV doesn't match
the expected column structure, you'll get a clear error message instead of
a silent or confusing failure.

## Default view settings

Stüve diagram · Flight Level altitude axis · 30 s barb density · smoothed
wind · wind barbs (not numeric direction) · Theta-E curve off · cloud
shading from 85% RH. Any of these can be changed per-session in the "Graph
Variables" row above the main chart.

## Sharing a flight via link (optional setup)

By default, "Create link" produces a self-contained link with the flight
data compressed and thinned down to fit in the URL — this always works,
no setup needed, but isn't full resolution for long flights, and links over
roughly 900 characters are too long to encode as a QR code (a hard limit of
the QR format itself, not something this tool can work around).

For a **short link with the full, untouched dataset — and a scannable QR
code** — you can optionally deploy the included `stueve-flights-worker.js`
as a free Cloudflare Worker:

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create → Start with Hello World!**, give it a
   name, deploy.
3. Open **Edit code**, replace the template with the contents of
   `stueve-flights-worker.js`, deploy again.
4. Go to **Settings → Bindings → Add → KV Namespace**. Variable name:
   `FLIGHTS`. Create a new KV namespace and select it.
5. Copy the Worker's URL (looks like
   `https://your-worker-name.your-subdomain.workers.dev`).
6. In `index.html`, find the line
   `const STORAGE_ENDPOINT = '';` and paste the URL between the quotes.
7. Re-upload `index.html`.

Once set up, this works for **every visitor** automatically — no one else
needs to repeat these steps or have their own Cloudflare account. If the
endpoint is ever unreachable, the tool falls back to the self-contained
link automatically, so nothing breaks if you skip this step entirely.

Printing also offers to auto-generate this link (and its QR code) onto the
printed page if one hasn't been created yet in that session.

## Browser/network notes

- The flight-path map, its full-size popup window, and the launch-location
  lookup need an internet connection (they load OpenStreetMap tiles and use
  a free geocoding service). Without one, coordinates and a schematic
  flight-path plot are shown instead — nothing crashes, and the schematic
  plot can still be exported as a PNG or opened in the popup window.
- Some corporate networks block third-party map tiles; the schematic
  fallback covers that case too.
- "My flights" (local save/load) uses your browser's local storage, so
  saved flights are private to your device and browser.
- Opening the flight-path map in a new window requires pop-ups to be
  allowed for this page.
- "Upload to SondeHub" sends this flight's telemetry (position, altitude,
  temperature, humidity) directly from your browser to SondeHub's public
  API, in batches of 500 points per request. Every row is uploaded at full
  resolution — GPS position is interpolated for rows that fall between two
  native GPS fixes, since GPS updates less often than the other sensors in
  this data. Nothing is uploaded until you explicitly click "Upload" in
  that dialog, and the data becomes publicly visible on their map
  afterward; a ✓ appears on the button once it succeeds, and clicking it
  again asks for confirmation before re-uploading the same flight.
  SondeHub's API is built for near-real-time tracking rather than
  after-the-fact bulk uploads, so this may not work from every network
  (the tool shows a clear error rather than failing silently if it's
  blocked), and it's worth double-checking that public visibility is
  actually what you want before using it.

## Technical notes

- Dew point: Magnus formula. LCL: Bolton (1980). Moist adiabats:
  pseudoadiabatic numerical integration. CAPE/CIN: surface-based parcel, no
  virtual-temperature correction. LFC: first level at/above the LCL where
  the parcel is warmer than the environment. DCAPE: descent from the
  minimum-Theta-E level in the lowest 400 hPa, following the standard
  simplified approach (no entrainment). Lifted Index: Galway (1956).
  Precipitable water: column integral of the dewpoint-derived mixing ratio.
- Flight Level is computed from true (geometric) altitude, not from a
  pressure-altitude/QNE conversion. The transition altitude used to decide
  the FL/ft cutover is whatever you confirm in the popup — the pre-filled
  suggestion is a rough estimate from the launch site's elevation (higher
  terrain → higher suggested value), **not** a lookup of the actual
  published airspace/AIP boundaries, which vary by TMA/CTR and require the
  current AIP to confirm precisely.
- Only the ascent phase is analyzed (automatically detected up to the
  altitude maximum); descent is only used for the flight-path map.
- The K-Index-based thunderstorm likelihood, the cloud-cover/METAR
  estimate, and the Analytical Comments traffic-light read are all rough,
  automated estimates from a single vertical profile — useful as a quick
  indicator, not a substitute for an official forecast. Each Flight
  Analytics field's info popup documents its own derivation, meaning, and
  standard interpretation ranges in more depth, with links to further
  reading (mainly the American Meteorological Society's Glossary of
  Meteorology and the Storm Prediction Center's mesoanalysis documentation).
- The altitude axis extrapolates a short distance above the highest data
  point (using the measured temperature there and the barometric formula)
  purely so the profile doesn't run right up against the top edge of the
  chart — it's a display margin, not an extra measurement.

## License

See `LICENSE` in this repository: use of the app is permitted, but
modification, redistribution, or publishing derivative versions requires
the author's prior written permission and must retain attribution.

## Third-party attribution

Includes two small third-party open-source libraries, embedded directly in
`index.html`: [Leaflet](https://leafletjs.com/) (BSD-2-Clause) for the map,
and [qrcodejs](https://github.com/davidshimjs/qrcodejs) (MIT) for the QR
code. Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors. These remain under their own original licenses regardless of
this repository's own LICENSE file.
