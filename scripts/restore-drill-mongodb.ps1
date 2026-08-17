param(
  [Parameter(Mandatory = $true)][string]$Archive
)

$ErrorActionPreference = "Stop"
$archivePath = [System.IO.Path]::GetFullPath($Archive)
if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { throw "Backup archive was not found." }
if (-not $env:RESTORE_TEST_DATABASE_URL) { throw "RESTORE_TEST_DATABASE_URL is required." }
if ($env:RESTORE_TEST_DATABASE_URL -notmatch '(?i)(restore|drill|staging|test)') { throw "Safety check failed: restore URL must clearly name a restore, drill, staging, or test database." }
if (-not (Get-Command mongorestore -ErrorAction SilentlyContinue)) { throw "mongorestore is not installed or not on PATH." }

& mongorestore --uri=$env:RESTORE_TEST_DATABASE_URL --archive=$archivePath --gzip --drop
if ($LASTEXITCODE -ne 0) { throw "Restore drill failed." }
Write-Output "Restore drill completed against the explicitly configured non-production database."

