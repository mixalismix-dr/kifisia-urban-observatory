param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:GDAL_DATA = 'C:\Program Files\QGIS 3.40.9\apps\gdal\share\gdal'
$download = 'scripts/downloads/greece-latest.osm.pbf'
New-Item -ItemType Directory -Force 'scripts/downloads' | Out-Null
if (-not (Test-Path $download)) {
  Invoke-WebRequest 'https://download.geofabrik.de/europe/greece-latest.osm.pbf' -OutFile $download
}
$raw = 'scripts/downloads/kifisia-tagged-raw.geojson'
$clipped = 'scripts/downloads/kifisia-tagged-clipped.geojson'
foreach ($file in @($raw, $clipped)) {
  if (Test-Path $file) { Remove-Item -LiteralPath $file }
}
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $raw $download multipolygons -oo TAGS_FORMAT=JSON -spat 23.765 38.055 23.89 38.13 -where "building IS NOT NULL OR leisure IN ('pitch','stadium','sports_centre','sports_hall','track','swimming_pool','fitness_centre')" -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'OSM polygon extraction failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $clipped $raw -clipsrc 'public/data/kifisia-boundary.geojson' -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Municipal clip failed' }
node scripts/make-map-extract.mjs
if ($LASTEXITCODE -ne 0) { throw 'Map data conversion failed' }
$heights = 'scripts/downloads/Building_height_2021.tif'
if (-not (Test-Path $heights)) {
  Invoke-WebRequest 'https://data.athensgis.gr/data/UrbanPlanning/Building_height.tif' -OutFile $heights
}
& (Join-Path $GdalBin 'python-qgis-ltr.bat') scripts/build-sun-buildings.py
if ($LASTEXITCODE -ne 0) { throw 'Sun footprint preparation failed' }
