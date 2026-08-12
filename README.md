# Radiosonde Sounding Diagram (v1.03.04)

*Formerly "Stüve Diagram Tool" — this repository keeps its original name for continuity, even though the app itself now covers Stüve, Emagram, and Skew-T diagrams and has grown well beyond a single chart.*

> **License:** custom, not open-source — see [`LICENSE`](./LICENSE). Using the app is
> permitted; modifying, redistributing, or publishing a derivative version needs the
> copyright holder's prior written permission and must keep attribution.

A self-contained, single-file web app for visualizing radiosonde ascent data from the
Windsond S2 / RR4 system as a Stüve, Emagram, or Skew-T diagram. No installation, no
server, no build step — open `index.html` directly, or host it as a static page (e.g.
GitHub Pages).

**Live version:** https://sparv.io/ · this repository

> The version stamp in the app's own header ("· v1.DD.YY (date)", next to the launch
> location) tells you exactly which build you're looking at — DD counts the working day,
> YY the build within that day. Check it against this README's title.

---

## Contents

- [What it does](#what-it-does)
- [Getting started](#getting-started)
- [Live polling during an active ascent](#live-polling-during-an-active-ascent)
- [The diagram, panel by panel](#the-diagram-panel-by-panel)
- [Flight Analytics & Analytical Comments](#flight-analytics--analytical-comments)
- [Altitude units & Flight Level](#altitude-units--flight-level)
- [Wind display & units](#wind-display--units)
- [Sharing, exporting, and printing](#sharing-exporting-and-printing)
- [SondeHub upload](#sondehub-upload)
- [Hosting it yourself](#hosting-it-yourself)
- [Browser & network notes](#browser--network-notes)
- [Technical notes](#technical-notes)
- [License & attribution](#license--attribution)

---

## What it does

- Plots temperature, dew point, and (optionally) Theta-E against pressure/height on a
  Stüve, Emagram, or Skew-T background grid.
- Shades inversions, isothermal layers, and cloud layers continuously by relative
  humidity, marks LCL, LFC, the freezing level, and the tropopause, and shades CAPE/CIN
  around the parcel path.
- Marks the flight's peak altitude directly on the altitude axis (💥, with a background
  badge so it doesn't collide with the regular scale labels).
- Draws wind barbs (or numeric direction labels) and a resizable wind-speed profile
  beside the main chart, plus a hodograph, a rise-speed profile, a Theta-E profile, and
  a flight-path map as separate panels.
- Automatically detects genuine gaps in the source data (a real dropout of several
  consecutive samples — not routine single-value jitter or the normal lag between GPS
  fixes) and draws those stretches dashed instead of solid, on every curve and on the
  map, so you can tell interpolated data from a real measurement at a glance.
- Computes a full set of sounding diagnostics — see
  [Flight Analytics](#flight-analytics--analytical-comments) below — each with its own
  "i" info popup explaining the derivation, meaning, standard interpretation ranges,
  *and* how this specific flight's value compares, plus links to further reading and a
  PDF-download button.
- Lets you load your own CSV, optionally keep **live-polling** it while the sonde is
  still ascending, compare multiple flights, save flights locally in the browser, export
  CSV/PNG, print a one-page PDF summary, share a link with a QR code, and upload a
  flight's telemetry to SondeHub.

## Getting started

Every button and control beyond loading data itself, "My flights", the light/dark
toggle, and the keyboard-shortcuts panel stays locked (visibly grayed out) until a
flight — sample or your own — is actually loaded, so there's no way to accidentally
export, print, or upload data that isn't really on screen.

1. Click the highlighted **▶ Sample data** button to explore an example ascent, or
2. Click **⤒ Load new CSV** and select a `..._raw_flight_history.csv` export from the
   S2/RR4 ground station software.

The tool auto-detects the sonde ID from the filename and trims the pre-launch
ground-idle period automatically. If the file doesn't match the expected column
structure, you'll get a clear error message rather than a silent failure. Loading a new
file (or clicking "Sample data") resets the display settings — diagram type, altitude
unit, transition altitude, speed unit, barb density, wind smoothing, Theta-E, and
cloud-shading threshold — back to their standard defaults (Stüve · m AMSL · km/h ·
30 s barbs · smoothed · barb display · Theta-E off · cloud shading from 85% RH), so
every flight starts from the same known view.

The **☰ menu** next to "Sample data" holds the light/dark toggle, keyboard shortcuts,
and **About — more info**, which opens this same documentation as a formatted page in a
new window (with its own Print/Close bar — use Print to save it as a PDF), so it's
always available from inside the app without needing this file.

## Live polling during an active ascent

The S2/RR4 ground station software writes the flight's CSV continuously while a sonde is
airborne. After loading a CSV, the tool asks whether the sonde is still ascending and
offers to keep polling that same file (interval configurable, 10 s by default) so the
diagram keeps rebuilding itself as new rows are appended — no manual re-uploading.

This needs a browser with the **File System Access API** (Chrome or Edge on desktop),
since that's what lets the page re-read the same file straight from disk later. In other
browsers (Firefox, Safari, mobile), the question still appears, but choosing "Yes"
explains that live polling isn't available there and suggests re-clicking "Load new CSV"
manually whenever you want to refresh.

While polling is active, "Load new CSV" is replaced by a red **⏹ Stop polling of CSV**
button in the same spot; clicking it stops polling and leaves the diagram exactly as it
last stood. Loading a different file or clicking "Sample data" also stops any active
polling automatically.

## The diagram, panel by panel

**Main chart** — temperature (red) and dew point (cyan) against pressure/height, with a
choice of three backgrounds:

| Diagram type | Y-axis | Notes |
|---|---|---|
| Stüve | p^0.286 | classic, straight dry adiabats |
| Emagram | ln(p) | straight isotherms |
| Skew-T | ln(p) + shear | industry-standard layout; LCL/LFC markers are drawn *unskewed* so the circle/triangle shapes stay true regardless of the shear transform |

Hovering the main chart shows a red crosshair marker exactly where the tooltip's numbers
come from — and the same height is simultaneously marked (smaller) on the wind-speed
curve, the nearest wind barb, the main chart's own Theta-E curve (if switched on, with
its value added to the tooltip), and on the hodograph, rise-speed, Theta-E, and
flight-path map panels, so it's easy to see how one altitude shows up across every view
at once. Hovering any side panel shows its own tooltip too, in the currently selected
altitude unit.

**Vertical zoom** — the two sliders left of the main chart restrict *every* panel
(main chart, hodograph, rise-speed, Theta-E, and the flight-path map) to the selected
altitude window, not just the main chart. The map specifically filters by the *time*
window of the selected ascent segment (not by altitude band alone), so a zoomed view
never mixes in the descent passing back through the same altitudes.

**Side panels** — hodograph, rise-speed profile, Theta-E profile, and flight-path map,
each with its own PNG export button. The flight-path map also has a **⛶** button to open
it full-size in a new window, with "Center in OSM" (opens openstreetmap.org centered on
the flight — OSM's website has no way to render an arbitrary custom track, so this is
the closest it supports) and "Open in Google Earth" (downloads a KML of the flight,
including the burst-point marker, and opens Google Earth Web ready to import it via the
☰ menu).

## Flight Analytics & Analytical Comments

Fourteen computed fields, each with a small **"i"** icon: hovering shows a one-line
explanation, and clicking opens a full popup with the derivation (including the actual
formula), what the value means physically, standard interpretation ranges from the
meteorological literature, a dedicated section interpreting *this flight's* actual value
against those ranges, reference links (mainly the AMS Glossary of Meteorology and the
SPC's mesoanalysis documentation) that open in a new tab, and a button to download that
popup as a PDF.

LCL · LFC · CAPE · Lifted Index · CIN · DCAPE · Precipitable Water · Freezing Level ·
Tropopause · Thunderstorm likelihood (K-Index) · Cloud cover (with its METAR
abbreviation and octas symbol) · 0–6 km bulk wind shear · Inversions · Isothermal layers

Below the numbers, **Analytical Comments** gives a plain-language traffic-light read
(🟢🟡🔴) on rain risk and thunderstorm risk — each on its own line, each with its own
"i" popup explaining the thresholds used — generated from the fields above. This section
is also included in the CSV export (as comment lines) and the main-chart PNG export (as
an extra footer strip), not just shown in-app. Treat all of this as a fast, single-sounding
sanity check, not a substitute for an official forecast.

## Altitude units & Flight Level

Four altitude units are available (m AMSL, m AGL, ft, Flight Level). Switching to Flight
Level asks you to confirm a **transition altitude** — pre-filled with a rough estimate
based on the launch site's elevation (higher terrain → higher suggested value), or
5000 ft if nothing better is known. This is *not* a lookup of the actual published
airspace/AIP boundaries, which vary by TMA/CTR and require the current AIP to confirm
precisely — it's a starting point you can correct.

Below that transition altitude, everything (axis labels, tooltips, the ground line, the
peak marker) is shown in plain feet instead of a flight level, matching real aviation
practice. The transition altitude can be re-adjusted any time via the small
"TA: … ft (edit)" link under the altitude selector, and is asked again for every new
flight (since it depends on the launch site).

## Wind display & units

A **Speed** dropdown next to the altitude selector switches wind-speed numbers
(tooltips, the wind-speed curve, and the Wind max / bulk shear stats) between km/h
(default) and kt. Wind barbs and the hodograph always stay in knots regardless, since
that's the fixed international convention their shapes/rings are built around, not a
display preference.

## Sharing, exporting, and printing

- **Export CSV** — the processed, ascent-only data plus a header of computed diagnostics
  and the Analytical Comments.
- **Export PNG** — per-panel, each stamped with the flight's date/time and (for the main
  chart) peak altitude and the Analytical Comments as a footer strip.
- **Print** — a one-page PDF summary, with or without the side panels (your choice).
- **Create link** — by default, a self-contained link with the flight data compressed
  and thinned to fit in the URL (works everywhere, but isn't full resolution for long
  flights, and links over ~900 characters are too long for a QR code — a hard limit of
  the QR format itself). For a **short link with the full dataset and a QR code**, you
  can optionally deploy the included `stueve-flights-worker.js` as a free Cloudflare
  Worker — see the comments in that file for the five-minute setup, then paste the
  Worker's URL into the `STORAGE_ENDPOINT` constant near the top of `index.html`. Once
  set up, it works for every visitor automatically; if it's ever unreachable, the tool
  falls back to the self-contained link with no visible error.

## SondeHub upload

**☁ Upload to SondeHub** sends every row of the currently loaded flight (position,
altitude, temperature, humidity) to SondeHub Amateur's public API, in batches of 500
points, interpolating position for rows that fall between two native GPS fixes so the
upload isn't limited to GPS's own (slower) update rate. Nothing is uploaded until you
explicitly confirm in the dialog, and the data becomes **publicly visible** on
SondeHub's map afterward. A ✓ appears on the button once it succeeds, and clicking it
again asks for confirmation (via the app's own dialog, not the browser's) before
re-uploading the same flight. SondeHub's API is built for near-real-time tracking rather
than after-the-fact bulk uploads, so this may not work from every network — the tool
shows a clear error rather than failing silently if it's blocked.

## Hosting it yourself

1. Upload `index.html` to this repository.
2. In the repo settings, enable **GitHub Pages** for the branch/folder containing it.
3. Open the resulting `https://<your-username>.github.io/<repo>/` URL.

That's it — everything else (data processing, charting, export) runs entirely in the
visitor's browser. No backend, no database, no tracking.

## Browser & network notes

- The flight-path map, its full-size popup window, and the launch-location lookup need
  an internet connection (OpenStreetMap tiles, a free geocoding service). Without one, a
  schematic flight-path plot is shown instead — nothing crashes, and it can still be
  exported as a PNG or opened in the popup window.
- Some corporate networks block third-party map tiles; the schematic fallback covers
  that case too.
- "My flights" (local save/load) uses your browser's local storage — saved flights are
  private to your device and browser.
- Opening the flight-path map in a new window requires pop-ups to be allowed.
- Live CSV polling requires Chrome or Edge on desktop (see above).
- "Upload to SondeHub" sends data directly from your browser to SondeHub's public API,
  which becomes publicly visible on their map — see [SondeHub upload](#sondehub-upload).

## Technical notes

- Dew point: Magnus formula. LCL: Bolton (1980). Moist adiabats: pseudoadiabatic
  numerical integration. CAPE/CIN: surface-based parcel, no virtual-temperature
  correction. LFC: first level at/above the LCL where the parcel is warmer than the
  environment. DCAPE: descent from the minimum-Theta-E level in the lowest 400 hPa,
  following the standard simplified approach (no entrainment). Lifted Index: Galway
  (1956). Precipitable water: column integral of the dewpoint-derived mixing ratio.
- Flight Level is computed from true (geometric) altitude, not a pressure-altitude/QNE
  conversion — see [Altitude units & Flight Level](#altitude-units--flight-level).
- Gap detection uses the sounding's own typical sample interval as a baseline: routine
  single- or double-sample dropouts (which happen constantly in real telemetry) are
  filled invisibly; only a stretch of several consecutive missing samples is flagged and
  drawn dashed. GPS position gets its own, more lenient threshold based on its own
  (slower) typical fix interval, so normal GPS lag is never flagged as a gap.
- Only the ascent phase is analyzed (automatically detected up to the altitude maximum);
  descent is only used for the flight-path map.
- The K-Index-based thunderstorm likelihood, the cloud-cover/METAR estimate, and the
  Analytical Comments traffic-light read are all rough, automated estimates from a
  single vertical profile — useful as a quick indicator, not a substitute for an
  official forecast.
- The altitude axis extrapolates a short distance above the highest data point (using
  the measured temperature there and the barometric formula) purely so the profile
  doesn't run right up against the top edge of the chart — a display margin, not an
  extra measurement.

## License & attribution

See [`LICENSE`](./LICENSE): use of the app is permitted, but modification,
redistribution, or publishing derivative versions requires the author's prior written
permission and must retain attribution.

Includes two small third-party open-source libraries, embedded directly in
`index.html`: [Leaflet](https://leafletjs.com/) (BSD-2-Clause) for the map, and
[qrcodejs](https://github.com/davidshimjs/qrcodejs) (MIT) for the QR code. Map tiles ©
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. These remain
under their own original licenses regardless of this repository's own LICENSE file.
