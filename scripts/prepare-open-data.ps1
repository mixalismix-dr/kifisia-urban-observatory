param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$downloads = Join-Path $PSScriptRoot 'downloads'
$data = Join-Path $root 'public/data'
New-Item -ItemType Directory -Force $downloads | Out-Null

$tree = Join-Path $downloads 'tree_density.tif'
$stops = Join-Path $downloads 'AthensBusStops.geojson'
Invoke-WebRequest 'https://data.athensgis.gr/data/UrbanPlanning/tree_density.tif' -OutFile $tree
Invoke-WebRequest 'https://data.athensgis.gr/data/Transportation/AthensBusStops.geojson' -OutFile $stops

$boundary = Join-Path $data 'kifisia-boundary.geojson'
$clipped = Join-Path $downloads 'tree_kifisia.tif'
$colors = Join-Path $downloads 'tree-colors.txt'
@('0 0 0 0 0', '1 232 239 192 140', '25 162 205 126 170', '50 80 155 95 195', '75 31 109 75 210', '100 12 76 60 220', '255 0 0 0 0', 'nv 0 0 0 0') | Set-Content -Encoding ascii $colors

& (Join-Path $GdalBin 'gdalwarp.exe') -overwrite -of GTiff -cutline $boundary -crop_to_cutline -t_srs EPSG:4326 -tr 0.000114 0.00009 -r near -dstnodata 255 $tree $clipped
if ($LASTEXITCODE -ne 0) { throw 'gdalwarp failed' }
& (Join-Path $GdalBin 'gdaldem.exe') color-relief $clipped $colors (Join-Path $data 'kifisia-tree-cover.png') -alpha -of PNG
if ($LASTEXITCODE -ne 0) { throw 'gdaldem failed' }
$stopOutput = Join-Path $data 'kifisia-bus-stops.geojson'
if (Test-Path $stopOutput) { Remove-Item -LiteralPath $stopOutput }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $stopOutput $stops -clipsrc $boundary -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'ogr2ogr failed' }
