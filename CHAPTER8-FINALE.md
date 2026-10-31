# Chapter 8 - photographic credits and permanent Halloween ending

## Review status

Production baseline for the current credits polish: a52f50514a450cd496f5e4ea4c0731944391fb22. The user authorized the supplied photographic credits, validation, commit/push and production deployment through the existing GitHub main / Brookwood Vercel project. All earlier cinematic cues through native Collector completion, narration, camera assets, earlier chapters, player sessions, host authentication and Redis/environment configuration are preserved. Final9 is now approved for the permanent ending; no replacement artwork is generated. Production readiness is independently checked after release.

## Preserved CCTV polish

1. wife-04.mp3 contains the complete camera-system question: "Huh? That's weird. Wait, why am I getting notifications from your house cameras? Are you expecting someone else tonight? I think you should see this." One new camera-question-notification cue plays the unchanged security-notification.wav (1895.986395 ms), followed by a 350-ms camera-question-gap, immediately before the full recording. The existing three grid motion alerts remain; there are four notification plays in a fresh finale. Native ended gates prevent overlap or truncated dialogue.
2. Only a motion cue on the grid sets data-motion=true. Its existing neutral security label is centered at 50%/50% of the TV viewport, with translate(-50%,-50%) and readable clamped typography. No feed geometry, zoom, hold or alert lifetime changes. The separate red SECURITY BREACH rule is unchanged.
3. Fresh version-5 whistle cues use gain = .33 + .40*smooth(t/7600) + .22*smooth((t-7600)/3800), with t in milliseconds. Gain is 33% initially, 73% at the final-third boundary and 95% at 11400 ms. Both stages are continuous with smooth zero-slope joins; the final stage has the stronger peak approach rate. All samples are louder than the former envelope and below unity. Source window 2.800-14.200 s, natural pauses, low-pass approach, duration and abrupt stop are unchanged. Existing cuts retain the old 14%-80% envelope. Jump-scare gain remains 80%.
4. Native wife-12 completion now enters a persisted signal-lost-pause hold for exactly 3500 server milliseconds. SIGNAL LOST remains visible, the wife presentation stays hidden and all audio is paused. No siren anchor exists until wife-13 actually starts after the hold. Duplicate completion, refresh, delayed polling and multiple TVs cannot restart or shorten the saved deadline. The warning's simultaneous SIGNAL LOST/native-playing start is unchanged.

## Preserved Collector ending (version 6)

- The actual wife-16 MP3 was decoded and transcribed again. At 14.800 seconds she says: First, let's shake this off. Nothing bad happened, and it is still Halloween. Older cached transcript text was incomplete. The supplied recording is unchanged. Its native playing acknowledgement persists a happy soundtrack anchor at mediaStartedAt + 14800; duplicate acknowledgements cannot move it.
- Newly supplied assets/chapter8/audio/fun-soundtrack.mp3 (99.840 s) starts there with a 1.2-second gentle entrance to 16% under the full-volume wife narration. One preloaded Player element continues across her complete recording, the greeting and early glitches without restarting. Greeting entrance raises only this background track smoothly to 45%. No old investigation ambience resumes.
- Enhance the existing .ch8-finale-title HTML greeting: two lines, fourteen individual letters, dimensional Georgia lettering, orange/amber glow, restrained breathing/particle details and a dark cinematic surface. There is a one-second entrance, then a full 10000-ms hold at full opacity. The reserved credits PNG is never loaded. Responsive/reduced-motion rules are scoped to Chapter 8.
- Five deterministic glitches last 600 / 800 / 1000 / 1200 / 1400 ms. They remove 3 / 3 / 3 / 3 / 2 letters, with increasing RGB tearing and static; all letters are gone at stage five. The cheerful track is abruptly paused at stage three. The fifth glitch has the strongest static, clears to black for its final 200 ms, then the next cue holds black silence for another 1000 ms.
- Collector reveal uses the supplied 104.000-second video with its native AAC audio at volume 1, contained fullscreen at its original 1920x1080 aspect ratio. Chrome measured its native duration at 104.000 seconds; the file's AAC track metadata includes a 21-ms encoder tail. Only native ended can advance; wall-clock expiry cannot cut it short. No bed, narration, siren or other effect plays over it.
- Version-6 saves retain their original full, nonlooping final-credits.mp3 main-song cue on black at 80%. Fresh version-7 runs use the same unchanged main song for the photographic credits below, ending it with the requested fade after final8.
- Reuse the existing TV clock, Player preload map, one cue entry per sequence, native playing/ended listeners, autoplay resume control, generation/run/sequence fences and atomic API progression. No extra timers, RAFs, pollers or phone audio are introduced. Refresh reconstructs letter state from the persisted cue and seeks each active media clock rather than replaying earlier cues. Leaving/reset/replay stops and unloads both videos and all audio.
- Fresh runs select polishVersion 8. Stored version-7 and older runs retain their exact saved cue indices, photo durations and audio policy; no production session is migrated or reset.

