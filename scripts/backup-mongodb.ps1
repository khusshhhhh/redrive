param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required." }
if (-not (Get-Command mongodump -ErrorAction SilentlyContinue)) { throw "mongodump is not installed or not on PATH." }

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = Join-Path $resolvedOutput "redrive-$stamp.archive.gz"

& mongodump --uri=$env:DATABASE_URL --archive=$archive --gzip
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archive)) { throw "MongoDB backup failed." }

$hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
Set-Content -LiteralPath "$archive.sha256" -Value "$($hash.Hash)  $([System.IO.Path]::GetFileName($archive))"
Write-Output "Backup created: $archive"

