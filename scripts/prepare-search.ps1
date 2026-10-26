param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:GDAL_DATA = 'C:\Program Files\QGIS 3.40.9\apps\gdal\share\gdal'
New-Item -ItemType Directory -Force 'scripts/downloads' | Out-Null
$osm = 'scripts/downloads/greece-latest.osm.pbf'
if (-not (Test-Path $osm)) {
  Invoke-WebRequest 'https://download.geofabrik.de/europe/greece-latest.osm.pbf' -OutFile $osm
}
foreach ($file in @('kifisia-streets-raw.geojson', 'kifisia-streets.geojson', 'kifisia-osm-points.geojson', 'kifisia-osm-points-clipped.geojson')) {
  $path = Join-Path 'scripts/downloads' $file
  if (Test-Path $path) { Remove-Item -LiteralPath $path }
}
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON 'scripts/downloads/kifisia-streets-raw.geojson' $osm lines -spat 23.765 38.055 23.89 38.13 -where 'highway IS NOT NULL AND name IS NOT NULL' -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Street extraction failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON 'scripts/downloads/kifisia-streets.geojson' 'scripts/downloads/kifisia-streets-raw.geojson' -clipsrc 'public/data/kifisia-boundary.geojson' -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Street clip failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON 'scripts/downloads/kifisia-osm-points.geojson' $osm points -spat 23.765 38.055 23.89 38.13 -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Address extraction failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON 'scripts/downloads/kifisia-osm-points-clipped.geojson' 'scripts/downloads/kifisia-osm-points.geojson' -clipsrc 'public/data/kifisia-boundary.geojson' -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Address clip failed' }
node scripts/build-search-index.mjs
if ($LASTEXITCODE -ne 0) { throw 'Search index failed' }
