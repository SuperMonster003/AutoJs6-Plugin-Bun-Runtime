[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$manifestPath = Join-Path $PSScriptRoot "patches\series.lock.json"
$patchRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "patches"))
$referenceRoot = [System.IO.Path]::GetFullPath((Join-Path $patchRoot "upstream-reference"))
$referencePrefix = $referenceRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.schemaVersion -ne 1) {
    throw "Unsupported patch-series schema: $($manifest.schemaVersion)"
}

[System.IO.Directory]::CreateDirectory($referenceRoot) | Out-Null
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.UserAgent.ParseAdd("AutoJs6-Bun-Runtime-api28-patch-materializer")

function Get-Sha256Hex {
    param([Parameter(Mandatory = $true)][byte[]]$Bytes)

    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        return -join ($algorithm.ComputeHash($Bytes) | ForEach-Object { $_.ToString("x2") })
    }
    finally {
        $algorithm.Dispose()
    }
}

function Assert-PatchBytes {
    param(
        [Parameter(Mandatory = $true)]$Patch,
        [Parameter(Mandatory = $true)][byte[]]$Bytes
    )

    if ($Bytes.Length -ne [long]$Patch.bytes) {
        throw "$($Patch.commit): expected $($Patch.bytes) bytes, found $($Bytes.Length)"
    }

    $digest = Get-Sha256Hex -Bytes $Bytes
    if ($digest -cne [string]$Patch.sha256) {
        throw "$($Patch.commit): expected SHA-256 $($Patch.sha256), found $digest"
    }

    $prefix = [System.Text.Encoding]::ASCII.GetBytes("From $($Patch.commit) ")
    if ($Bytes.Length -lt $prefix.Length) {
        throw "$($Patch.commit): patch is shorter than its required From header"
    }
    for ($index = 0; $index -lt $prefix.Length; $index += 1) {
        if ($Bytes[$index] -ne $prefix[$index]) {
            throw "$($Patch.commit): patch does not start with its immutable From header"
        }
    }
}

try {
    foreach ($patch in $manifest.upstreamReferencePatches) {
        $commit = [string]$patch.commit
        if ($commit -notmatch "^[0-9a-f]{40}$") {
            throw "Invalid upstream commit: $commit"
        }

        $expectedUrl = "https://github.com/oven-sh/bun/commit/$commit.patch"
        if ([string]$patch.url -cne $expectedUrl) {
            throw "$commit`: patch URL is not the expected immutable oven-sh/bun commit URL"
        }

        $expectedRelativePath = "upstream-reference/{0:D4}-{1}.patch" -f [int]$patch.order, $commit.Substring(0, 8)
        if ([string]$patch.materializedPath -cne $expectedRelativePath) {
            throw "$commit`: expected materialized path $expectedRelativePath"
        }

        $relativePath = ([string]$patch.materializedPath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $targetPath = [System.IO.Path]::GetFullPath((Join-Path $patchRoot $relativePath))
        if (-not $targetPath.StartsWith($referencePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "$commit`: materialized path escapes patches/upstream-reference"
        }

        if (Test-Path -LiteralPath $targetPath) {
            $existing = [System.IO.File]::ReadAllBytes($targetPath)
            Assert-PatchBytes -Patch $patch -Bytes $existing
            Write-Host "Verified existing $([System.IO.Path]::GetFileName($targetPath))"
            continue
        }

        Write-Host "Downloading $commit from $expectedUrl"
        $bytes = $client.GetByteArrayAsync($expectedUrl).GetAwaiter().GetResult()
        Assert-PatchBytes -Patch $patch -Bytes $bytes

        $temporaryPath = Join-Path $referenceRoot (".partial-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N"))
        try {
            [System.IO.File]::WriteAllBytes($temporaryPath, $bytes)
            Move-Item -LiteralPath $temporaryPath -Destination $targetPath
        }
        finally {
            if (Test-Path -LiteralPath $temporaryPath) {
                Remove-Item -LiteralPath $temporaryPath -Force
            }
        }

        Write-Host "Materialized $([System.IO.Path]::GetFileName($targetPath))"
    }
}
finally {
    $client.Dispose()
}

Write-Host "Upstream reference patches are materialized and hash-verified."
