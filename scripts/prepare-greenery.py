"""Build illustrative canopy forms from open canopy height and tree-cover rasters.

Run with QGIS's python-qgis-ltr.bat. The large source clip stays in the ignored
scripts/downloads directory; only the compact GeoJSON is published.
"""

import json
import math
from pathlib import Path

import numpy as np
from osgeo import gdal, osr
from scipy.ndimage import label, maximum_filter


ROOT = Path(__file__).resolve().parents[1]
CLIP = ROOT / "scripts/downloads/kifisia-canopy-height-v2.tif"
DENSITY = ROOT / "scripts/downloads/tree_kifisia.tif"
OUTPUT = ROOT / "public/data/kifisia-canopy-forms.geojson"
SOURCE = (
    "/vsicurl/https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/"
    "dinov3_global_chm_v2_ml3/chm/1221002031.tif"
)

gdal.UseExceptions()
gdal.SetConfigOption("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
gdal.SetConfigOption("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")

if not DENSITY.exists():
    raise SystemExit("Build scripts/downloads/tree_kifisia.tif with prepare-open-data.ps1 first")
if not CLIP.exists():
    CLIP.parent.mkdir(parents=True, exist_ok=True)
    gdal.Translate(str(CLIP), SOURCE, projWin=[23.765, 38.13, 23.89, 38.055], projWinSRS="EPSG:4326")

chm = gdal.Open(str(CLIP))
gt = chm.GetGeoTransform()
width = math.ceil(chm.RasterXSize / 4)
height = math.ceil(chm.RasterYSize / 4)
bounds = [gt[0], gt[3] + chm.RasterYSize * gt[5], gt[0] + chm.RasterXSize * gt[1], gt[3]]
warp = dict(format="MEM", dstSRS="EPSG:3857", outputBounds=bounds, width=width, height=height)
surface = gdal.Warp("", chm, resampleAlg="max", **warp)
heights = surface.ReadAsArray()
density = gdal.Warp("", str(DENSITY), resampleAlg="near", **warp).ReadAsArray()

# Local maxima give representative canopy centers. Connected plateaus become
# one form; these forms are visual samples, never an individual-tree count.
peaks = (heights >= 5) & (density >= 25) & (density <= 100)
peaks &= heights == maximum_filter(heights, size=7)
regions, count = label(peaks)
rows, columns = np.where(peaks)
ids = regions[rows, columns]
weights = np.bincount(ids, minlength=count + 1)
row_sum = np.bincount(ids, weights=rows, minlength=count + 1)
column_sum = np.bincount(ids, weights=columns, minlength=count + 1)

source_srs = osr.SpatialReference()
source_srs.ImportFromEPSG(3857)
target_srs = osr.SpatialReference()
target_srs.ImportFromEPSG(4326)
source_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
target_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
to_lonlat = osr.CoordinateTransformation(source_srs, target_srs)
form_gt = surface.GetGeoTransform()
features = []
for region in range(1, count + 1):
    row = round(row_sum[region] / weights[region])
    column = round(column_sum[region] / weights[region])
    top = int(heights[row, column])
    cover = int(density[row, column])
    if top < 5 or not 25 <= cover <= 100:
        continue
    x, y = gdal.ApplyGeoTransform(form_gt, column + 0.5, row + 0.5)
    lon, lat, _ = to_lonlat.TransformPoint(x, y)
    radius = round(min(8, max(2.2, top * (0.28 + cover * 0.002))), 1)
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [round(lon, 7), round(lat, 7)]},
        "properties": {"height_m": top, "crown_radius_m": radius, "cover_pct": cover},
    })

if not 1000 <= len(features) <= 100000:
    raise SystemExit(f"Unexpected canopy-form count: {len(features)}")
OUTPUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(features)} representative canopy forms to {OUTPUT}")
