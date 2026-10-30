# Chapter 8 - revised Happy Halloween / Collector ending

## Review status

Production baseline: 4d7123257c77b31be4d488e45bca820f190d1aee. The user authorized this focused ending extension, validation, commit/push and production deployment through the existing GitHub main / Brookwood Vercel workflow. Preserve the working finale through wife-16, all earlier chapters, source media, game data, sessions, host authentication, Redis and environment variables. No claymation credits or reserved Happy Halloween PNG is used. Production readiness is independently checked after release.

## Preserved CCTV polish

1. wife-04.mp3 contains the complete camera-system question: "Huh? That's weird. Wait, why am I getting notifications from your house cameras? Are you expecting someone else tonight? I think you should see this." One new camera-question-notification cue plays the unchanged security-notification.wav (1895.986395 ms), followed by a 350-ms camera-question-gap, immediately before the full recording. The existing three grid motion alerts remain; there are four notification plays in a fresh finale. Native ended gates prevent overlap or truncated dialogue.
2. Only a motion cue on the grid sets data-motion=true. Its existing neutral security label is centered at 50%/50% of the TV viewport, with translate(-50%,-50%) and readable clamped typography. No feed geometry, zoom, hold or alert lifetime changes. The separate red SECURITY BREACH rule is unchanged.
3. Fresh version-5 whistle cues use gain = .33 + .40*smooth(t/7600) + .22*smooth((t-7600)/3800), with t in milliseconds. Gain is 33% initially, 73% at the final-third boundary and 95% at 11400 ms. Both stages are continuous with smooth zero-slope joins; the final stage has the stronger peak approach rate. All samples are louder than the former envelope and below unity. Source window 2.800-14.200 s, natural pauses, low-pass approach, duration and abrupt stop are unchanged. Existing cuts retain the old 14%-80% envelope. Jump-scare gain remains 80%.
4. Native wife-12 completion now enters a persisted signal-lost-pause hold for exactly 3500 server milliseconds. SIGNAL LOST remains visible, the wife presentation stays hidden and all audio is paused. No siren anchor exists until wife-13 actually starts after the hold. Duplicate completion, refresh, delayed polling and multiple TVs cannot restart or shorten the saved deadline. The warning's simultaneous SIGNAL LOST/native-playing start is unchanged.

## Revised ending (version 6)

- The actual wife-16 MP3 was decoded and transcribed again. At 14.800 seconds she says: First, let's shake this off. Nothing bad happened, and it is still Halloween. Older cached transcript text was incomplete. The supplied recording is unchanged. Its native playing acknowledgement persists a happy soundtrack anchor at mediaStartedAt + 14800; duplicate acknowledgements cannot move it.
- Newly supplied assets/chapter8/audio/fun-soundtrack.mp3 (99.840 s) starts there with a 1.2-second gentle entrance to 16% under the full-volume wife narration. One preloaded Player element continues across her complete recording, the greeting and early glitches without restarting. Greeting entrance raises only this background track smoothly to 45%. No old investigation ambience resumes.
- Enhance the existing .ch8-finale-title HTML greeting: two lines, fourteen individual letters, dimensional Georgia lettering, orange/amber glow, restrained breathing/particle details and a dark cinematic surface. There is a one-second entrance, then a full 10000-ms hold at full opacity. The reserved credits PNG is never loaded. Responsive/reduced-motion rules are scoped to Chapter 8.
- Five deterministic glitches last 600 / 800 / 1000 / 1200 / 1400 ms. They remove 3 / 3 / 3 / 3 / 2 letters, with increasing RGB tearing and static; all letters are gone at stage five. The cheerful track is abruptly paused at stage three. The fifth glitch has the strongest static, clears to black for its final 200 ms, then the next cue holds black silence for another 1000 ms.
- Collector reveal uses the supplied 104.000-second video with its native AAC audio at volume 1, contained fullscreen at its original 1920x1080 aspect ratio. Chrome measured its native duration at 104.000 seconds; the file's AAC track metadata includes a 21-ms encoder tail. Only native ended can advance; wall-clock expiry cannot cut it short. No bed, narration, siren or other effect plays over it.
- Native Collector completion enters the nonlooping final-credits.mp3 main-song cue (251611.428571 ms, 320 kb/s stereo) on clean black, volume 0.8, with no narration ducking or other audio. The existing authenticated response starts playback as soon as the next authoritative cue is received; no artificial gap or extra hold is added. Native song completion ends Chapter 8. No new credits scenes are invented.
- Reuse the existing TV clock, Player preload map, one cue entry per sequence, native playing/ended listeners, autoplay resume control, generation/run/sequence fences and atomic API progression. No extra timers, RAFs, pollers or phone audio are introduced. Refresh reconstructs letter state from the persisted cue and seeks each active media clock rather than replaying earlier cues. Leaving/reset/replay stops and unloads both videos and all audio.
- Fresh runs select polishVersion 6. Stored version-5 and older runs retain their exact saved cue indices and timelines; no production session is migrated or reset.

