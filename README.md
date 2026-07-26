# Stueve Diagram Tool — S2/RR4 Radiosonde

A self-contained, single-file web app for visualizing radiosonde ascent data
(Stueve diagram, Emagram, or Skew-T) from the S2/RR4 system. No installation,
no server, no build step — open the HTML file in a browser, or host it as a
static page (e.g. GitHub Pages).

**Live version:** https://bwicki.github.io/s2_stueve/

## What it does

- Plots temperature, dew point, and derived thermodynamic curves against
  pressure/height on a Stüve, Emagram, or Skew-T background grid
- Detects and shades inversions, isothermal layers, and cloud layers (from
  relative humidity), with a configurable shading threshold
- Computes standard sounding diagnostics: LCL, LFC, CAPE, CIN, freezing
  level, tropopause height, 0–6 km bulk wind shear, a K-Index-based
  thunderstorm-likelihood estimate, and a rough cloud-cover estimate
- Draws wind barbs and a wind-speed profile alongside the main chart, plus
  a hodograph, a rise-speed profile, a Theta-E profile, and a flight-path
  map as separate panels
- Lets you load your own CSV (`..._raw_flight_history.csv` format), compare
  multiple flights, save flights locally in the browser, export CSV/PNG,
  print a one-page PDF summary, and share a link to a flight (see below)

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

## Sharing a flight via link (optional setup)

By default, "Create link" produces a self-contained link with the flight
data compressed and thinned down to fit in the URL — this always works,
no setup needed, but isn't full resolution for long flights.

For a **short link with the full, untouched dataset**, you can optionally
deploy the included `stueve-flights-worker.js` as a free Cloudflare Worker:

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

## Browser/network notes

- The flight-path map and the launch-location lookup need an internet
  connection (they load OpenStreetMap tiles and use a free geocoding
  service). Without one, coordinates and a schematic flight-path plot are
  shown instead — nothing crashes.
- Some corporate networks block third-party map tiles; the schematic
  fallback covers that case too.
- "My flights" (local save/load) uses your browser's local storage, so
  saved flights are private to your device and browser.

## Technical notes

- Dew point: Magnus formula. LCL: Bolton (1980). Moist adiabats:
  pseudoadiabatic numerical integration. CAPE/CIN: surface-based parcel,
  no virtual-temperature correction.
- Only the ascent phase is analyzed (automatically detected up to the
  altitude maximum); descent is only used for the flight-path map.
- Thunderstorm likelihood and cloud cover are rough estimates from a
  single vertical profile — useful as a quick indicator, not a forecast.

## License / attribution

Includes two small third-party open-source libraries, embedded directly in
`index.html`: [Leaflet](https://leafletjs.com/) (BSD-2-Clause) for the map,
and [qrcodejs](https://github.com/davidshimjs/qrcodejs) (MIT) for the QR
code. Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors.
