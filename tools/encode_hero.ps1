# Encodes the hero from videos/heroSection frames into site/public/hero/.
# Implements IMPLEMENTATION_PLAN.md section 5: play-once intro + ping-pong loop.
# Watermark: KlingAI 3.0 sits bottom-right; we crop the bottom 48px
# (1280x720 -> 1280x672, both even). Hero uses object-cover so the ratio is fine.
#
# Usage:  powershell -File tools/encode_hero.ps1
# Requires ffmpeg (winget: Gyan.FFmpeg).

$ErrorActionPreference = "Stop"

$ffmpeg = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) { $ffmpeg = "ffmpeg" }  # fall back to PATH

$root  = Split-Path $PSScriptRoot -Parent
$frames = Join-Path $root "videos\heroSection"
$pattern = Join-Path $frames "kling_20260603____Main_Promp_5399_0_%03d.jpg"
$out   = Join-Path $root "site\public\hero"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$crop = "crop=1280:672:0:0"

Write-Host "1/4  hero-intro.mp4 (frames 1-138, 24fps)..."
& $ffmpeg -y -loglevel error -framerate 24 -start_number 1 -i $pattern `
  -frames:v 138 -vf $crop `
  -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -movflags +faststart `
  (Join-Path $out "hero-intro.mp4")

Write-Host "2/4  hero-loop.mp4 (frames 138-151, ping-pong)..."
# Input naturally stops at frame 151 (no 152), giving 14 frames. Do NOT use
# -frames:v here: it caps OUTPUT frames and would truncate the 28-frame ping-pong.
& $ffmpeg -y -loglevel error -framerate 24 -start_number 138 -i $pattern `
  -vf "$crop,split[a][b];[b]reverse[r];[a][r]concat=n=2" `
  -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -movflags +faststart `
  (Join-Path $out "hero-loop.mp4")

Write-Host "3/4  hero-poster.webp (frame 1, matches intro start)..."
& $ffmpeg -y -loglevel error -i (Join-Path $frames "kling_20260603____Main_Promp_5399_0_001.jpg") `
  -vf $crop -frames:v 1 -quality 82 (Join-Path $out "hero-poster.webp")

Write-Host "4/4  hero-still.webp (frame 151, reduced-motion fallback)..."
& $ffmpeg -y -loglevel error -i (Join-Path $frames "kling_20260603____Main_Promp_5399_0_151.jpg") `
  -vf $crop -frames:v 1 -quality 82 (Join-Path $out "hero-still.webp")

Write-Host "Done. Outputs in $out"
Get-ChildItem $out | Select-Object Name, @{n="KB";e={[math]::Round($_.Length/1KB,1)}}
