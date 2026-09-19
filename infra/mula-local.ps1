$ErrorActionPreference = 'Stop'

# Docker Desktop tidak dapat membaca bind mount pada sesetengah pemacu
# boleh tanggal. Salin input runtime ke pemacu sistem; sumber kekal di repo.
$repo = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $env:LOCALAPPDATA 'eLawatan-local'
$dockerBin = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'
if (Test-Path $dockerBin) { $env:PATH = "$dockerBin;$env:PATH" }
New-Item -ItemType Directory -Force -Path "$stage\supabase" | Out-Null
foreach ($name in @('config.toml', 'seed.sql', 'migrations', 'functions', 'templates')) {
    Copy-Item -LiteralPath (Join-Path "$repo\supabase" $name) -Destination "$stage\supabase" -Recurse -Force
}
$localConfig = Get-Content -LiteralPath "$stage\supabase\config.toml" -Raw
$localConfig = $localConfig.Replace('enabled = false   # Dokumen disimpan dalam Cloudflare R2, bukan Supabase Storage.', 'enabled = true # Storan ujian local sahaja.')
Set-Content -LiteralPath "$stage\supabase\config.toml" -Value $localConfig -Encoding utf8
'STORAN_LOCAL_URL=http://127.0.0.1:55321' | Set-Content -LiteralPath "$stage\supabase\functions\.env" -Encoding ascii

& npx.cmd --yes supabase@2.117.0 --workdir $stage start | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Supabase local gagal dimulakan.' }
& npx.cmd --yes supabase@2.117.0 --workdir $stage migration up --local
if ($LASTEXITCODE -ne 0) { throw 'Migrasi local gagal; jangan teruskan ujian.' }

$status = & npx.cmd --yes supabase@2.117.0 --workdir $stage status -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or !$status.ANON_KEY -or $status.API_URL -ne 'http://127.0.0.1:55321') {
    throw 'Status Supabase local tidak sah; .env tidak diubah.'
}
$headers = @{ apikey = $status.SERVICE_ROLE_KEY; Authorization = "Bearer $($status.SERVICE_ROLE_KEY)" }
$buckets = Invoke-RestMethod "$($status.API_URL)/storage/v1/bucket" -Headers $headers
if (!($buckets | Where-Object { $_.id -eq 'elawatan-dokumen-local' })) {
    Invoke-RestMethod "$($status.API_URL)/storage/v1/bucket" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"id":"elawatan-dokumen-local","name":"elawatan-dokumen-local","public":false,"file_size_limit":10485760}' | Out-Null
}
@(
    "VITE_SUPABASE_URL=$($status.API_URL)"
    "VITE_SUPABASE_ANON_KEY=$($status.ANON_KEY)"
    'VITE_URL_SISTEM=http://127.0.0.1:5173'
    'VITE_DOMAIN_DIBENARKAN=moe-dl.edu.my,moe.gov.my'
) | Set-Content -LiteralPath "$repo\.env" -Encoding ascii
Write-Output 'Supabase local sedia. Jalankan npm.cmd run dev -- --host 127.0.0.1 dari repo.'
