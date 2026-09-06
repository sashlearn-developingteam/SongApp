$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  Write-Host $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

Write-Host "Song App Windows verification" -ForegroundColor Cyan
Invoke-Step "1/7 Electron runtime bootstrap" { npm run setup:electron }
Invoke-Step "2/7 TypeScript typecheck" { npm run typecheck }
Invoke-Step "3/7 Vitest suite" { npm test }
Invoke-Step "4/7 Electron integration regression checks" { npm run test:integration }
Invoke-Step "5/7 Feature wiring matrix" { npm run check:features }
Invoke-Step "6/7 Production build" { npm run build }
Invoke-Step "7/7 Internal craft/security audit" { node scripts/audit.mjs }

Write-Host "All automated Windows verification gates passed." -ForegroundColor Green
Write-Host "Now run 'npm run dev' and exercise the manual desktop QA checklist in README.md."
