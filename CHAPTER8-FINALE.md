# Chapter 8 - exact Chapter 7 narrator and corrected scare order

## Review status

Production baseline: f1794f5. Reviewed and approved for release from fix/chapter8-chapter7-narrator through the existing GitHub main / Vercel production workflow. Deployment readiness is verified separately. Supplied media, multiplayer, sessions, host authentication, Redis/environment configuration, camera pacing, sirens, native news completion and final narration remain intact. No Collector video or credits are added.

## Actual Chapter 7 renderer reused

The actual path is tv.html #chapter7TV -> #chapter7Investigation -> #ch7Scene, rendered by Chapter7Investigation.update in chapter7-story.js. The complete scene contains #ch7PodcastLogo (hidden for narrator), #ch7Eyebrow, #ch7Title, #ch7Subtitle, #ch7Waveform with its 35 original bars, #ch7Options and #ch7Progress. The working Chapter 7 narrator has no separate microphone SVG: its speaking visualization is that waveform. chapter7.css provides the parent black surface, typography, 50%/44% radial background, exact spacing, ch7-voice keyframes, per-bar delays and responsive rules. narratorFrame in chapter7-story-timing.js provides its initial black hold, smooth entry and final visual fade; no audio gain is changed.

The previous Chapter 8 screen incorrectly cloned #chapter5-radio, the vintage-microphone handoff from Chapter 5. Even complete reuse of that screen could not match Chapter 7. Comparing it against Chapter 5 was the wrong visual reference.

narrator-screen.js now binds Chapter 7's original nodes and performs the same presentation updates for Chapter 7. For Chapter 8 it instantiates the actual outer #chapter7TV container and the complete #chapter7Investigation hierarchy inside a shadow root. Original IDs, classes, ancestor selectors and the original /chapter7.css dependency are preserved unchanged. Shadow scope prevents duplicate document IDs and unrelated Chapter 8 styling from leaking in. Non-narrator source layers and host controls stay hidden; no Chapter 7 media playback or gameplay controller is duplicated.

The wife theme changes only colors: the background is taken from the actual #ch7Scene CSS rule and only its color stops are substituted, preserving gradient geometry. Text and waveform colors change to lavender/pink/blue, with the existing muted palette on later appearances. No alternative SVG, gradient geometry, waveform markup or animation clock is created. The same narratorFrame formula is sampled from persisted media clocks for visual entry/exit, including refresh. Chapter 7's stylesheet is byte-preserved and its default rendering/timing remain unchanged. The minimal Chapter 7 JS changes bind the shared renderer and expose an optional narration duration to the existing frame function.

Visual verification: scripts/verify-chapter8-narrator-browser.mjs instantiates the actual old Chapter 7 controller from f1794f5 and the current Chapter 7 controller, then the actual Chapter8Finale view. At both 1920x1080 and 1280x720, all measured scene/child structures, rectangles, typography, animation properties and gradient geometry match. The old/current Chapter 7 snapshots match. Animation sampling is frozen only in the verification harness to compare the same frame. Native source animation remains unchanged in the application.

Side-by-side screenshots (Chapter 7 left, wife right):

- logs/ch7-ch8-narrator-comparison-1920.png
- logs/ch7-ch8-narrator-comparison-1280.png
- logs/ch7-ch8-narrator-comparison.json contains comparison assertions.

## Warning recording inspected

The exact supplied file is assets/chapter8/audio/wife-12.mp3. Its existing source transcription is: "He's coming for you. You have to hide. Right now!" MPEG-frame metadata remeasurement confirms 4675.918367346939 ms. This is a complete standalone recording, with no unrelated introduction or trailing dialogue that requires editing. The full file plays at volume 1; no trimming, re-encoding, replacement or audio-editing dependency exists. All 16 narration files remain byte-for-byte unchanged and in numeric spoken order.

## Corrected scare sequence

The living-room recordings wife-10/wife-11 and continuous whistle remain unchanged. After the whistle stops:

1. Empty living room, exactly 5000 authoritative milliseconds of genuinely silent suspense. Music remains stopped, whistle is stopped, sirens have not begun, and no narration plays.
2. One masked image and the existing strong scream/sting start together. The image lasts exactly 2000 authoritative milliseconds; the sting remains at 80% with the existing safe finite excerpt and tail fade. The same audio element is silently decoded/seek-prepared during earlier scenes, and the existing suspense-ready acknowledgment waits for image and sting readiness before arming the five-second clock. This fixes a native MP3 seek stall that could otherwise consume the short scare window. It never primes with audible playback, adds no timer and changes no source bytes or other effect gain.
3. The next cue is the complete wife-12 recording with visual lost. The former separate 850-ms signal-break hold is removed. A native playing handler reveals SIGNAL LOST and heavy interference in the same event turn that the recording starts. Before playback is ready (including autoplay recovery), no premature SIGNAL LOST label or warning voice appears. SIGNAL LOST stays visible for the entire warning; only native completion and the measured duration gate can advance it.
4. Wife-13 and the existing siren/escape/news/ending sequence follow, with no narration overlaps.

