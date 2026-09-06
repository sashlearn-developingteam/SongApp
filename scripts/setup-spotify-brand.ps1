$ErrorActionPreference = "Stop"

Write-Host "Installing official Spotify attribution assets..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "fetch-spotify-brand.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "Spotify brand asset setup failed with exit code $LASTEXITCODE."
}
Write-Host "Spotify brand assets are ready and must remain unmodified." -ForegroundColor Green
