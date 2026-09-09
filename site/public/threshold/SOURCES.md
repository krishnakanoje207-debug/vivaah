# Threshold film sources

The home page's threshold (DESIGN_SPEC_V3 §2.2). The film is never played: a rAF
loop sets `currentTime` from scroll position, lerped at 0.12 (§3.1).

| file | res | duration | keyframes | size | serves |
|---|---|---|---|---|---|
| threshold.mp4 | 1920x1080 | 10.000s | 60 (GOP 4) | 7.55 MB | >= 860px |
| threshold-m.mp4 | 1280x720 | 10.000s | 60 (GOP 4) | 3.92 MB | < 860px |
| threshold-poster.jpg | 1920x1080 | - | - | 69 KB | first paint, and the whole surface under reduced motion |

Cut from the KlingAI hero frames (`videos/heroSection/`), watermark cropped.

**Keyframe density is load-bearing, not an encoder default.** An accurate seek
decodes forward from the preceding keyframe, so a sparse GOP shows as stutter
while scrubbing. The desktop file shipped at GOP 8 (30 keyframes) until 9 Sep
2026 and was re-encoded to GOP 4; all-intra was measured at 11.0-14.5 MB and
rejected on payload grounds. Re-encode with:

    ffmpeg -i in.mp4 -g 4 -keyint_min 4 -crf 23 -preset medium \
           -pix_fmt yuv420p -an -movflags +faststart out.mp4

Any replacement film must keep GOP <= 4 and stay under ~8 MB desktop /
~4.5 MB mobile.
