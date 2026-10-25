# Kifisia Urban Observatory

A focused 3D open-data atlas of **Kifisia municipality**, including Kifisia, Nea Erythraia and Ekali. It combines mapped building massing, 2024 tree cover, transport layers and direct links to municipal maps.

**[Open the live map](https://mixalismix-dr.github.io/kifisia-urban-observatory/)**

## Run locally

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the static site in `dist/`.

## Map data

| Layer | Source | How it is used | Limit |
| --- | --- | --- | --- |
| Municipality boundary | [OpenStreetMap relation 2080716](https://www.openstreetmap.org/relation/2080716), assembled through [Nominatim](https://nominatim.org/) | Stored as `public/data/kifisia-boundary.geojson` | OSM boundary can change; this snapshot is from 25 October 2026. |
| Buildings and base map | [OpenFreeMap](https://openfreemap.org/) vector tiles built from OpenStreetMap and OpenMapTiles data | MapLibre renders `render_height` as a simple extrusion | Heights are generalized tile attributes. They are not survey-grade building heights. Features without a height remain flat. |
| Tree cover density | [Copernicus Land Monitoring Service](https://land.copernicus.eu/en/products/high-resolution-layer-forests-and-tree-cover?tab=tree_cover_density), [Attica extract at Athens GIS](https://athensgis.gr/) | 2024 reference year, 10 m source raster. A Kifisia clip is stored as a transparent image. Pixel colors represent 1–100% tree crown cover. | The image is a visual overlay. It is not a current tree inventory or a measured canopy height. Cells with no mapped tree cover are transparent. |
| Main roads | OpenFreeMap / OpenStreetMap vector tiles | Primary, secondary, tertiary and trunk road classes are highlighted on demand. | The layer describes road classes, not congestion or current passability. |
| Bike facilities | OpenFreeMap / OpenStreetMap vector tiles and an [OSM API](https://wiki.openstreetmap.org/wiki/API_v0.6#Map) extract dated 25 October 2026 | Dedicated cycleways appear across the map. A Kifisia-centre extract adds 19 road segments tagged as bike tracks or lanes. | Road-tagged facilities are covered only in the centre extract. OSM mapping is incomplete and tags do not certify present condition. |
| Bus stops | [OASA stop data via Athens GIS](https://athensgis.gr/) | 264 points clipped to the municipality. Athens GIS published its extract on 21 October 2026. | A stop point does not establish current service or accessibility. Trolley-only stops are excluded from this source. |
| Live buses | [Community-operated OASA telematics API](https://github.com/angelospk/athens-transit-rt) | Optional positions refreshed each minute; only positions younger than five minutes are displayed. | The community feed may be delayed or unavailable. It does not describe road traffic. |

OpenStreetMap data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). OpenFreeMap's map attribution is shown in the map control. [Athens GIS](https://athensgis.gr/about) publishes its repository under CC BY 4.0, subject to the original source rights. [Copernicus land data](https://land.copernicus.eu/en/data-policy) is attributed to the Copernicus Land Monitoring Service. The municipality boundary is a planning reference, not a legal boundary determination.

The [municipal works map](https://kifissia.gr/erga_map/), [daily road-closure map](https://kifissia.gr/diakopes-kykloforias-oligoora-kleisimata-dromon/), [traffic police bulletin](https://www.astynomia.gr/kykloforia-stous-dromous/deltio-kykloforias-attiki/) and [Google Maps traffic view](https://www.google.com/maps/@38.0736082,23.8082244,13z/data=!5m1!1e1) open from the sidebar. Their data is not copied into this site. Road traffic is therefore checked at the source rather than presented as a live color layer here.

To refresh the committed boundary:

```sh
npm run data:boundary
```

This command makes one Nominatim lookup and writes the result to `public/data/`. The public site reads the committed file and makes no Nominatim requests.

To rebuild the tree image and bus-stop clip, run `powershell -ExecutionPolicy Bypass -File scripts/prepare-open-data.ps1` on a machine with QGIS 3.40.9 installed. The script downloads the Athens GIS source files, clips them with GDAL, and writes the derived files to `public/data/`. Source downloads stay in `scripts/downloads/`, which is ignored by Git. If the municipality boundary changes, update the image coordinates in `src/main.js` from `gdalinfo scripts/downloads/tree_kifisia.tif`.

Run `powershell -ExecutionPolicy Bypass -File scripts/prepare-cycleways.ps1` to refresh the Kifisia-centre bike extract. Its fixed bounding box and the 19-segment result make the partial coverage inspectable. The script parses OSM ways with `highway=cycleway` or a lane/track `cycleway*` tag, then clips them to the municipal boundary.

## Design

The map is the product. A compact side panel gives context, district shortcuts, layer switches, source links and details for selected features. The interface draws on the inspectable-building approach of the [Helsinki 3D urban data model](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d). The live bus switch adds a small ARGOS-like moving layer without disguising its community provenance or age.

## Code map

- `src/main.js`: map setup and interactions.
- `src/style.css`: layout and visual styling.
- `scripts/fetch-boundary.mjs`: reproducible boundary download.
- `scripts/prepare-open-data.ps1`: reproducible tree-cover and bus-stop clipping.
- `scripts/prepare-cycleways.ps1`: reproducible OSM bike-facility extraction for Kifisia centre.
- `public/data/`: committed derived GeoJSON and tree-cover image.

No application server or API key is required. The map needs internet access for OpenFreeMap tiles and the MapLibre base style.
