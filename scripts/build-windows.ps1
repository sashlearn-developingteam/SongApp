$ErrorActionPreference = "Stop"
Write-Host "Checking release prerequisites..."
npm run check:release
Write-Host "Running tests and typecheck..."
npm run test
npm run typecheck
Write-Host "Running 20-point craft audit..."
npm run audit
Write-Host "Building Windows installer and portable executable..."
npm run package:win
Write-Host "Done. See .\release\"