### Media delivery

The supplied collector-reveal.mp4 is 204196548 bytes, exceeding GitHub's ordinary 100-MiB file limit. The original stays untouched locally and is explicitly excluded from Git/build output. A 65016535-byte 1080p H.264 delivery copy, collector-reveal-web.mp4, is included and used by the cinematic. It retains the original frame rate, duration and aspect ratio; only video is encoded at a constrained 5-Mbit/s target. The original AAC stream is copied without re-encoding. Its demuxed compressed-audio SHA256 matches the source exactly: b4b715bc82aaed0928fcd9a09a5c22cd814f9d289b1adfcb9197b24a25c5738a. Source/delivery hashes and new audio metadata are in chapter8-ending-media.json. Both supplied MP3s remain byte-for-byte unchanged. No media is missing.

## Photographic credits (version 8)

Actual supplied filenames: final1.png through final9.png and shutdown.mp4. Every source byte is retained, with hashes and dimensions in chapter8-credits-media.json. No asset is renamed, regenerated or re-encoded. The unchanged final-credits.mp3 remains 320-kbit/s stereo, nonlooping at the established main music volume of 80%; no narration ducking or additional audio is applied.

Native Collector completion automatically enters credits-intro. The existing Player's one final-song audio element starts at its beginning. Native playing plus the decoded first image arms the existing authenticated readiness action; this atomically saves soundAnchors.credits and the intro deadline. The centered HTML TO BE CONTINUED... presentation fades in for 500 ms, holds fully visible for 4000 ms, then fades to black over 1000 ms. Song playback is continuous when the first image appears.

Photos final1 through final8 appear in numeric order using one reusable paper figure and image node. Each eleven-second cue (exactly 2000 ms longer than version 7) has a 900-ms soft entrance/slide/settle, 9000-ms full-opacity hold with a slow zoom, 900-ms sideways fade and 200-ms pure black interval. Alternating roughly -2.4/+2.4 degree angles settle naturally. A single pure creditFrame formula samples the existing TV clock; no separate timers, keyframe clocks or eight custom animation engines are added. Rotated bounds are fitted inside 88% viewport limits, including frame, zoom and motion margins. Thin warm off-white paper, border-only CSS texture and soft shadow do not cover or recolor the artwork. No captions or other overlays are shown. Reduced-motion mode keeps opacity changes with static positioning.

Each image is preloaded during the earlier finale and decoded before its persisted viewing interval begins. Only one figure exists, so photographs cannot crossfade over one another. Refresh waits for actual image readiness, then reconstructs its remaining canonical motion/hold rather than restarting. The song uses the saved credits anchor and the same element across every photo; refresh seeks the elapsed position once. Blocked audio uses the existing authenticated resume control. Read-only TVs cannot arm or advance the intro.

After final8 has completely faded and its black interval finishes, credits-music-out holds black for 2500 ms while smoothly fading only the final song from 80% to zero. In version 8 the same element continues playing even when that fade reaches zero; it is never paused or restarted at the fade boundary. At shutdown, muted is set before restoring its ordinary volume property to 80%, so only the native shutdown audio is audible. The song timeline continues without any play(), pause() or currentTime assignment at either shutdown or final9 transitions. Version-7 saves retain their former stop policy.

Shutdown is the exact supplied fragmented MP4: H.264, 1344x768, original stereo AAC at 32 kHz. Its ordinary movie header is zero; fragment sample tables measure 5258.343750 ms and Chrome independently reports 5.258344 seconds. The source decodes fully. It is contained fullscreen, with native audio at volume 1 and no controls. Only native ended can advance; timer-only requests cannot cut it short. Existing playing/ended authorization, generation/run/sequence fences, seek recovery, preload and retry/unlock behavior are reused.