Nominal finale-relative windows:

| Event | Start - end (seconds) |
| --- | --- |
| Approaching whistle | 205.774 - 217.174 |
| Silent empty room | 217.174 - 222.174 |
| Masked reveal + sting onset | 222.174 - 224.174 |
| SIGNAL LOST + full wife-12 | 224.174 - 228.850 |
| Wife-13 / approaching police | starts 228.850 |

These are canonical nominal offsets, not substitutes for native media completion. Loading/acknowledgment/poll latency can extend actual playback; the persisted silence/scare deadlines cannot be extended by refresh. SIGNAL LOST/voice use native playing synchronization, rather than two independent timers.

Stored unversioned/version-1/version-2/version-3 cuts retain their previous index mapping and clocks. Fresh authenticated finale checkpoints select polishVersion 4. No existing game is migrated or reset. The expired scare disappears without being replayed while delayed progression catches up. Refresh seeks active media and preserves the remaining window.

## Preserved camera and audio behavior

First actual asset: ch8_cam01_driveway.png; then side passage and backyard. Each normal alert, camera-specific complete narration, 2.500-second image hold, 1.400-second reverse zoom and 2.500-second grid pause is unchanged. Doorbells remain after backyard, with the close front-porch asset. The garage warning/alarm/announcement, interior door and approaching whistle are unchanged. The existing music fades out during takeover and never resumes underneath the wife, CCTV, silence or news. Sirens still crossfade continuously until the pre-news fade. The 62.480-second breaking-news video advances only on its native ended event, before the complete wife-16 and Happy Halloween ending.

## Audio inventory and source selection

All eight requested assets exist and decode in Chrome. WAVs are supported 16/24-bit PCM at 44.1 kHz; MP3 formats were validated from contiguous MPEG frames. Inspection used decoded waveforms/energy envelopes, local speech/non-speech transcription and metadata. The security voice says exactly: Warning. Security breach detected. Garage door open. Non-speech transcription labels are unreliable for effects and were not treated as dialogue. Whistle analysis identifies phrases around source 3-5.6, 7.4-10 and 11.4-15 seconds with real intervening pauses.

| Effect | Actual filename | Full duration (s) | Selected source window (s) |
| --- | --- | --- | --- |
| notification | security-notification.wav | 1.896 | 0.000 - 1.896 |
| alarm | garage-breach.wav | 4.910 | 0.000 - 4.910 |
| announcement | garage-security-voice.mp3 | 4.598 | 0.000 - 4.598 |
| door | interior-door-open.wav | 2.679 | 0.000 - 2.679 |
| whistle | intruder-whistling.wav | 15.943 | 2.800 - 14.200 |
| sirens | police-sirens.mp3 | 31.584 | 2.000 - 16.000, crossfaded repeats |
| running | running-footsteps.mp3 | 6.060 | 0.350 - 5.350 |
| slam | door-slam.mp3 | 2.520 | 1.150 - 2.520 |
| impact | ch6_sfx_scream.mp3 | 3.312 | 0.200 - 2.150 for version-3 and later runs |
| doorbell | assets/chapter4/audio/doorbell.mp3 | 3.024 | 0.000 - 3.024, twice |

No requested asset is missing or format-unusable. The reused Chapter 6 sound is a scream/sting: its 0.200-2.150-second excerpt plays at 80% for version-3 and later runs, fading over the last 100 ms. This increases only the sting from the former 24% (about +10.46 dB), never above unity; source bytes and other audio gains remain untouched. Pre-version-3 stored cuts retain the former excerpt and gain. Earlier chapters and that file are unchanged. Running/slam peaks approach full scale, so playback is attenuated rather than destructively normalized. A human rehearsal on the actual party speakers is recommended.




## Complete current timeline

62 cues; nominal runtime 381.738 seconds = 6 minutes 21.738 seconds. Previous cut: 382.588 seconds. Removing the separate signal-break shortens the nominal runtime by 0.850 seconds. No narration or camera hold is shortened.

