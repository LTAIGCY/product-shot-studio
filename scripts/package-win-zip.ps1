$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$packageJson = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $packageJson.version
$packageDir = Join-Path $root "outputs\package\win-unpacked"
$zipPath = Join-Path $root "outputs\Product Shot Studio-$version-win-x64.zip"
$portableSource = Join-Path $root "outputs\package\Product Shot Studio-$version-portable-x64.exe"
$portableCopy = Join-Path $root "outputs\Product Shot Studio-$version-portable-x64.exe"
$installerSource = Join-Path $root "outputs\package\Product Shot Studio-Setup-$version-x64.exe"
$installerCopy = Join-Path $root "outputs\Product Shot Studio-Setup-$version-x64.exe"

if (-not (Test-Path -LiteralPath $packageDir)) {
  throw "Missing packaged app directory: $packageDir"
}

Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue

Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath -Force
if (Test-Path -LiteralPath $portableSource) {
  Copy-Item -LiteralPath $portableSource -Destination $portableCopy -Force
  Write-Host "Created $portableCopy"
}
if (Test-Path -LiteralPath $installerSource) {
  Copy-Item -LiteralPath $installerSource -Destination $installerCopy -Force
  Write-Host "Created $installerCopy"
}
Write-Host "Created $zipPath"