Native shutdown completion enters final-image. The decoded final9.png fades in over 1200 ms, with contain sizing on black and no paper frame. The server then stores Chapter 8 complete, retaining this last visual. Completed-state TV mounting and refresh explicitly restore final9 indefinitely. No deadline, automatic lobby return or replay follows. Version 8 unmutes the same song at its prior 80% normal volume after shutdown finishes, without restarting or seeking. The same song remains eligible in the completed visual state until its natural end; an ended flag and the saved anchor/duration guard prevent automatic replay, including after unlock or refresh. A refresh during shutdown reconstructs one muted element at its saved elapsed song position; a refresh after song completion creates no playback. No second music instance, narration or effects are added. Chapter exit/reset cleans up all three videos, song listeners and audio, decoded images and presentation nodes; it does not modify player data.

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

85 cues; nominal finite visual runtime 607.943 seconds = 10 minutes 7.943 seconds, followed by final9 indefinitely. Eight photo cues add exactly 16000 ms in total. The final song continues on its original 251.611-second media timeline, muted during shutdown and audible again over final9 until natural completion. This visual runtime excludes the earlier interactive puzzle and native loading/acknowledgement latency.

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
| ending-glitch-1 | 395.484 - 396.084 | ending |
| ending-glitch-2 | 396.084 - 396.884 | ending |
| ending-glitch-3 | 396.884 - 397.884 | ending |
| ending-glitch-4 | 397.884 - 399.084 | ending |
| ending-glitch-5 | 399.084 - 400.484 | ending |
| collector-black | 400.484 - 401.484 | black |
| collector-reveal | 401.484 - 505.484 | collector |
| credits-intro | 505.484 - 510.984 | credits-intro |
| credit-photo-1 | 510.984 - 521.984 | credit-photo / final1.png |
| credit-photo-2 | 521.984 - 532.984 | credit-photo / final2.png |
| credit-photo-3 | 532.984 - 543.984 | credit-photo / final3.png |
| credit-photo-4 | 543.984 - 554.984 | credit-photo / final4.png |
| credit-photo-5 | 554.984 - 565.984 | credit-photo / final5.png |
| credit-photo-6 | 565.984 - 576.984 | credit-photo / final6.png |
| credit-photo-7 | 576.984 - 587.984 | credit-photo / final7.png |
| credit-photo-8 | 587.984 - 598.984 | credit-photo / final8.png |
| credits-music-out | 598.984 - 601.484 | black |
| shutdown | 601.484 - 606.743 | shutdown |
| final-image | 606.743 - 607.943 | final9 |

## Validation

- Chapter 8 tests: 101/101 passed. Chapter 7/8 regressions: 190/190 passed. Coverage includes exact numeric order, preserved media bytes, seven-second photo holds, exclusive black transitions, uncropped rotated corners at 1080p/720p, intro/native readiness, one continuous song, fade/stop before shutdown, native shutdown completion, permanent final9 and refresh, autoplay and cleanup. Legacy version-6 behavior remains covered independently.
- Production build: PASS, 250 static files; browser/API syntax verified. All ten new assets are included at their exact names. No earlier source/media or production configuration is modified.
- Focused native credits rehearsal: PASS. Eight actual images, continuous song, photo/audio refresh, song fade, original shutdown audio and native end, permanent final9 refresh, preserved twelve-player state and silent phone. Chrome measured shutdown at 5.258344 s. Evidence: logs/ch8-photo-native-probe.json. Actual paper-photo and final9 screenshots were inspected.
- Full 85-cue native browser rehearsal: PASS. Preserved narration, camera order, single scare, native news and Collector; all eight photos; 1080p/720p layouts; continuous music and fade; native shutdown and original audio; final9 permanence and completed-state refresh all passed. Fifteen refresh recoveries passed. All twelve participants were preserved, the phone created no audio, and no runtime exceptions occurred. Evidence: logs/chapter8-finale-browser-report.json and logs/ch8-credits-browser.txt. Photo screenshots and final9 at both resolutions are stored under logs/ch8-credits-*.png and were inspected.
- No unrelated historical suite or production game mutation is used. Production release readiness and read-only media/runtime checks follow the Git release.

## Local preview and remaining limits

