param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$downloads = 'scripts/downloads'
New-Item -ItemType Directory -Force $downloads | Out-Null

# Public web map published by the Attica Water Directorate.
$webMap = Invoke-RestMethod 'https://www.arcgis.com/sharing/rest/content/items/6b1278687eb146978fee502d2b29cbe4/data?f=json'
$layer = $webMap.operationalLayers | Where-Object { $_.title -match '100' -and $_.title -notmatch '1000' } | Select-Object -First 1
if (-not $layer -or -not $layer.url.StartsWith('https://services8.arcgis.com/0htqYUUCxW0QHBO9/arcgis/rest/services/')) {
  throw 'Official 100-year flood layer was not found at the expected host'
}
$query = $layer.url + '/query?geometry=23.767,38.060,23.885,38.123&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
$raw = Join-Path $downloads 'official-flood-100.geojson'
$valid = Join-Path $downloads 'official-flood-100-valid.geojson'
$output = 'public/data/kifisia-flood-100.geojson'
Invoke-WebRequest $query -OutFile $raw
foreach ($file in @($valid, $output)) { if (Test-Path $file) { Remove-Item -LiteralPath $file } }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $valid $raw -makevalid -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Flood geometry repair failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $output $valid -clipsrc 'public/data/kifisia-boundary.geojson' -simplify 0.000015 -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Flood clipping failed' }
$result = Get-Content $output -Raw -Encoding UTF8 | ConvertFrom-Json
if ($result.features.Count -lt 1) { throw 'Official flood zone has no Kifisia coverage' }
