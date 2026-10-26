param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$downloads = 'scripts/downloads'
$boundary = 'public/data/kifisia-boundary.geojson'
New-Item -ItemType Directory -Force $downloads | Out-Null

foreach ($item in @(
  @('Transportation/TrLights.geojson', 'TrLights.geojson', 'public/data/kifisia-traffic-lights.geojson'),
  @('UrbanPlanning/Gardens.geojson', 'Gardens.geojson', 'scripts/downloads/kifisia-gardens.geojson')
)) {
  $source = Join-Path $downloads $item[1]
  if (-not (Test-Path $source)) { Invoke-WebRequest "https://data.athensgis.gr/data/$($item[0])" -OutFile $source }
  if (Test-Path $item[2]) { Remove-Item -LiteralPath $item[2] }
  & (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $item[2] $source -clipsrc $boundary -lco RFC7946=YES
  if ($LASTEXITCODE -ne 0) { throw "Clipping failed: $($item[1])" }
}
node scripts/build-public-spaces.mjs
if ($LASTEXITCODE -ne 0) { throw 'Public-space preparation failed' }

$parcelZip = Join-Path $downloads 'periferia_attikis_2026-10-22.zip'
if (-not (Test-Path $parcelZip)) {
  Invoke-WebRequest 'https://data.gov.gr/dataset/17226281-9e0f-431f-b1a3-c9e807cdd3cd/resource/5c42296d-0413-4c6b-9f6a-0924837f35e9/download/periferia_attikis.zip' -OutFile $parcelZip
}
$sourceZip = '/vsizip/' + ((Resolve-Path $parcelZip).Path -replace '\\', '/')
$parcels = 'public/data/kifisia-parcels.geojson'
if (Test-Path $parcels) { Remove-Item -LiteralPath $parcels }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $parcels $sourceZip -clipsrc $boundary -t_srs EPSG:4326 -lco RFC7946=YES -select KAEK,bLfSpnVr
if ($LASTEXITCODE -ne 0) { throw 'KAEK parcel preparation failed' }

& (Join-Path $GdalBin 'python-qgis-ltr.bat') scripts/prepare-ndvi.py
if ($LASTEXITCODE -ne 0) { throw 'NDVI preparation failed' }
