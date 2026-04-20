Set-Location "d:\GEN AI-2026\Phase-2-Week-10\Deliverables"

Write-Host "Initializing git repository..." -ForegroundColor Cyan
git init

Write-Host "Creating branch 'Phase-2-week-10-Home-Assignment'..." -ForegroundColor Cyan
git checkout -b "Phase-2-week-10-Home-Assignment" 2>$null
if ($LASTEXITCODE -ne 0) {
    git checkout "Phase-2-week-10-Home-Assignment"
}

Write-Host "Staging all files..." -ForegroundColor Cyan
git add .

Write-Host "Committing files..." -ForegroundColor Cyan
git commit -m "Phase-2-week-10-Home Assignment"

Write-Host "Setting remote origin..." -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin https://github.com/acsanjeevi/GEN-AI-2026-Phase-2.git

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin "Phase-2-week-10-Home-Assignment"

Write-Host "Done!" -ForegroundColor Green
