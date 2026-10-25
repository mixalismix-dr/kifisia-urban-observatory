# Kifisia Urban Observatory

A 3D open-data atlas of **Kifisia municipality**, including Kifisia, Nea Erythraia and Ekali. It combines mapped buildings, tree cover, transport, waterways, land cover, terrain and local places. The sidebar links to the municipality's own maps for changing civic information.

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
| Rivers and streams | [Athens GIS hydrology layer](https://athensgis.gr/) | 11 clipped watercourse features, including tributaries of the Kifisos system. | Centerlines do not establish flood extent, navigability or current surface flow. |
| Parks and playgrounds | [Athens GIS public-space layers](https://athensgis.gr/) | 118 park polygons and 21 playground polygons clipped to the municipality. | This is a mapped inventory, not a current facilities or safety inspection. Compare with the [municipal playground and sports map](https://kifissia.gr/paidikes-chares-choroi-athlisis/). |
| Walking paths | OpenFreeMap / OpenStreetMap vector tiles | Paths and footways appear on demand. The [municipality's Syngrou Estate walk](https://old.kifissia.gr/sites/default/files/arxia/%CE%9C%CE%99%CE%9A%CE%A1%CE%8C%20%CE%9F%CE%94%CE%9F%CE%99%CE%A0%CE%9F%CE%A1%CE%99%CE%9A%CE%9F%20%CE%A3%CE%A4%CE%9F%20%CE%9A%CE%A4%CE%97%CE%9C%CE%91%20%CE%A3%CE%A5%CE%93%CE%93%CE%A1%CE%9F%CE%A5_2.pdf) and [Wikiloc Kifisia hikes](https://www.wikiloc.com/trails/hiking/greece/attica/kifisia) open separately. | Mapped path segments are not validated hiking routes. Check access and conditions. [Wikiloc's terms](https://www.wikiloc.com/wikiloc/terms_en.html) restrict republishing route data, so its tracks are linked rather than copied. |
| Land cover and use | [Athens GIS 2021 layer](https://athensgis.gr/) | 2,120 polygons clipped to Kifisia; select one to read its source class. | Broad land-cover classes are not parcel zoning or legal land-use status. |
| Surface elevation and contours | [Copernicus DEM GLO-30 public release](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) via [AWS Open Data](https://registry.opendata.aws/copernicus-dem/) | 30 m digital surface model (DSM), clipped to Kifisia and colored by height; 20 m contours derived with GDAL. | DSM includes canopy and buildings and reflects older radar acquisitions. It is unsuitable as a bare-earth DTM or for drainage design. No reusable local DTM was verified. |
| Places and heritage | [Athens GIS schools, hospitals, police, cinema, theatre and archaeological-site layers](https://athensgis.gr/); [municipal attractions](https://kifissia.gr/axiotheata/); [OpenStreetMap](https://www.openstreetmap.org/copyright) | 80 civic/service points, five historic-site polygons and three selected municipal landmarks. | Point data and OSM coordinates may be incomplete or outdated. Selected landmarks are examples, not a complete heritage register. |

OpenStreetMap data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). OpenFreeMap's map attribution is shown in the map control. [Athens GIS](https://athensgis.gr/about) publishes its repository under CC BY 4.0, subject to the original source rights. [Copernicus land data](https://land.copernicus.eu/en/data-policy) is attributed to the Copernicus Land Monitoring Service. The municipality boundary is a planning reference, not a legal boundary determination.

The [municipal works map](https://kifissia.gr/erga_map/), [daily road-closure map](https://kifissia.gr/diakopes-kykloforias-oligoora-kleisimata-dromon/), [playground and sports map](https://kifissia.gr/paidikes-chares-choroi-athlisis/), [civil-protection map](https://kifissia.gr/politiki-prostasia/), [official Attica flood and water map](https://7ad.gov.gr/diadiktyakos-chartis-diefthynsis-ydaton-attikis-ydrologia-plimmyres/), [traffic police bulletin](https://www.astynomia.gr/kykloforia-stous-dromous/deltio-kykloforias-attiki/) and [Google Maps traffic view](https://www.google.com/maps/@38.0736082,23.8082244,13z/data=!5m1!1e1) open from the sidebar. The municipality publishes several of these as embedded maps or PDFs, without a verified reusable geodata feed. Their geometries are not copied into this site. Check current works, closures, flood hazards and road traffic at those sources.

To refresh the committed boundary:

```sh
npm run data:boundary
```

This command makes one Nominatim lookup and writes the result to `public/data/`. The public site reads the committed file and makes no Nominatim requests.

To rebuild the tree image and bus-stop clip, run `powershell -ExecutionPolicy Bypass -File scripts/prepare-open-data.ps1` on a machine with QGIS 3.40.9 installed. The script downloads the Athens GIS source files, clips them with GDAL, and writes the derived files to `public/data/`. Source downloads stay in `scripts/downloads/`, which is ignored by Git. If the municipality boundary changes, update the image coordinates in `src/main.js` from `gdalinfo scripts/downloads/tree_kifisia.tif`.

Run `powershell -ExecutionPolicy Bypass -File scripts/prepare-cycleways.ps1` to refresh the Kifisia-centre bike extract. Its fixed bounding box and the 19-segment result make the partial coverage inspectable. The script parses OSM ways with `highway=cycleway` or a lane/track `cycleway*` tag, then clips them to the municipal boundary.

Run `powershell -ExecutionPolicy Bypass -File scripts/prepare-atlas.ps1` to rebuild the landscape, land-cover, civic and DSM layers. The script downloads the public Athens GIS files and Copernicus GLO-30 tile, clips them with QGIS/GDAL, and rebuilds the small point collections with Node.js. Source downloads stay in ignored `scripts/downloads/`. Run `npm run check:data` afterward.

## Design

The map is the product. A compact side panel gives context, district shortcuts, layer switches, source links and details for selected features. The interface draws on the inspectable-building approach of the [Helsinki 3D urban data model](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d). The live bus switch adds a small ARGOS-like moving layer without disguising its community provenance or age.

## Code map

- `src/main.js`: map setup and interactions.
- `src/style.css`: layout and visual styling.
- `scripts/fetch-boundary.mjs`: reproducible boundary download.
- `scripts/prepare-open-data.ps1`: reproducible tree-cover and bus-stop clipping.
- `scripts/prepare-cycleways.ps1`: reproducible OSM bike-facility extraction for Kifisia centre.
- `scripts/prepare-atlas.ps1`: reproducible Athens GIS and Copernicus terrain extract.
- `scripts/build-atlas-pois.mjs`: small civic and landmark point collections.
- `public/data/`: committed clipped GeoJSON and raster overlays.

No application server or API key is required. The map needs internet access for OpenFreeMap tiles and the MapLibre base style.
