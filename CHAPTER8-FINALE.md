# Chapter 8 - cinematic pacing and presentation

## Review status and preservation

Current production baseline: 87b0cf1. The user has reviewed and approved this pacing pass for commit and release from feat/chapter8-cinematic-pacing through the established GitHub/main/Vercel production workflow. Production readiness is verified separately from the local validation below.

All sixteen wife recordings, sound effects, real-home images, prepared intruder, 3.500-second silence, single scare, SIGNAL LOST, native-completion news and Happy Halloween ending are preserved. No supplied media bytes, puzzle regions/reveals, phone behavior, host authorization, player/couple history, Redis transport/configuration or environment variables change. The future killer/webcam work and unrelated Chapter 1 draft are excluded.

## Wife presentation and actual game title

The wife now has a fullscreen presentation with warm purple, pink, blue and gold gradients, gentle light movement, a large inline SVG microphone and the existing narrator investigation-wave animation. Native media playing/paused/ended state drives the speaking treatment. Lighting/microphone updates use the existing TV frame scheduler; no additional timers or RAFs exist. Reduced-motion CSS suppresses decorative movement. Chapter 8-scoped specificity prevents later shared narrator styles from overriding its palette or waveform colors.

The recorded name is THE GREAT HALLOWEEN PARTY RESCUE. Local timed inspection of wife-02 places Ladies and gentlemen at 0-1.460 seconds, the introduction/name at 1.460-5.500, and the joke afterward. The title enters at native clip offset 1.460 seconds, remains through 8.100, then disappears without interrupting the recording or microphone.

Reaction screens from wife-05 onward are cold/desaturated purple-blue. After news, wife-16 also begins cold. Warm colors return only at clip offset 14.800 seconds, after the recorded line I think we can finally relax now. All dialogue remains unchanged.

## Alerts, CCTV and doorbell choreography

- Wife-03 finishes before two full 1.896-second security notifications. Her warm presentation stays visible. The first alert ends, a 1.200-second gap follows, then the second alert finishes; an 800-ms reaction beat precedes the complete wife-04 notification reaction. Only then does the grid appear.
- Wife-06 is the only later clip explicitly saying another camera notification. One alert and a 700-ms pause precede that reaction. There are exactly THREE security-notification playbacks in the chapter: two opening, one side-passage alert. No extra notifications accompany unrelated lines.
- The opening grid holds 2.500 seconds; return grids hold 1.800 seconds and selecting the side feed adds 2.000 seconds. Feed observation holds are 3.000-3.500 seconds, with an additional 2.000-second driveway linger. Progression stays driveway, side passage, backyard, front porch, garage, living room.
- Both 3.024-second doorbells play on the grid. The first is followed by a 600-ms beat, wife-08 on her cold microphone screen, then the porch feed. After the grid returns, the second bell is followed by a 600-ms beat and wife-09's existing garage/intrusion reaction. No recording is replayed or invented.
- Garage detection stays on the grid with a large SECURITY BREACH overlay throughout the one-second alarm lead, complete automated announcement and one-second release. Restrained red modulation and a simple surveillance border replace any celebratory treatment. The garage photograph appears afterward for three seconds, followed by the remaining wife dialogue and preserved door/whistle approach.

## Ambience and effects

The existing Chapter 8 ambient element and original chapter clock now survive the reaction-to-wife handoff and all cinematic phase changes. It is not paused/reset/recreated when the wife takes over. Targets are 7% for general pauses/grid, 3.5% under wife narration and 2.5% for breach/approach. A 250-ms smoothing response ducks/restores only this bed; narration remains at its original full volume.

During the final second of the continuous whistle excerpt, ambience eases to zero. It is hard-guarded at exactly zero through living-silence, the sting/loss-of-signal and wife-12's urgent warning. It returns smoothly for wife-13. The same loop continues silently, retaining canonical position rather than restarting. News-transition gain fades away; ambience is exactly zero during news/news-out, then returns under wife-16. Ending fades it gracefully. Browser/OS autoplay recovery still uses the existing authenticated control.

Sirens start at wife-13's persisted native start and continue across running, slam, settling, wife-14, the quiet beat and wife-15. Two preloaded Player elements alternate the selected source 2-16-second section. Windows are fourteen seconds, start twelve seconds apart and overlap with two-second equal-power crossfades. This avoids the original silent/trailing tail and audible restarts even when narration/loading extends the scene beyond 31.6 seconds. Approaching gain rises from 8% toward 34% over twelve seconds, beneath dialogue. The SAME layer clock survives camera changes and refresh. Only news-black fades the sirens over its complete two-second transition; both elements stop before the news anchor. Legacy runs retain their prior siren behavior.

