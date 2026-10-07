$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    node scripts/build-standalone.js --crazygames
    if ($LASTEXITCODE -ne 0) { throw 'Game build failed' }
    New-Item -ItemType Directory -Force -Path 'crazygames/juego' | Out-Null
    Compress-Archive -LiteralPath 'crazygames/juego/index.html' -DestinationPath 'crazygames/circle-vs-geometry.zip' -Force
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot 'crazygames/circle-vs-geometry.zip'))
    try {
        if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'index.html') {
            throw 'Expected exactly one index.html at the ZIP root'
        }
        Write-Output "Verified ZIP: index.html ($($archive.Entries[0].Length) bytes uncompressed)"
    } finally { $archive.Dispose() }
} finally { Pop-Location }
