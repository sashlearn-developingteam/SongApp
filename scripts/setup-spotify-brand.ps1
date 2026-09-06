$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "..\public\spotify"
$green = Join-Path $dir "Spotify_Full_Logo_RGB_Green.png"
$white = Join-Path $dir "Spotify_Full_Logo_RGB_White.png"
if ((Test-Path $green) -and (Test-Path $white)) {
  Write-Host "Spotify brand assets are present. Keep them unmodified."
  exit 0
}
Write-Host "Spotify assets are not bundled for licensing/brand-integrity reasons."
Write-Host "Download the official Full Logo assets from Spotify Developer Design Guidelines."
Write-Host "Copy the unmodified files to: $dir"
Write-Host "Required names:"
Write-Host "  Spotify_Full_Logo_RGB_Green.png"
Write-Host "  Spotify_Full_Logo_RGB_White.png"
exit 1
