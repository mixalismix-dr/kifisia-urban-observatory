"""Attach the Athens GIS 2021 building-block height grid to clipped OSM footprints."""

import json
import math
import re
from collections import Counter
from pathlib import Path

from osgeo import gdal, ogr, osr


gdal.UseExceptions()
root = Path(__file__).resolve().parents[1]
source = root / "scripts/downloads/kifisia-tagged-clipped.geojson"
raster = gdal.Open(str(root / "scripts/downloads/Building_height_2021.tif"))
if raster is None:
    raise RuntimeError("Athens GIS building-height raster is missing")
band = raster.GetRasterBand(1)
origin_x, pixel_x, _, origin_y, _, pixel_y = raster.GetGeoTransform()
wgs84 = osr.SpatialReference()
wgs84.ImportFromEPSG(4326)
grid_crs = osr.SpatialReference()
grid_crs.ImportFromWkt(raster.GetProjection())
wgs84.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
grid_crs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
transform = osr.CoordinateTransformation(wgs84, grid_crs)


def tagged_height(tags):
    match = re.match(r"\s*(\d+(?:\.\d+)?)", str(tags.get("height", "")))
    if match and float(match.group(1)) > 0:
        return float(match.group(1))
    try:
        levels = float(tags.get("building:levels", 0))
        return levels * 3 if levels > 0 else None
    except (TypeError, ValueError):
        return None


def raster_height(geometry):
    shape = ogr.CreateGeometryFromJson(json.dumps(geometry))
    shape.AssignSpatialReference(wgs84)
    shape.Transform(transform)
    center = shape.Centroid()
    col = math.floor((center.GetX() - origin_x) / pixel_x)
    row = math.floor((center.GetY() - origin_y) / pixel_y)
    if not (0 <= col < raster.RasterXSize and 0 <= row < raster.RasterYSize):
        return None
    value = float(band.ReadAsArray(col, row, 1, 1)[0, 0])
    return value if 2 <= value <= 60 else None


features = []
counts = Counter()
for feature in json.loads(source.read_text(encoding="utf-8"))["features"]:
    if not feature["properties"].get("building") or feature["geometry"]["type"] not in ("Polygon", "MultiPolygon"):
        continue
    measured = raster_height(feature["geometry"])
    tagged = tagged_height(feature["properties"].get("other_tags") or {})
    height, basis = (measured, "Athens GIS 2021") if measured else (tagged, "OSM tag") if tagged else (8, "Assumed")
    counts[basis] += 1
    features.append({"type": "Feature", "geometry": feature["geometry"],
                     "properties": {"height_m": round(min(height, 60), 1), "basis": basis}})

output = root / "public/data/kifisia-sun-buildings.geojson"
output.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(features)} sun footprints: {dict(counts)}")