### Media delivery

The supplied collector-reveal.mp4 is 204196548 bytes, exceeding GitHub's ordinary 100-MiB file limit. The original stays untouched locally and is explicitly excluded from Git/build output. A 65016535-byte 1080p H.264 delivery copy, collector-reveal-web.mp4, is included and used by the cinematic. It retains the original frame rate, duration and aspect ratio; only video is encoded at a constrained 5-Mbit/s target. The original AAC stream is copied without re-encoding. Its demuxed compressed-audio SHA256 matches the source exactly: b4b715bc82aaed0928fcd9a09a5c22cd814f9d289b1adfcb9197b24a25c5738a. Source/delivery hashes and new audio metadata are in chapter8-ending-media.json. Both supplied MP3s remain byte-for-byte unchanged. No media is missing.

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
4. After the native warning ends, the new 3500-ms silent SIGNAL LOST hold completes before wife-13 and the unchanged siren/escape/news/ending sequence follow.

Nominal finale-relative windows:

| Event | Start - end (seconds) |
| --- | --- |
| whistle-approach | 208.020 - 219.420 |
| living-silence | 219.420 - 224.420 |
| intruder-reveal | 224.420 - 226.420 |
| wife-12 | 226.420 - 231.096 |
| signal-lost-pause | 231.096 - 234.596 |
| wife-13 | 234.596 - 243.269 |

These are canonical nominal offsets, not substitutes for native media completion. Loading/acknowledgment/poll latency can extend actual playback; the persisted silence/scare deadlines cannot be extended by refresh. SIGNAL LOST/voice use native playing synchronization, rather than two independent timers.

Stored unversioned/version-1/version-2/version-3/version-4/version-5 cuts retain their previous index mapping and clocks. Fresh authenticated finale checkpoints select polishVersion 6. No existing game is migrated or reset. The expired scare disappears without being replayed while delayed progression catches up. Refresh seeks active media and preserves the remaining window.

## Preserved camera and audio behavior

First actual asset: ch8_cam01_driveway.png; then side passage and backyard. Each normal alert, camera-specific complete narration, 2.500-second image hold, 1.400-second reverse zoom and 2.500-second grid pause is unchanged. Doorbells remain after backyard, with the close front-porch asset. The garage warning/alarm/announcement, interior door and approaching whistle are unchanged. The original investigation music fades out during takeover and never resumes underneath the wife, CCTV, silence or news. Only the new cheerful track enters late in wife-16 as specified above. Sirens still crossfade continuously until the pre-news fade. The 62.480-second breaking-news video advances only on its native ended event, before the complete wife-16 and Happy Halloween ending.

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