Run npm run dev, open local /tv, Ctrl+Shift+C, authenticate and select CHAPTER 8 - FINAL CINEMATIC. A fresh checkpoint selects version 8. Earlier stored runs intentionally keep their original cuts. scripts/verify-chapter8-finale-browser.mjs uses isolated local in-memory state and a silent phone; run scripts/verify-chapter8-narrator-browser.mjs alongside it to reproduce both screenshot pairs. Neither script contacts production Redis.

Browser audio still requires the existing unlock gesture; buffering and device output latency remain browser constraints. A blocked warning waits to reveal SIGNAL LOST until native playback starts. Actual party-speaker loudness should be reviewed locally. Local implementation and validation preceded release authorization; production status is verified separately after deployment.

The production release uses the existing Brookwood project. Read-only smoke checks fetch /tv and /join without executing game JavaScript, compare runtime files, and inspect media headers/ranges; they do not start or reset a session.

## After-news Test Mode shortcut

In Ctrl+Shift+C Chapter Select, Skip to After Breaking News is a normal visible option beside the other Chapter 8 checkpoints. It uses their existing authenticated test-navigation permissions and creates a finale test run. The former finale.testEntry visibility/prerequisite gate incorrectly hid it during opening and puzzle test runs and has been removed. Ordinary gameplay and phone actions do not invoke this explicit host testing action. It begins complete wife-16, with the existing media disposal, saved-state recovery, Collector and credits unchanged.

Menu correction validation: 3 focused tests and the 250-file build passed. A short actual Chrome check opened Ctrl+Shift+C during an opening test run, showed the enabled option in the native dropdown, selected it with native keyboard input and clicked Go while news was playing. Previous media stopped/unloaded, wife-16 began, refresh restored its saved clock, players were preserved and phones remained silent. Screenshot: logs/ch8-after-news-native-menu.png. Evidence: logs/ch8-after-news-browser-proof.json. No full regression suite or lengthy cinematic rehearsal was run.

## Targeted credits/music polish validation

Skip to Final Credits is a visible, enabled option in the same Ctrl+Shift+C host-only test selector as the other Chapter 8 checkpoints. Selecting it stops prior controllers, starts a version-8 finale at credits-intro, and plays TO BE CONTINUED... with the existing final song. It is an explicit authenticated test-navigation action, not a normal gameplay button. Existing after-news testing remains available.

Current validation: 5 focused tests passed for exact +2000-ms photo timing and retained animations, host-only checkpoint/state recovery, uninterrupted mute/unmute with zero transition pauses/replays/seeks, and natural-end/late-refresh non-restart behavior. Production build passed (250 files). A short Chrome test opened the native menu, selected Skip to Final Credits with keyboard input and clicked Go, verified the title plus one song at normal volume, prior media cleanup, preserved players and silent phones. Evidence: logs/ch8-final-credits-checkpoint-proof.json; screenshot logs/ch8-final-credits-native-menu.png. No full regression suite, exhaustive media checks or lengthy cinematic rehearsal was run for this polish. The earlier full-rehearsal results above document version 7.

## Short wife introduction (2026-10-31)

Fresh finales persist `introVersion: 1` alongside polish version 8. They use
`assets/chapter8/audio/wife-intro-short.mp3` in place of wife-01/02/03. The
supplied file is unchanged mono MPEG Layer III, 44,100 Hz, 128 kbps, 638 frames
(734,976 samples): **16,666.122449 ms**. SHA-256:
`c5703848ac2b79315e82196140a164d1f774f5720566a2d29e16de2958410f26`.

The three previous recordings total **44,094.693878 ms**; the fixed saving is
**27,428.571429 ms**. The existing 1,600-ms takeover is unchanged. The same warm
shared narrator renderer remains visible through the new recording, using its
existing entrance fade immediately rather than the old clip's black lead. The
old game-title beat belonged to wife-02 and is not shown over the replacement.

At native intro completion the unchanged camera notification and 350-ms gap
lead into wife-04. No new hold or clock is inserted. Nominal wife-04 entry moves
from **47,940.680272** to **20,512.108844 ms**. Every notification, camera, narration,
sound cue, native video gate, scare, news, Collector/credits and permanent ending
from that interruption onward has identical properties and relative timing.
The finite nominal cue table changes from 607,942.760984 to 580,514.189555 ms;
the existing final image still remains indefinitely.

