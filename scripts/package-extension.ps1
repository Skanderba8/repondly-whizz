$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectDirectory
try {
    & npm run build:extension
    if ($LASTEXITCODE -ne 0) { throw 'Extension build failed. No release ZIP was created.' }

    $packageDirectory = Join-Path $projectDirectory 'dist\extension'
    $archivePath = Join-Path $projectDirectory 'dist\whizz-repondly-chrome.zip'
    # Derive the store-sized icon from the owner's existing authorized asset.
    Add-Type -AssemblyName System.Drawing
    $source = [System.Drawing.Image]::FromFile((Join-Path $projectDirectory 'public\android-chrome-192x192.png'))
    $icon = [System.Drawing.Bitmap]::new(128, 128)
    $drawing = [System.Drawing.Graphics]::FromImage($icon)
    try {
        $drawing.Clear([System.Drawing.Color]::Transparent)
        $drawing.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $drawing.DrawImage($source, 16, 16, 96, 96)
        $icon.Save((Join-Path $packageDirectory 'icon-128.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $drawing.Dispose(); $icon.Dispose(); $source.Dispose() }

    $manifestPath = Join-Path $packageDirectory 'manifest.json'
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $manifest.icons | Add-Member -MemberType NoteProperty -Name '128' -Value 'icon-128.png' -Force
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10), $utf8)
    Compress-Archive -Path (Join-Path $packageDirectory '*') -DestinationPath $archivePath -Force
    Write-Output "Upload this package to the Chrome Web Store: $archivePath"
} finally { Pop-Location }