74 cues; nominal runtime 757.096 seconds = 12 minutes 37.096 seconds, including the complete final song. Existing cues through wife-16 have identical windows to version 5. Native buffering, playback, acknowledgements and polling may extend wall-clock runtime. The greeting holds at full opacity for ten server seconds after its entrance; media completion always remains native-event driven.

| Cue | Nominal start - end (seconds) | View / transition |
| --- | --- | --- |
| handoff | 0.000 - 1.600 | wife-bright |
| wife-01 | 1.600 - 30.282 | wife-bright |
| wife-02 | 30.282 - 39.269 | wife-bright |
| wife-03 | 39.269 - 45.695 | wife-bright |
| camera-question-notification | 45.695 - 47.591 | wife-bright |
| camera-question-gap | 47.591 - 47.941 | wife-bright |
| wife-04 | 47.941 - 60.375 | wife-bright |
| grid-front | 60.375 - 62.875 | grid |
| front-motion | 62.875 - 64.771 | grid |
| front-alert-register | 64.771 - 65.471 | grid |
| front-open | 65.471 - 66.871 | driveway / zoom in |
| wife-05 | 66.871 - 78.757 | driveway |
| front-hold | 78.757 - 81.257 | driveway |
| front-close | 81.257 - 82.657 | driveway / zoom out |
| front-grid-pause | 82.657 - 85.157 | grid |
| side-motion | 85.157 - 87.053 | grid |
| side-alert-register | 87.053 - 87.753 | grid |
| side-open | 87.753 - 89.153 | side / zoom in |
| wife-06 | 89.153 - 105.427 | side |
| side-hold | 105.427 - 107.927 | side |
| side-close | 107.927 - 109.327 | side / zoom out |
| side-grid-pause | 109.327 - 111.827 | grid |
| backyard-motion | 111.827 - 113.723 | grid |
| backyard-alert-register | 113.723 - 114.423 | grid |
| backyard-open | 114.423 - 115.823 | backyard / zoom in |
| wife-07 | 115.823 - 127.944 | backyard |
| backyard-hold | 127.944 - 130.444 | backyard |
| backyard-close | 130.444 - 131.844 | backyard / zoom out |
| backyard-grid-pause | 131.844 - 134.344 | grid |
| doorbell-before | 134.344 - 137.368 | grid |
| doorbell-open | 137.368 - 138.768 | front / zoom in |
| wife-08 | 138.768 - 149.765 | front |
| doorbell-after | 149.765 - 152.789 | front |
| doorbell-hold | 152.789 - 155.289 | front |
| doorbell-close | 155.289 - 156.689 | front / zoom out |
| doorbell-grid-pause | 156.689 - 159.189 | grid |
| garage-alarm-lead | 159.189 - 160.189 | grid |
| garage-announcement | 160.189 - 164.787 | grid |
| garage-alarm-release | 164.787 - 165.787 | grid |
| garage-open | 165.787 - 167.187 | garage / zoom in |
| wife-09 | 167.187 - 179.308 | garage |
| garage-hold | 179.308 - 181.808 | garage |
| garage-close | 181.808 - 183.208 | garage / zoom out |
| garage-grid-pause | 183.208 - 185.708 | grid |
| interior-door | 185.708 - 188.387 | grid |
| living-open | 188.387 - 189.787 | living / zoom in |
| wife-10 | 189.787 - 202.299 | living |
| wife-11 | 202.299 - 208.020 | living |
| whistle-approach | 208.020 - 219.420 | living |
| living-silence | 219.420 - 224.420 | living |
| intruder-reveal | 224.420 - 226.420 | scare |
| wife-12 | 226.420 - 231.096 | lost |
| signal-lost-pause | 231.096 - 234.596 | lost |
| wife-13 | 234.596 - 243.269 | wife-dark |
| escape-running | 243.269 - 248.269 | lost |
| escape-slam | 248.269 - 249.639 | lost |
| escape-settle | 249.639 - 252.139 | living |
| wife-14 | 252.139 - 259.061 | wife-dark |
| quiet-after-escape | 259.061 - 261.061 | wife-dark |
| wife-15 | 261.061 - 266.860 | wife-dark |
| news-black | 266.860 - 268.860 | black |
| breaking-news | 268.860 - 331.340 | news |
| news-out | 331.340 - 332.840 | black |
| wife-16 | 332.840 - 384.484 | wife-return |
| ending-in | 384.484 - 385.484 | ending |
| ending | 385.484 - 395.484 | ending |
| ending-glitch-1 | 395.484 - 396.084 | ending / letter-removal stage 1 |
| ending-glitch-2 | 396.084 - 396.884 | ending / letter-removal stage 2 |
| ending-glitch-3 | 396.884 - 397.884 | ending / letter-removal stage 3 |
| ending-glitch-4 | 397.884 - 399.084 | ending / letter-removal stage 4 |
| ending-glitch-5 | 399.084 - 400.484 | ending / letter-removal stage 5 |
| collector-black | 400.484 - 401.484 | black |
| collector-reveal | 401.484 - 505.484 | collector |
| final-song | 505.484 - 757.096 | black |