Already-saved finales without `introVersion` retain their original cue arrays
and indexes. Existing testing checkpoints translate their original cue IDs into
the shortened table, preserving their destinations. All original wife files
remain unchanged as legacy media/backups. Narration stays at volume 1 with no
encoding, gain or playback-rate changes.

Validation: 16 focused tests passed, including exact source bytes/duration,
complete downstream cue equivalence, native gates, checkpoint destinations,
legacy indexes, scare/news completion, credits continuity and state fencing.
The targeted isolated Chrome rehearsal played the entire new intro and wife-04,
refreshed during the intro, checked the warm narrator at 1920×1080 and 1280×720,
and reached the original driveway narration with no old 01/02/03 playback or
browser exceptions. Evidence: `logs/chapter8-short-intro-browser-report.json`
and `logs/ch8-short-wife-1920.png` / `logs/ch8-short-wife-1280.png`.


## Post-scare siren refinement (2026-10-31)

Fresh finales persist sirenVersion 1. The existing five-second silence and two-second scare are unchanged. Entry to wife-12 / SIGNAL LOST anchors the sirens at the authoritative end of the scare, before the warning plays. The existing approaching-siren layer remains continuous through the warning, SIGNAL LOST pause, wife-13 and escape effects, and wife-14. The actual wife-14 line is: "I think... I think he's gone. Is everyone okay? Please tell me you are all okay."

Native completion of the full wife-14 recording establishes sirensOut. The existing quiet-after-escape visual holds while sirens fade smoothly to zero over 1000 ms; no sirens reach wife-15 or the news. Existing two-source equal-power crossfaded source windows remain one managed siren layer, at the unchanged 8%-34% approach envelope below narration. No source media or cinematic durations changed. Refresh reconstructs the persisted anchors; previously saved finales without sirenVersion retain their prior mix.

Focused validation: 19 tests across host-photo/messages, checkpoint/siren controls, preserved short introduction, and existing sound-design coverage passed. Production build passed. Isolated browser rehearsal exercised all 32 existing checkpoint targets, host/guest photo confirmation, 1080p/720p photo and Four Doors layouts, complete native scare/warning/escape playback, siren refresh recovery and fade completion, with no browser exceptions. Screenshots and report: logs/ch8-host-photo-{1920,1280}.png, logs/ch8-doors-hint-{1920,1280}.png, logs/checkpoints-photo-messages-sirens-browser.json. No production state was used.


## FINAL10 credits release (2026-10-31)

Fresh finales persist creditsVersion 1; saved finales without it retain their previous cue indexes and ending. The new explicit photo order is FINAL1, FINAL2, FINAL3, FINAL4, FINAL5, FINAL6, FINAL7, FINAL8, FINAL10, FINAL9, then shutdown.mp4 after the existing 2500-ms music fade. The requested FINAL9-before-shutdown order replaces the old permanent FINAL9-after-shutdown presentation. After shutdown ends natively, the ending remains black. Existing song mute/unmute and native song-completion behavior are unchanged.

Supplied asset: assets/chapter8/final10.png, 1670 x 942, 2409093 bytes; SHA-256 b17cd5e66dbbcc7013f31c7fb6b2cd207deed0d09f5bf9b0a950c9cbb5ca406d. The original bytes were not modified. All ten photos use the shared 11000-ms duration, aspect-ratio sizing, print frame, settling/zoom motion, fade and exclusive black transition. Image readiness gates remain authoritative.

Nominal time from credits introduction: text 0-5500 ms; photos 1-8 5500-93500; FINAL10 93500-104500; FINAL9 104500-115500; music fade 115500-118000; shutdown 118000-123258.34375 (actual native ended governs); terminal black settles through 124458.34375 ms. Credits total 2:04.458, versus 1:42.458 previously (+22 seconds because FINAL9 is now also a timed photo). Full fresh-finale nominal runtime is 602514.1895549886 ms (10:02.514), excluding loading, polling and native completion delays. No pre-credits content or timing changed.

Focused validation: 13 tests passed covering FINAL10 byte identity, explicit order, identical motion and safe margins at 1920x1080 and 1280x720, native shutdown completion, music continuity/muting, legacy saves and shortened intro preservation. Browser rehearsal passed FINAL8 through native shutdown completion, photo/video/terminal refresh, normal video audio with muted song, and black terminal state. Screenshots: logs/ch8-final10-1920.png and logs/ch8-final10-1280.png; report: logs/chapter8-final10-browser.json.