The whistle remains one unchanged source excerpt (2.800-14.200 seconds), no loop, preserving every natural pause. It stays continuous across the garage-to-empty-living-room switch, grows from 14% toward 80% and opens its low-pass from 1 kHz to 6.5 kHz. It cuts abruptly, followed by the decoded-image-gated, persisted 3.500-second silent hold and once-only scare/sting. The breach's alarm ducking, full security announcement, selected five-second running excerpt, single slam and decay remain intact.

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
| impact | ch6_sfx_scream.mp3 | 3.312 | 0.200 - 0.850 |
| doorbell | assets/chapter4/audio/doorbell.mp3 | 3.024 | 0.000 - 3.024, twice |

No requested asset is missing or format-unusable. The reused Chapter 6 sound is a scream/sting: only its sharp 0.200-0.850-second excerpt plays at 24%, with a short tail fade. Earlier chapters and that file are unchanged. Running/slam peaks approach full scale, so playback is attenuated rather than destructively normalized. A human rehearsal on the actual party speakers is recommended.


## Complete canonical timeline

New runs: 57 cues, nominal 372.888 seconds (6 minutes 12.888 seconds). Previous production: 41 cues, 334.496 seconds. Added time: 38.392 seconds. Native media loading, buffering, acknowledgments and polling may extend actual running time; no narration is compressed, interrupted or overlapped.

| Cue | Nominal start - end (s) | Visual |
| --- | --- | --- |
| handoff | 0.000 - 1.600 | wife-bright |
| wife-01 | 1.600 - 30.282 | wife-bright |
| wife-02 | 30.282 - 39.269 | wife-bright |
| wife-03 | 39.269 - 45.695 | wife-bright |
| notification-first | 45.695 - 47.591 | wife-bright |
| notification-gap | 47.591 - 48.791 | wife-bright |
| notification-second | 48.791 - 50.687 | wife-bright |
| notification-reaction | 50.687 - 51.487 | wife-bright |
| wife-04 | 51.487 - 63.921 | wife-bright |
| grid-driveway | 63.921 - 66.421 | grid |
| driveway-observe | 66.421 - 69.421 | driveway |
| wife-05 | 69.421 - 81.307 | wife-dark |
| driveway-linger | 81.307 - 83.307 | driveway |
| grid-side | 83.307 - 85.107 | grid |
| motion-notification | 85.107 - 87.003 | wife-dark |
| motion-reaction | 87.003 - 87.703 | wife-dark |
| wife-06 | 87.703 - 103.977 | wife-dark |
| select-side | 103.977 - 105.977 | grid |
| side-observe | 105.977 - 109.477 | side |
| grid-backyard | 109.477 - 111.277 | grid |
| wife-07 | 111.277 - 123.398 | wife-dark |
| backyard-observe | 123.398 - 126.898 | backyard |
| grid-porch | 126.898 - 128.698 | grid |
| doorbell-before | 128.698 - 131.722 | grid |
| doorbell-reaction | 131.722 - 132.322 | wife-dark |
| wife-08 | 132.322 - 143.319 | wife-dark |
| porch-observe | 143.319 - 146.819 | porch |
| porch-return-grid | 146.819 - 148.619 | grid |
| doorbell-after | 148.619 - 151.643 | grid |
| doorbell-second-reaction | 151.643 - 152.243 | wife-dark |
| wife-09 | 152.243 - 164.364 | wife-dark |
| grid-garage | 164.364 - 166.864 | grid |
| garage-alarm-lead | 166.864 - 167.864 | grid |
| garage-announcement | 167.864 - 172.462 | grid |
| garage-alarm-release | 172.462 - 173.462 | grid |
| garage-observe | 173.462 - 176.462 | garage |
| wife-10 | 176.462 - 188.974 | wife-dark |
| wife-11 | 188.974 - 194.695 | wife-dark |
| garage-interior | 194.695 - 196.195 | garage |
| interior-door | 196.195 - 198.874 | garage |
| whistle-approach | 198.874 - 210.274 | garage -> living after 3.500s |
| living-silence | 210.274 - 213.774 | living |
| intruder-reveal | 213.774 - 214.474 | scare |
| signal-break | 214.474 - 215.324 | lost |
| wife-12 | 215.324 - 220.000 | lost |
| wife-13 | 220.000 - 228.673 | wife-dark |
| escape-running | 228.673 - 233.673 | lost |
| escape-slam | 233.673 - 235.043 | lost |
| escape-settle | 235.043 - 237.543 | living |
| wife-14 | 237.543 - 244.465 | wife-dark |
| quiet-after-escape | 244.465 - 246.465 | wife-dark |
| wife-15 | 246.465 - 252.264 | wife-dark |
| news-black | 252.264 - 254.264 | black |
| breaking-news | 254.264 - 316.744 | news |
| news-out | 316.744 - 318.244 | black |
| wife-16 | 318.244 - 369.888 | wife-return |
| ending | 369.888 - 372.888 | ending |

