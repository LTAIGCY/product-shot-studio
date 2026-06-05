$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$packageDir = Join-Path $root "outputs\package\win-unpacked"
$zipPath = Join-Path $root "outputs\Product Shot Studio-0.1.0-win-x64.zip"
$staleNsis = Join-Path $root "outputs\package\product-shot-studio-0.1.0-x64.nsis.7z"

if (-not (Test-Path -LiteralPath $packageDir)) {
  throw "Missing packaged app directory: $packageDir"
}

Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $staleNsis -Force -ErrorAction SilentlyContinue

Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath -Force
Write-Host "Created $zipPath"
