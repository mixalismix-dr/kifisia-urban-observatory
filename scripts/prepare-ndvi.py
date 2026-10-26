"""Make a Kifisia NDVI image from one cloud-screened Sentinel-2 L2A scene."""

import json
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from osgeo import gdal


gdal.UseExceptions()
root = Path(__file__).resolve().parents[1]
item_id = "S2B_34SGH_20260911_0_L2A"
with urlopen(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{item_id}") as response:
    item = json.load(response)

boundary = str(root / "public/data/kifisia-boundary.geojson")
bounds = [23.7677541, 38.0604421, 23.8844901, 38.1225421]


def band(name):
    asset = item["assets"][name]
    image = gdal.Warp("", "/vsicurl/" + asset["href"], format="MEM", dstSRS="EPSG:4326",
                      outputBounds=bounds, width=1024, height=690, cutlineDSName=boundary,
                      dstNodata=0, resampleAlg="near")
    values = image.ReadAsArray()
    metadata = asset.get("raster:bands", [{}])[0]
    return values, metadata


red_raw, red_meta = band("red")
nir_raw, nir_meta = band("nir")
scl, _ = band("scl")
red = red_raw * red_meta.get("scale", 1) + red_meta.get("offset", 0)
nir = nir_raw * nir_meta.get("scale", 1) + nir_meta.get("offset", 0)
valid = np.isin(scl, [4, 5, 6]) & (red_raw > 0) & (nir_raw > 0) & (red + nir > 0.02)
ndvi = np.zeros(red.shape, dtype=np.float32)
np.divide(nir - red, nir + red, out=ndvi, where=valid)
valid &= (ndvi >= -1) & (ndvi <= 1)

# A compact, muted ramp keeps streets and 3D buildings readable above the raster.
stops = np.array([-0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
colors = np.array([[137, 129, 116], [204, 184, 142], [227, 209, 145],
                   [177, 199, 119], [105, 158, 93], [51, 113, 70], [22, 78, 55]])
rgba = np.zeros((4, *ndvi.shape), dtype=np.uint8)
for channel in range(3):
    rgba[channel] = np.interp(ndvi, stops, colors[:, channel]).astype(np.uint8)
rgba[3] = np.where(valid, 205, 0).astype(np.uint8)
image = gdal.GetDriverByName("MEM").Create("", ndvi.shape[1], ndvi.shape[0], 4, gdal.GDT_Byte)
for channel in range(4):
    image.GetRasterBand(channel + 1).WriteArray(rgba[channel])
output = root / "public/data/kifisia-ndvi.png"
gdal.GetDriverByName("PNG").CreateCopy(str(output), image)
print(f"{item_id}: {valid.sum()} valid 10 m pixels, median NDVI {np.median(ndvi[valid]):.2f}")