### Existing full-session reset (host UI; not used on production)

From an ending/cinematic, open Ctrl+Shift+C, choose CHAPTER 3 - PRIVATE MESSAGES, enter the host PIN, and GO TO CHECKPOINT. Click the TV background to remove input focus, then press R five separate times within two seconds. Enter the host PIN in HOST CONTROL and select RETURN TO LOBBY. This return alone preserves participant registrations. In the lobby's Host code field enter the host PIN, click RESET LOBBY, and confirm the reset dialog. If already in the lobby, begin directly with RESET LOBBY.

RESET LOBBY invokes the existing authenticated reset action, writes fresh lobby state, removes participant registrations and gameplay progress, unlocks the room and creates a new generation. Old player tokens no longer authenticate; phones return to the join screen on polling/reload. Players enter their names again at /join. The host signs in, clicks LOCK ROOM, then START FINAL SESSION. The checkpoint tool alone is not a full-session reset. This exact UI path, token clearing, rejoin, lock and fresh start were verified only against isolated local memory. No production state was reset or modified.


## Full-rehearsal presentation and sound fixes (2026-10-31)

- The 17-clue coded artwork no longer has a top DECODE THE MESSAGE heading. The supplied artwork remains centered with percentage-based reveal regions and unchanged host-only puzzle behavior; its preceding recorded introduction and title remain intact.
- wife-13.mp3 (the police-siren narration, 8672.65306122449 ms) now has a black TV presentation with the shared narrator renderer hidden for this clip alone. Its full-volume narration, siren anchors/envelope, native completion and every subsequent cue are unchanged.
- Supplied garage replacement remains assets/chapter8/ch8_cam05_garag.png, 1850 x 850, 1722933 bytes, SHA-256 213fed188dc38298a1091089e066c1704eb49f30e4a624d87d6e3dbc0253fe94. No image editing or path change was performed. The existing contain scaling, camera transitions, holds and overlays remain.
- The current intruder-reveal impact gain changes from 0.80 to 0.90, sharing the same conservative SCARE_GAIN as the Chapter 6 timed scream. Legacy impact playback also uses that cap instead of its old 0.24 gain. Existing source windows, 2-second image, impact cutoff/fade and siren start are unchanged. No narration/music/siren gain changed. Decoded scream peak is +0.435 dBFS; 0.90 preserves approximately 0.48 dB of source headroom.
- As explicitly selected by the user, the glitch sound reuses assets/chapter7/audio/ch7_connection_recovery.mp3 unchanged. It begins with ending-glitch-1 and spans the existing 600/800/1000/1200/1400-ms phases (5000 ms total), at 0.28 peak gain, with a 30-ms entrance and 200-ms ending fade. No effect plays during the 10-second greeting hold or the subsequent collector-black hold. The existing ConnectionPlayback sample-clock adapter is reused through a Chapter 8 subclass, with a native source stop exactly at the five-second boundary even when animation frames are suspended. Refresh seeks the canonical elapsed position across the loop, without replaying completed glitches. One source persists between glitch phases; exit/reset closes it. The Chapter 7 connection player itself is unchanged.

Validation: 40 focused checks passed, including two Chapter 7 connection-player compatibility tests, across laundry quorum, Chapter 6 vote regressions, shared scare gains, coded-view behavior, Chapter 8 sound layers/native static, siren anchors and FINAL10 credits preservation. Targeted browser rehearsal passed 1080p/720p coded art, updated garage and black siren narration; native scare gain; static/glitch continuity, source identity and refresh recovery; silent phones; and twelve-player voting through the final ballot. No browser exceptions. Report: logs/full-rehearsal-fixes-browser.json; screenshots: logs/ch8-rehearsal-{puzzle,garage,siren-black}-{1920,1280}.png. Canonical cinematic runtime, credits order, media narration, news and shutdown are unchanged. Production build passed; read-only release verification follows deployment.

Scare-gain follow-up: both dedicated scream effects now use SCARE_GAIN=0.95 (previously 0.90), with the same source, cue timing and fades. The measured +0.435 dBFS decoded source remains just below full scale at this gain. Other audio is unchanged. Thirteen focused audio/visual checks and the production build passed.
