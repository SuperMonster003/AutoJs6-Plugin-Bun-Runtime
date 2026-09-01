[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$toolDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $toolDirectory '..\..')).Path
$lock = Get-Content -Raw -LiteralPath (Join-Path $toolDirectory 'runtime.lock.json') | ConvertFrom-Json
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("autojs6-bun-runtime-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
    foreach ($artifact in $lock.artifacts) {
        $archive = Join-Path $temporaryDirectory $artifact.asset
        Invoke-WebRequest -Uri $artifact.url -OutFile $archive
        $archiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
        if ($archiveHash -ne $artifact.archiveSha256) {
            throw "$($artifact.abi): archive SHA-256 mismatch: $archiveHash"
        }
        $expanded = Join-Path $temporaryDirectory $artifact.abi
        Expand-Archive -LiteralPath $archive -DestinationPath $expanded
        $binary = Get-ChildItem -LiteralPath $expanded -Recurse -File | Where-Object Name -eq 'bun' | Select-Object -First 1
        if ($null -eq $binary) { throw "$($artifact.abi): Bun executable is missing from the archive" }
        $destination = Join-Path $repositoryRoot ($artifact.binaryPath -replace '/', '\')
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $binary.FullName -Destination $destination -Force
    }
    & node (Join-Path $toolDirectory 'verify-runtime.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Runtime verification failed with exit code $LASTEXITCODE" }
} finally {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
