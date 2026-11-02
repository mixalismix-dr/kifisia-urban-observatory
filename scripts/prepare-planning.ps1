param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$downloads = 'scripts/downloads'
$boundary = 'public/data/kifisia-boundary.geojson'
New-Item -ItemType Directory -Force $downloads | Out-Null

$base = 'https://sdigmap.tee.gov.gr/mapping/rest/services/UDM'
$query = '?where=1%3D1&geometry=23.767%2C38.06%2C23.885%2C38.123&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=geojson'
foreach ($id in 21, 22, 26) {
  $source = "$downloads/planning-$id.geojson"
  $clip = "$downloads/planning-$id-clipped.geojson"
  Invoke-WebRequest "$base/UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/$id/query$query" -OutFile $source
  if (Test-Path $clip) { Remove-Item -LiteralPath $clip }
  & (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $clip $source -clipsrc $boundary -lco RFC7946=YES -simplify 0.00001
  if ($LASTEXITCODE -ne 0) { throw "Planning clip failed: $id" }
}
$source = "$downloads/forest-attica-query.geojson"
$clip = "$downloads/forest-kifisia-clipped.geojson"
Invoke-WebRequest "$base/UDM_SERVICE_NATURA_DASIKA/MapServer/3/query$query" -OutFile $source
if (Test-Path $clip) { Remove-Item -LiteralPath $clip }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $clip $source -clipsrc $boundary -lco RFC7946=YES -simplify 0.00001
if ($LASTEXITCODE -ne 0) { throw 'Forest clip failed' }

Invoke-WebRequest 'https://polsxedia.ypen.gov.gr/tps_details/%CE%925_129' -OutFile "$downloads/tps-page.html"
node scripts/build-planning.mjs
if ($LASTEXITCODE -ne 0) { throw 'Planning preparation failed' }

Invoke-WebRequest 'https://data.athensgis.gr/data/UrbanPlanning/AthensCorine2018.json' -OutFile "$downloads/AthensCorine2018.json"
$output = 'public/data/kifisia-land-cover-2018.geojson'
if (Test-Path $output) { Remove-Item -LiteralPath $output }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $output "$downloads/AthensCorine2018.json" -clipsrc $boundary -lco RFC7946=YES -simplify 0.00002
if ($LASTEXITCODE -ne 0) { throw '2018 land-cover clip failed' }

$images = @(
  '%CE%A3%CE%95%CE%9D%CE%91%CE%A1%CE%99%CE%9F_1_1_f21roTn.jpg',
  '%CE%A3%CE%95%CE%9D%CE%91%CE%A1%CE%99%CE%9F_2_1_ICWlTon.jpg',
  '%CE%A3%CE%95%CE%9D%CE%91%CE%A1%CE%99%CE%9F_3_1_v8g6YwA.jpg'
)
for ($i = 0; $i -lt $images.Count; $i++) {
  Invoke-WebRequest "https://polsxedia.ypen.gov.gr/media/media/$($images[$i])" -OutFile "public/data/kifisia-tps-scenario-$($i + 1).jpg"
}
