# Kifisia Urban Observatory

A small open-data 3D atlas of **Kifisia municipality**, including Kifisia, Nea Erythraia and Ekali. The first release lets you inspect the city's building massing and municipal extent. It is a deliberately narrow base for future geospatial analysis.

## Run locally

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the static site in `dist/`.

## Data used in this release

| Layer | Source | How it is used | Limit |
| --- | --- | --- | --- |
| Municipality boundary | [OpenStreetMap relation 2080716](https://www.openstreetmap.org/relation/2080716), assembled through [Nominatim](https://nominatim.org/) | Stored as `public/data/kifisia-boundary.geojson` | OSM boundary can change; this snapshot is from 25 October 2026. |
| Buildings and base map | [OpenFreeMap](https://openfreemap.org/) vector tiles built from OpenStreetMap and OpenMapTiles data | MapLibre renders `render_height` as a simple extrusion | Heights are generalized tile attributes. They are not survey-grade building heights. Features without a height remain flat. |

OpenStreetMap data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). OpenFreeMap's map attribution is shown in the map control. The municipality boundary is a planning reference, not a legal boundary determination.

To refresh the committed boundary:

```sh
npm run data:boundary
```

This command makes one Nominatim lookup and writes the result to `public/data/`. The public site reads the committed file and makes no Nominatim requests.

## Design and next step

The map is the product. A compact side panel gives context, district shortcuts, layer switches and details for a selected building. The interface borrows the inspectable-building approach of the [Helsinki 3D urban data model](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d) and the simple browser rendering pattern of [Diorambo](https://diorambo.org/about), while keeping this first release limited to data already verified for Kifisia.

The next meaningful addition is a **measured green-cover layer** with an explicit acquisition date and resolution. [Copernicus Tree Cover Density](https://land.copernicus.eu/en/products/high-resolution-layer-tree-cover-density) is a candidate, subject to a coverage and licensing check for a clipped Kifisia extract. Transit data is a separate later step: schedules and vehicle positions need their own freshness and service checks before being labeled live.

## Code map

- `src/main.js`: map setup and interactions.
- `src/style.css`: layout and visual styling.
- `scripts/fetch-boundary.mjs`: reproducible boundary download.
- `public/data/`: committed, derived GeoJSON.

No application server or API key is required. The map needs internet access for OpenFreeMap tiles and the MapLibre base style.
