param(
  [ValidateSet('backend', 'mobile', 'checks')]
  [string]$Target = 'checks',
  [ValidateSet('development', 'preview')]
  [string]$AppEnvironment = 'development',
  [string]$ApiOrigin = 'http://localhost:3000',
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $repositoryRoot

$nodeVersion = (& node -p "process.versions.node").Trim()
$nodeParts = $nodeVersion.Split('.')
if ([int]$nodeParts[0] -lt 22 -or ([int]$nodeParts[0] -eq 22 -and [int]$nodeParts[1] -lt 13)) {
  throw "Node 22.13.0 or newer is required. Found $nodeVersion."
}

try { $apiUri = [Uri]$ApiOrigin } catch { throw 'ApiOrigin must be an absolute URL.' }
$localHosts = @('localhost', '127.0.0.1', '10.0.2.2')
$privateLan = $apiUri.Host -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
if ($apiUri.Scheme -ne 'https' -and -not ($apiUri.Scheme -eq 'http' -and ($localHosts -contains $apiUri.Host -or $privateLan))) {
  throw 'ApiOrigin must use HTTPS unless it is localhost, the Android emulator host, or a private LAN address.'
}

if (-not $SkipInstall) {
  & npm install
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
}

if ($Target -eq 'backend') {
  & npx prisma generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed.' }
  & npm run dev
  exit $LASTEXITCODE
}

if ($Target -eq 'mobile') {
  $env:EXPO_PUBLIC_APP_ENV = $AppEnvironment
  $env:EXPO_PUBLIC_API_ORIGIN = $apiUri.AbsoluteUri.TrimEnd('/')
  & npm run start --workspace @redrive/mobile -- --dev-client
  exit $LASTEXITCODE
}

& npm run quality:mobile
exit $LASTEXITCODE
