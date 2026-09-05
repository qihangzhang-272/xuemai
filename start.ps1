$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw '请先安装 Node.js 24 LTS' }
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
if (-not (Test-Path -LiteralPath 'node_modules/next/package.json')) { npm ci; if ($LASTEXITCODE -ne 0) { throw '依赖安装失败' } }
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) { npm run build; if ($LASTEXITCODE -ne 0) { throw '构建失败' } }
npm start