## Validation

- Chapter 8 tests: 91/91 passed. Chapter 7/8 regression tests: 180/180 passed.
- Production build: PASS, 239 static files; API and browser syntax verified. Original oversized video and unrelated Chapter 1 draft are excluded.
- Both supplied music files decode completely; hashes and durations are validated. Original Collector audio and delivery-copy audio hashes match. All previously supplied Chapter 8 media hashes still pass.
- Targeted coverage includes ten-second greeting hold, five deterministic letter-removal stages, native wife-16 music anchor, smooth ducking/continuity, stage-three cutoff, black silence, native Collector/video/song gates, autoplay recovery, refresh seeking, cleanup, legacy timelines and unchanged players/history.
- Full native-speed browser rehearsal: PASS. All 74 cues, all five letter-removal stages, every complete recording, unchanged single scare, native news/Collector completion and full main song at 80% passed. Thirteen refresh recoveries passed: question, zoom, side narration, silence, scare, warning, post-warning pause, sirens, news, wife-16, greeting, Collector and final song. Twelve participants were preserved, the phone created no audio, and no runtime exception occurred. Source: logs/chapter8-finale-browser-report.json and logs/ch8-ending-browser-complete.txt.
- Greeting screenshots at 1920x1080 and 1280x720 were inspected: complete text is legible and contained; warm dimensional typography and atmosphere render correctly. The reserved artwork is unused. Screenshots: logs/ch8-greeting-1920.png and logs/ch8-greeting-1280.png.
- Native Collector-end to main-song-playing gap measured 47 ms; only final-credits.mp3 was active, at 80%, nonlooping on black. Source: logs/ch8-final-song-live-proof.json.
- No unrelated historical test suite was rerun. No production game/session/Redis mutation is used for verification.

## Local preview and remaining limits

Run npm run dev, open local /tv, Ctrl+Shift+C, authenticate and select CHAPTER 8 - FINAL CINEMATIC. A fresh checkpoint selects version 6. Earlier stored runs intentionally keep their original cuts. scripts/verify-chapter8-finale-browser.mjs uses isolated local in-memory state and a silent phone; run scripts/verify-chapter8-narrator-browser.mjs alongside it to reproduce both screenshot pairs. Neither script contacts production Redis.

Browser audio still requires the existing unlock gesture; buffering and device output latency remain browser constraints. A blocked warning waits to reveal SIGNAL LOST until native playback starts. Actual party-speaker loudness should be reviewed locally. Local implementation and validation preceded release authorization; production status is verified separately after deployment.

The production release uses the existing Brookwood project. Read-only smoke checks fetch /tv and /join without executing game JavaScript, compare runtime files, and inspect media headers/ranges; they do not start or reset a session.
