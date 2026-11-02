# Use the project's collector environment instead of whichever Python is on PATH.
$collectorPython = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $collectorPython)) {
    Write-Error 'Project Python environment is missing. See collector/README.md for setup.'
    exit 1
}
& $collectorPython (Join-Path $PSScriptRoot 'collect.py') @args
exit $LASTEXITCODE