The unchanged 62.480-second Westman News video remains fullscreen/contained with its own audio, native playing/ended gates and no bed/sirens/narration over the anchor. Wife-15 remains before news; wife-16 remains after full news completion and black recovery. The arrest report and unexplained intruder implication are unchanged.

## State, refresh and cleanup

New finale runs persist polishVersion: 1. Unversioned stored runs resolve the exact original 41-cue timeline, retaining cue IDs/indexes, durations and server deadlines after refresh rather than being reinterpreted at new offsets. Explicit host checkpoints start the polished version without resetting players, prior chapters or puzzle reveals. Completed stored runs remain completed. Generation, run ID and monotonic parent sequence fences remain in force.

All native full recordings/news retain authenticated completion gates. Partial effects retain source-boundary handling. Garage/siren anchors remain persisted in the existing finale state; the news transition also records its anchor. Two siren slots reconstruct their correct source position and crossfade gain from that one clock. No new polling loops or independent animation/audio timers are added. Exit/reset/replay stops owned media, clears layers and disconnects/closes the whistle graph. Phones remain silent.

## Changed files

- chapter8-finale-timing.js: polished timeline, original 41-cue compatibility, measured title/warm-return constants.
- chapter8-presentation.js: shared wife mood/title and ambience policies.
- chapter8-audio.js: continuous bed, ducking, strict silence/news guards.
- chapter8-finale.js and chapter8.css: wife screen/microphone/waveform, lighting, real title, breach overlay.
- chapter8-sound-design.js: phase-independent crossfaded siren windows through news transition.
- api/_chapter8-finale.js: version-aware progression and persisted transition anchor; Redis transport/auth unchanged.
- Chapter 8 audio/view/timeline/pacing/sound tests and scripts/verify-chapter8-finale-browser.mjs.
- This document. All source assets and Chapters 1-7 remain unchanged.

## Local preview

Run npm run dev, open http://127.0.0.1:3000/tv, press Ctrl+Shift+C, authenticate and select CHAPTER 8 - FINAL CINEMATIC. The isolated local server uses in-memory state; no production game is touched. Existing EMPTY ROOM / SCARE and FINAL NEWS checkpoints remain available. Use the full entry for all new alerts and audio continuity.

node scripts/verify-chapter8-finale-browser.mjs exercises the full native sequence against the isolated-memory server, plus silent phone and refreshes during narration, silence, sirens and news. It checks title/microphone, grid doorbells, breach, all effects, crossfade overlap, continued sirens through wife-15, full news completion and final narration. Screenshots/reports are ignored under logs/.

## Validation results

- Chapter 8: 60/60 passed. Combined Chapter 7/8 regressions: 149/149 passed.
- Full suite: 617 passed and 16 failed (633 total). The same sixteen historical TV-mock failures were reproduced against unchanged HEAD and compared by exact test name; no new failures or rewritten historical fixtures.
- Production build passed: 233 files, browser/API syntax and dependencies checked. All supplied media hashes still match the existing manifest. No source asset changed.
- Full native browser rehearsal passed all 57 cues, all sixteen complete full-volume wife clips in order, three correctly placed notification playbacks, both grid doorbells, the breach overlay, one continuous whistle, exactly 3500 persisted silent milliseconds, one scare and full 62.480-second news followed by wife-16. The measured gap from the end of the first notification to the start of the second was 1224 ms.
- Refreshes during wife-06, silent hold, sirens/wife-14 and news restored the current phase and clocks. Crossfade overlap was observed, sirens remained audible under wife-15, player identities stayed intact and phone audio count was zero. Browser exceptions: zero.
- Visual review caught and corrected the shared narrator stylesheet overriding the initial wife palette. Actual computed styles and a fresh isolated render confirmed the intended purple/pink/blue/gold screen and pink waveform. Warm title, cold return and red breach screenshots are under ignored logs/.
- git diff --check passed. No commit, push, deployment, production requests, production game changes, Redis/configuration changes or environment edits were performed.

## Remaining limitations

The existing sixteen unrelated TV-mock failures remain. Browser audio activation, background-tab suspension and device buffering remain platform limits. Keep the TV foregrounded and use the existing audio recovery if blocked. The visualizer follows native speaking state rather than microphone capture. Legacy active runs intentionally retain their original cue sequence; use an authenticated checkpoint to review this polished cut. Actual party-speaker mix review is still recommended.
