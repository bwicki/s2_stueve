# Stüve Diagram Tool — S2/RR4 Radiosonde

A self-contained, single-file web app for visualizing radiosonde ascent data
(Stüve diagram, Emagram, or Skew-T) from the S2/RR4 system. No installation,
no server, no build step — open the HTML file in a browser, or host it as a
static page (e.g. GitHub Pages).

**Live version:** https://bwicki.github.io/s2_stueve/

## What it does

- Plots temperature, dew point, and Theta-E against pressure/height on a
  Stüve, Emagram, or Skew-T background grid, with a configurable altitude
  unit (m AMSL, m AGL, ft, or Flight Level) shown on its own axis column
- Shades inversions, isothermal layers, and cloud layers continuously by
  relative humidity (configurable threshold, e.g. "shade from 70% RH")
- Marks LCL, LFC, the freezing level, and the tropopause directly on the
  diagram, in addition to the parcel path and CAPE/CIN shading
- Computes a full set of sounding diagnostics: LCL, LFC, CAPE, CIN, DCAPE,
  precipitable water, freezing level, tropopause height, 0–6 km bulk wind
  shear (plus the altitude band of the sharpest local shear), a K-Index-based
  thunderstorm-likelihood estimate, and an estimated cloud cover — shown both
  as a percentage and as the matching METAR abbreviation (SKC/FEW/SCT/BKN/OVC)
  with its octas symbol
- Includes a plain-language "Analytical Comments" section with a simple
  traffic-light read (🟢🟡🔴) on rain risk and thunderstorm risk separately
- Draws wind barbs (or, optionally, numeric wind direction labels) and a
  resizable wind-speed profile alongside the main chart — drag the handle
  between them to make the wind panel wider or narrower
- Adds a hodograph, a rise-speed profile, a Theta-E profile, and a
  flight-path map as separate panels, each individually exportable as PNG
- Lets you load your own CSV (`..._raw_flight_history.csv` format), compare
  multiple flights, save flights locally in the browser (with a proper list
  view, not just a dropdown), export CSV/PNG (each PNG stamped with the
  flight's date/time and peak altitude), print a one-page PDF summary (with
  or without the side panels, your choice), and share a link with a QR code

## Files in this repository

| File | Purpose |
|---|---|
| `index.html` | The tool itself. This is the only file needed to run it. |
| `stueve-flights-worker.js` | Optional Cloudflare Worker script that enables full-resolution short share-links (see below). Not required for the tool to work. |

## Hosting it yourself

1. Upload `index.html` (rename it to `index.html` if it isn't already) to
   this repository.
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
— diagram type, altitude unit, barb density, wind smoothing, Theta-E, and
cloud-shading threshold — back to their standard defaults, so every flight
starts from the same known view.

## Default view settings

Stüve diagram · Flight Level altitude axis · 30 s barb density · smoothed
wind · wind barbs (not numeric direction) · Theta-E curve off · cloud
shading from 70% RH. Any of these can be changed per-session in the "Graph
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

- The flight-path map and the launch-location lookup need an internet
  connection (they load OpenStreetMap tiles and use a free geocoding
  service). Without one, coordinates and a schematic flight-path plot are
  shown instead — nothing crashes, and the schematic plot can still be
  exported as a PNG.
- Some corporate networks block third-party map tiles; the schematic
  fallback covers that case too.
- "My flights" (local save/load) uses your browser's local storage, so
  saved flights are private to your device and browser.

## Technical notes

- Dew point: Magnus formula. LCL: Bolton (1980). Moist adiabats:
  pseudoadiabatic numerical integration. CAPE/CIN: surface-based parcel, no
  virtual-temperature correction. LFC: first level at/above the LCL where
  the parcel is warmer than the environment. DCAPE: descent from the
  minimum-Theta-E level in the lowest 400 hPa, following the standard
  simplified approach (no entrainment). Precipitable water: column integral
  of the dewpoint-derived mixing ratio.
- Only the ascent phase is analyzed (automatically detected up to the
  altitude maximum); descent is only used for the flight-path map.
- The K-Index-based thunderstorm likelihood, the cloud-cover/METAR
  estimate, and the Analytical Comments traffic-light read are all rough,
  automated estimates from a single vertical profile — useful as a quick
  indicator, not a substitute for an official forecast.
- The altitude axis extrapolates a short distance above the highest data
  point (using the measured temperature there and the barometric formula)
  purely so the profile doesn't run right up against the top edge of the
  chart — it's a display margin, not an extra measurement.

## License / attribution

Includes two small third-party open-source libraries, embedded directly in
`index.html`: [Leaflet](https://leafletjs.com/) (BSD-2-Clause) for the map,
and [qrcodejs](https://github.com/davidshimjs/qrcodejs) (MIT) for the QR
code. Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors.
