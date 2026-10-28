param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:GDAL_DATA = 'C:\Program Files\QGIS 3.40.9\apps\gdal\share\gdal'
$osm = 'scripts/downloads/greece-latest.osm.pbf'
if (-not (Test-Path $osm)) { throw 'Run scripts/prepare-search.ps1 first to download the Greece OSM extract.' }
$raw = 'scripts/downloads/kifisia-traffic-roads-raw.geojson'
$output = 'public/data/kifisia-traffic-roads.geojson'
foreach ($file in @($raw, $output)) { if (Test-Path $file) { Remove-Item -LiteralPath $file } }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $raw $osm lines -spat 23.765 38.055 23.89 38.13 -where "highway IN ('motorway','trunk','primary','secondary','tertiary','residential','unclassified','living_street')" -select highway,name -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'OSM road extraction failed' }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $output $raw -clipsrc 'public/data/kifisia-boundary.geojson' -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'Kifisia road clip failed' }
node -e "const fs=require('fs');const p='$output';const d=JSON.parse(fs.readFileSync(p));d.features=d.features.filter(f=>f.geometry?.type==='LineString'&&f.geometry.coordinates.length>1).map(f=>({type:'Feature',geometry:f.geometry,properties:{highway:f.properties.highway,name:f.properties.name||null}}));fs.writeFileSync(p,JSON.stringify(d));console.log(d.features.length+' mapped road segments');"
if ($LASTEXITCODE -ne 0) { throw 'Road compaction failed' }
