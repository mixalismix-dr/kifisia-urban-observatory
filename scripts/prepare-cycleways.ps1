param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$downloads = Join-Path $PSScriptRoot 'downloads'
$data = Join-Path $root 'public/data'
New-Item -ItemType Directory -Force $downloads | Out-Null

# The OSM API gives complete ways touching this Kifisia-centre box. Keep the
# coverage explicit; this is a local extract, not a municipal cycling inventory.
$osmFile = Join-Path $downloads 'osm-cycle-centre.xml'
Invoke-WebRequest 'https://api.openstreetmap.org/api/0.6/map?bbox=23.80,38.07,23.82,38.08' -UserAgent 'KifisiaUrbanObservatory/0.1 (https://github.com/mixalismix-dr/kifisia-urban-observatory)' -OutFile $osmFile
[xml]$osm = [IO.File]::ReadAllText($osmFile, [Text.Encoding]::UTF8)
$culture = [Globalization.CultureInfo]::InvariantCulture
$nodes = @{}
foreach ($node in $osm.osm.node) {
  $nodes[[string]$node.id] = @([double]::Parse($node.lon, $culture), [double]::Parse($node.lat, $culture))
}

$features = @()
$ways = $osm.SelectNodes('//way[tag[@k="highway" and @v="cycleway"] or tag[starts-with(@k,"cycleway") and (@v="lane" or @v="track" or @v="opposite_lane" or @v="opposite_track")]]')
foreach ($way in $ways) {
  $tags = @{}
  foreach ($tag in $way.tag) { $tags[[string]$tag.k] = [string]$tag.v }
  $cycleTags = @($tags.Keys | Where-Object { $_ -like 'cycleway*' } | ForEach-Object { $tags[$_] })
  $facility = if ($tags.highway -eq 'cycleway') { 'Dedicated cycleway' }
    elseif ($cycleTags -match 'track') { 'Separated track' }
    else { 'Painted lane' }
  $coordinates = @($way.nd | ForEach-Object { ,$nodes[[string]$_.ref] })
  if ($coordinates.Count -lt 2) { continue }
  $features += @{
    type = 'Feature'
    geometry = @{ type = 'LineString'; coordinates = $coordinates }
    properties = @{ name = $tags.name; facility = $facility; osm_way = [string]$way.id }
  }
}

$raw = Join-Path $downloads 'cycleways-centre.geojson'
[IO.File]::WriteAllText($raw, (@{ type = 'FeatureCollection'; features = $features } | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
$output = Join-Path $data 'kifisia-cycleways-centre.geojson'
if (Test-Path $output) { Remove-Item -LiteralPath $output }
& (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $output $raw -clipsrc (Join-Path $data 'kifisia-boundary.geojson') -lco RFC7946=YES
if ($LASTEXITCODE -ne 0) { throw 'ogr2ogr failed' }
Write-Output "Prepared $($features.Count) mapped bike segments from the Kifisia-centre extract."
