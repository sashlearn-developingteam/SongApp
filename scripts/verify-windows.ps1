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
Invoke-Step "1/6 TypeScript typecheck" { npm run typecheck }
Invoke-Step "2/6 Vitest suite" { npm test }
Invoke-Step "3/6 Electron integration regression checks" { npm run test:integration }
Invoke-Step "4/6 Feature wiring matrix" { npm run check:features }
Invoke-Step "5/6 Production build" { npm run build }
Invoke-Step "6/6 Internal craft/security audit" { node scripts/audit.mjs }

Write-Host "All automated Windows verification gates passed." -ForegroundColor Green
Write-Host "Now run 'npm run dev' and exercise the manual desktop QA checklist in README.md."
