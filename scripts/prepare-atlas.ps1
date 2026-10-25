param([string]$GdalBin = 'C:\Program Files\QGIS 3.40.9\bin')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$downloads = 'scripts/downloads'
$data = 'public/data'
$boundary = "$data/kifisia-boundary.geojson"
New-Item -ItemType Directory -Force $downloads | Out-Null

$layers = @(
  @('Environment/Rivers.geojson', 'rivers'),
  @('UrbanPlanning/Arch_sites.geojson', 'arch-sites'),
  @('UrbanPlanning/Parks.geojson', 'parks'),
  @('UrbanPlanning/Playgrounds.geojson', 'playgrounds'),
  @('UrbanPlanning/Land_Cover_2021.json', 'land-cover-2021'),
  @('Amenities/Schools.geojson', 'schools'),
  @('Amenities/Hospitals.geojson', 'hospitals'),
  @('Amenities/Police.geojson', 'police'),
  @('Amenities/Cinemas.json', 'cinemas'),
  @('Amenities/Theater.json', 'theater')
)
foreach ($layer in $layers) {
  $file = Split-Path $layer[0] -Leaf
  $source = Join-Path $downloads $file
  $clip = Join-Path $downloads "kifisia-$($layer[1]).geojson"
  Invoke-WebRequest "https://data.athensgis.gr/data/$($layer[0])" -OutFile $source
  if (Test-Path $clip) { Remove-Item -LiteralPath $clip }
  & (Join-Path $GdalBin 'ogr2ogr.exe') -f GeoJSON $clip $source -clipsrc $boundary -lco RFC7946=YES -simplify 0.00002
  if ($LASTEXITCODE -ne 0) { throw "Clipping failed: $file" }
  if ($layer[1] -in @('rivers', 'arch-sites', 'parks', 'playgrounds', 'land-cover-2021')) {
    Copy-Item $clip (Join-Path $data "kifisia-$($layer[1]).geojson")
  }
}
node scripts/build-atlas-pois.mjs
if ($LASTEXITCODE -ne 0) { throw 'POI preparation failed' }

$dem = Join-Path $downloads 'copernicus_dem_n38_e023.tif'
$tile = 'Copernicus_DSM_COG_10_N38_00_E023_00_DEM'
Invoke-WebRequest "https://copernicus-dem-30m.s3.amazonaws.com/$tile/$tile.tif" -OutFile $dem
& (Join-Path $GdalBin 'gdalwarp.exe') -overwrite -of GTiff -cutline $boundary -crop_to_cutline -t_srs EPSG:4326 -tr 0.000277777777778 0.000277777777778 -r bilinear -dstnodata -9999 $dem (Join-Path $downloads 'kifisia-dsm.tif')
if ($LASTEXITCODE -ne 0) { throw 'DSM clipping failed' }
@('0 244 239 219 220', '200 218 224 186 230', '400 171 193 145 230', '600 120 156 126 230', '800 81 125 116 230', '1000 56 91 99 230', '1200 44 72 91 230', 'nv 0 0 0 0') | Set-Content -Encoding ascii (Join-Path $downloads 'dsm-colors.txt')
& (Join-Path $GdalBin 'gdaldem.exe') color-relief (Join-Path $downloads 'kifisia-dsm.tif') (Join-Path $downloads 'dsm-colors.txt') (Join-Path $data 'kifisia-dsm.png') -alpha -of PNG
if ($LASTEXITCODE -ne 0) { throw 'DSM colour relief failed' }
if (Test-Path (Join-Path $data 'kifisia-contours.geojson')) { Remove-Item -LiteralPath (Join-Path $data 'kifisia-contours.geojson') }
& (Join-Path $GdalBin 'gdal_contour.exe') -i 20 -a elevation_m -f GeoJSON -lco RFC7946=YES (Join-Path $downloads 'kifisia-dsm.tif') (Join-Path $data 'kifisia-contours.geojson')
if ($LASTEXITCODE -ne 0) { throw 'Contour generation failed' }