| Cue | Nominal start - end (seconds) | View / transition |
| --- | --- | --- |
| handoff | 0.000 - 1.600 | wife-bright |
| wife-01 | 1.600 - 30.282 | wife-bright |
| wife-02 | 30.282 - 39.269 | wife-bright |
| wife-03 | 39.269 - 45.695 | wife-bright |
| wife-04 | 45.695 - 58.129 | wife-bright |
| grid-front | 58.129 - 60.629 | grid |
| front-motion | 60.629 - 62.525 | grid |
| front-alert-register | 62.525 - 63.225 | grid |
| front-open | 63.225 - 64.625 | driveway / zoom in |
| wife-05 | 64.625 - 76.511 | driveway |
| front-hold | 76.511 - 79.011 | driveway |
| front-close | 79.011 - 80.411 | driveway / zoom out |
| front-grid-pause | 80.411 - 82.911 | grid |
| side-motion | 82.911 - 84.807 | grid |
| side-alert-register | 84.807 - 85.507 | grid |
| side-open | 85.507 - 86.907 | side / zoom in |
| wife-06 | 86.907 - 103.181 | side |
| side-hold | 103.181 - 105.681 | side |
| side-close | 105.681 - 107.081 | side / zoom out |
| side-grid-pause | 107.081 - 109.581 | grid |
| backyard-motion | 109.581 - 111.477 | grid |
| backyard-alert-register | 111.477 - 112.177 | grid |
| backyard-open | 112.177 - 113.577 | backyard / zoom in |
| wife-07 | 113.577 - 125.698 | backyard |
| backyard-hold | 125.698 - 128.198 | backyard |
| backyard-close | 128.198 - 129.598 | backyard / zoom out |
| backyard-grid-pause | 129.598 - 132.098 | grid |
| doorbell-before | 132.098 - 135.122 | grid |
| doorbell-open | 135.122 - 136.522 | front / zoom in |
| wife-08 | 136.522 - 147.519 | front |
| doorbell-after | 147.519 - 150.543 | front |
| doorbell-hold | 150.543 - 153.043 | front |
| doorbell-close | 153.043 - 154.443 | front / zoom out |
| doorbell-grid-pause | 154.443 - 156.943 | grid |
| garage-alarm-lead | 156.943 - 157.943 | grid |
| garage-announcement | 157.943 - 162.541 | grid |
| garage-alarm-release | 162.541 - 163.541 | grid |
| garage-open | 163.541 - 164.941 | garage / zoom in |
| wife-09 | 164.941 - 177.062 | garage |
| garage-hold | 177.062 - 179.562 | garage |
| garage-close | 179.562 - 180.962 | garage / zoom out |
| garage-grid-pause | 180.962 - 183.462 | grid |
| interior-door | 183.462 - 186.141 | grid |
| living-open | 186.141 - 187.541 | living / zoom in |
| wife-10 | 187.541 - 200.053 | living |
| wife-11 | 200.053 - 205.774 | living |
| whistle-approach | 205.774 - 217.174 | living |
| living-silence | 217.174 - 222.174 | living |
| intruder-reveal | 222.174 - 224.174 | scare |
| wife-12 | 224.174 - 228.850 | lost / native playing synchronized |
| wife-13 | 228.850 - 237.523 | wife-dark |
| escape-running | 237.523 - 242.523 | lost |
| escape-slam | 242.523 - 243.893 | lost |
| escape-settle | 243.893 - 246.393 | living |
| wife-14 | 246.393 - 253.315 | wife-dark |
| quiet-after-escape | 253.315 - 255.315 | wife-dark |
| wife-15 | 255.315 - 261.114 | wife-dark |
| news-black | 261.114 - 263.114 | black |
| breaking-news | 263.114 - 325.594 | news |
| news-out | 325.594 - 327.094 | black |
| wife-16 | 327.094 - 378.738 | wife-return |
| ending | 378.738 - 381.738 | ending |

## Validation

- Chapter 8: 77/77 passed. Chapter 7/8 regression tests: 166/166 passed.
- Full suite: 634 passed, 16 failed (650 total). The failing names match the 16 pre-existing TV mock failures; no new failures. Baseline comparison is in logs/ch8-exact-baseline-comparison.json.
- Production build: PASS, 235 static files, API syntax verified.
- 1080p/720p side-by-side real-browser presentation and Chapter 7 baseline checks: PASS.
- Isolated native scare/warning probes: PASS with and without a scare refresh. Native sting/image and warning/SIGNAL LOST pair correctly. Browser audit samples UI after the event's presentation handler while preserving the original native event timestamp; it does not alter playback.
- Full native cinematic browser rehearsal: PASS, all 62 cues, 16 full native narration completions at volume 1, one scare, 5000-ms silence and 2000-ms scare deadline. Seven refresh checks passed: zoom, side narration, silence, scare, warning, sirens and news. The 62.480-second news reached native ended before the complete wife-16/ending. All 12 participants were preserved, the phone remained silent, and no runtime exception occurred. Detailed evidence: logs/chapter8-finale-browser-report.json and logs/ch8-exact-browser.txt.
- Existing media hash tests pass; no supplied asset changed. No production game/API mutation has been made.

## Local preview and remaining limits

Run npm run dev, open local /tv, Ctrl+Shift+C, authenticate and select CHAPTER 8 - FINAL CINEMATIC. A fresh checkpoint selects version 4. Earlier stored runs intentionally keep their original cuts. scripts/verify-chapter8-finale-browser.mjs uses isolated local in-memory state and a silent phone; run scripts/verify-chapter8-narrator-browser.mjs alongside it to reproduce both screenshot pairs. Neither script contacts production Redis.

Browser audio still requires the existing unlock gesture; buffering and device output latency remain browser constraints. A blocked warning waits to reveal SIGNAL LOST until native playback starts. Actual party-speaker loudness should be reviewed locally. Local implementation and validation preceded release authorization; production status is verified separately after deployment.
