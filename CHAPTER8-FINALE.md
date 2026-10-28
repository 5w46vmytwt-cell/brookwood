# Chapter 8 - narration-driven camera correction

## Review status

Production baseline: 3c94c8e. This correction on fix/chapter8-camera-sequencing has been reviewed and approved for release through the existing GitHub main / Vercel production workflow. Production readiness is verified separately after deployment. All supplied recordings, effects, images, news bytes, original narrative order, player sessions, puzzle state, host authentication, Redis transport/configuration and environment variables are preserved. Chapters 1-7 and future Collector/webcam work are untouched.

## Actual narration and asset mapping (inspected before editing)

The first generic reaction never says driveway or front door. The requested FRONT DOOR is represented by the supplied front-porch/doorbell photograph, whose exact filename is ch8_cam04_front_porc.png. The supplied grid labels this tile CAM 05 - FRONT PORCH (bottom middle). The former driveway image remains unchanged and is still part of the supplied grid; it is not silently relabeled as a front door. No new image is fabricated.

| Recording | Measured full duration | Recorded content / mapped visual |
| --- | --- | --- |
| wife-01 | 28.682 s | Playful return / husband's existing narrator component, warm wife palette |
| wife-02 | 8.986 s | The Great Halloween Party Rescue / same narrator component and preserved title reveal |
| wife-03 | 6.426 s | Promises no creepy happenings / same narrator component |
| wife-04 | 12.434 s | Camera notifications, I think you should see this / introduces the grid; not assigned to an individual camera |
| wife-05 | 11.886 s | Who's that? Is this a prank? Looking at the camera / FRONT DOOR (existing front-porch photograph); no location named in this recording |
| wife-06 | 16.274 s | Another notification; moving around the side of the house / SIDE PASSAGE |
| wife-07 | 12.121 s | He's in the backyard now / BACKYARD |
| wife-08 | 10.998 s | That's the doorbell camera; don't open the door / FRONT DOOR, same front-porch photograph |
| wife-09 | 12.121 s | He's inside, in the garage; calling police / GARAGE |
| wife-10 | 12.513 s | Police on their way; hears movement, coming upstairs / EMPTY LIVING ROOM, the requested interior feed; it does not name a camera |
| wife-11 | 5.721 s | Where is he? Keep lights off, nobody move / same EMPTY LIVING ROOM |
| wife-12 | 4.676 s | Warning to hide / existing SIGNAL LOST after the one scare |
| wife-13 | 8.673 s | Sirens/police approaching / existing narrator component, muted wife palette |
| wife-14 | 6.922 s | Think he's gone; is everyone okay / same muted narrator presentation |
| wife-15 | 5.799 s | Introduces emergency broadcast / before the full news video |
| wife-16 | 51.644 s | Full apology, reassurance, jokes and Happy Halloween / after native news completion |

Wife-10 refers to hearing movement upstairs, not an upstairs-camera image. No upstairs feed exists or is invented; the visibly empty interior feed stays on screen. All clips play completely and in their original numeric order. Duration values above are rounded only for reading; canonical gates retain the full measured precision.

## Corrected choreography

Each front/side/backyard visit is GRID -> ordinary MOTION DETECTED + full notification sound -> 700-ms registration -> 1.400-second zoom from the correct grid tile -> corresponding full wife recording over the individual image -> 2.500-second same-image hold -> 1.400-second zoom out -> 2.500-second grid pause. No new notification starts while a previous feed is open. The normal alert uses the CCTV label, not the red breach panel.

The first doorbell plays on the grid. Its completion immediately starts the 1.400-second front-door opening transition; wife-08 starts as the individual feed is fully visible, with no extra grid/reaction pause and no wife presentation cutaway. The second full doorbell then plays on that same open front-door image after her complete warning. The feed remains open for another 2.500 seconds, zooms out and holds the grid 2.500 seconds. No grid or wife-screen cut separates the two rings.

The red SECURITY BREACH panel stays on the grid for the alarm lead, complete automated announcement with existing ducking, and release fade. Only then does the garage open. Wife-09 plays over the garage photograph for its complete native recording. Its 2.500-second post-recording hold, zoom out and 2.500-second grid pause precede the interior door sound and living-room opening. Wife-10 and wife-11 stay on the empty living-room feed throughout, followed by the original uninterrupted approaching whistle, 3.500-second silence, one prepared scare/sting and SIGNAL LOST.

The first doorbell has a visual opening transition before the first spoken word because camera-specific speech must never begin while the grid remains the primary view. There is no arbitrary additional delay. All source media is preloaded, and every camera-open transition is armed only after the requested image is decoded/visible-ready on an authenticated TV. Late media cannot skip the first words.

## Zoom and audio synchronization

The actual grid is 1774 x 887 (2:1), with three columns and two rows. Tile coordinates are image-relative percentages: FRONT DOOR = bottom middle, SIDE = top left, BACKYARD = top right, GARAGE = bottom right, LIVING ROOM = bottom left. One pure cameraFrame resolver samples the existing TV scheduler. It centers the selected tile, calculates the correct aspect-preserving zoom for the viewport, and blends to the unchanged contained feed only near the end. The return is the exact reverse. No replacement photographs, arbitrary camera timers or separate RAFs are introduced.

Camera-specific native audio cannot start until its image has decoded. Zooms have persisted server deadlines armed through the existing generation/run/sequence-fenced host acknowledgment. Once speech begins, the cue remains fixed until native ended passes the full measured server duration gate. The post-narration cue retains the same image at opacity 1; there is no new fade-to-black or camera change at that boundary.

The 1.600-second takeover fades out existing background MUSIC completely before wife-01 starts. It pauses after that fade and never restarts during any camera, wife return, news or ending. Intentional notifications, doorbells, breach/voice, door, whistle, sting, running, slam and police sirens remain independent and intact. The existing two-slot crossfaded sirens still begin with wife-13 and continue until the two-second pre-news fade; no siren overlaps the anchor.

## Exactly reused narrator screen

narrator-screen.js clones the actual #chapter5-radio DOM from the husband's established screen, including its vintage microphone SVG, grille/metal geometry, broadcast labels/frequency, original waveform bars and existing broadcast-wave CSS animation. It samples the same paused animation through the scheduler's negative --handoff-delay. No new microphone drawing, decorative lighting system, pulse engine or waveform keyframes are created. SVG definition IDs are namespaced only on the clone; the husband's DOM, colors and styles are unchanged.

Only the wife's palette is overridden: soft lavender/pink/light blue initially, darker muted colors on later appearances. Layout, microphone dimensions, typography, scanline treatment, responsive positions and animation are the existing broadcast design. The game title remains source-synchronized at wife-02 offsets 1.460-8.100 seconds with its brief fade. Wife-16 starts muted and returns to warm colors only after the recorded relaxation line at 14.800 seconds. Reduced-motion support remains.

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



## Complete corrected timeline

63 cues; nominal runtime 379.788 seconds = 6 minutes 19.788 seconds. Previous production cut: 372.888 seconds. Added nominal time: 6.900 seconds. No recording is shortened; loading, native media stalls, acknowledgments and polling can extend actual playback.

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
| front-open | 63.225 - 64.625 | in / front |
| wife-05 | 64.625 - 76.511 | front |
| front-hold | 76.511 - 79.011 | front |
| front-close | 79.011 - 80.411 | out / front |
| front-grid-pause | 80.411 - 82.911 | grid |
| side-motion | 82.911 - 84.807 | grid |
| side-alert-register | 84.807 - 85.507 | grid |
| side-open | 85.507 - 86.907 | in / side |
| wife-06 | 86.907 - 103.181 | side |
| side-hold | 103.181 - 105.681 | side |
| side-close | 105.681 - 107.081 | out / side |
| side-grid-pause | 107.081 - 109.581 | grid |
| backyard-motion | 109.581 - 111.477 | grid |
| backyard-alert-register | 111.477 - 112.177 | grid |
| backyard-open | 112.177 - 113.577 | in / backyard |
| wife-07 | 113.577 - 125.698 | backyard |
| backyard-hold | 125.698 - 128.198 | backyard |
| backyard-close | 128.198 - 129.598 | out / backyard |
| backyard-grid-pause | 129.598 - 132.098 | grid |
| doorbell-before | 132.098 - 135.122 | grid |
| doorbell-open | 135.122 - 136.522 | in / front |
| wife-08 | 136.522 - 147.519 | front |
| doorbell-after | 147.519 - 150.543 | front |
| doorbell-hold | 150.543 - 153.043 | front |
| doorbell-close | 153.043 - 154.443 | out / front |
| doorbell-grid-pause | 154.443 - 156.943 | grid |
| garage-alarm-lead | 156.943 - 157.943 | grid |
| garage-announcement | 157.943 - 162.541 | grid |
| garage-alarm-release | 162.541 - 163.541 | grid |
| garage-open | 163.541 - 164.941 | in / garage |
| wife-09 | 164.941 - 177.062 | garage |
| garage-hold | 177.062 - 179.562 | garage |
| garage-close | 179.562 - 180.962 | out / garage |
| garage-grid-pause | 180.962 - 183.462 | grid |
| interior-door | 183.462 - 186.141 | grid |
| living-open | 186.141 - 187.541 | in / living |
| wife-10 | 187.541 - 200.053 | living |
| wife-11 | 200.053 - 205.774 | living |
| whistle-approach | 205.774 - 217.174 | living |
| living-silence | 217.174 - 220.674 | living |
| intruder-reveal | 220.674 - 221.374 | scare |
| signal-break | 221.374 - 222.224 | lost |
| wife-12 | 222.224 - 226.900 | lost |
| wife-13 | 226.900 - 235.573 | wife-dark |
| escape-running | 235.573 - 240.573 | lost |
| escape-slam | 240.573 - 241.943 | lost |
| escape-settle | 241.943 - 244.443 | living |
| wife-14 | 244.443 - 251.365 | wife-dark |
| quiet-after-escape | 251.365 - 253.365 | wife-dark |
| wife-15 | 253.365 - 259.164 | wife-dark |
| news-black | 259.164 - 261.164 | black |
| breaking-news | 261.164 - 323.644 | news |
| news-out | 323.644 - 325.144 | black |
| wife-16 | 325.144 - 376.788 | wife-return |
| ending | 376.788 - 379.788 | ending |

The 62.480-second news still runs to its native ended event with embedded audio. Wife-15 remains before it; wife-16 remains afterward. The lone school-construction-site arrest and unexplained intruder implication are unchanged.

## Compatibility and validation

New runs persist polishVersion: 2. Unversioned 41-cue and version-1 57-cue runs retain their original ordered cue arrays, indices and deadlines across refresh; no production state is migrated or reset. Explicit authenticated Chapter 8 checkpoints start the corrected version without resetting player identities, earlier chapters or puzzle reveals. Completed stored runs remain complete. One Player owns preloaded media IDs shared across all compatible timelines, and all timers/visual updates remain on the existing TV scheduler.

Browser autoplay still needs the existing activated host session/audio-unlock gesture. Real speaker/TV review is recommended. The supplied grid contains baked-in date/labels; those image bytes remain untouched. No upstairs view is supplied. The first front-door feed is explicitly the provided FRONT PORCH tile rather than a new or mislabeled driveway image.

### Final local validation

- Chapter 8 focused tests: 69/69 passed. Chapter 7/8 regressions: 158/158 passed.
- Full suite: 626 passed, 16 failed (642 total). All sixteen failing test names exactly match the unchanged production-baseline TV mock failures; no new regressions or rewritten historical fixtures.
- Production build passed: 235 static files, browser/API syntax and imports checked. Source media hashes still match the unchanged manifest.
- Full native Chrome rehearsal passed all 63 cues and all sixteen complete full-volume wife clips. At native playing AND ended events, wife-05/06/07/08/09/10/11 had the correct visible image at opacity 1. All three motion sounds began on the grid. Doorbell views were grid, then front door; no intermediate grid return. No spoken recordings overlapped.
- Native whistle playback occurred once, entirely on the empty living-room feed. The 3500-ms silent deadline survived refresh, the prepared scare/sting occurred once, sirens continued to the pre-news fade, news finished natively at 62.480 seconds and wife-16 completed afterward. Twelve participant identities were preserved, phones created zero audio and browser exceptions were zero.
- Five refresh recoveries passed: camera zoom, wife-06, silence, sirens and news. Decoded-image gates did not reset or skip narration.
- Live DOM inspection confirmed identical husband/wife microphone shape geometry and 0 0 200 320 viewBox, the same broadcast-wave animation, and the husband's original #403737 source gradient stop unchanged. The wife title screenshot confirms the actual shared layout and palette.
- Dedicated real-image zoom previews at 0, 700 and 1400 ms confirmed the FRONT PORCH grid tile, aspect-preserving framing and full individual feed. Layer order explicitly places the full feed above the transformed grid and below the restrained interference/UI.
- git diff --check passed. No commit, push, deployment, production game request, Redis reset/configuration change or environment-file edit was performed. The unrelated untracked Chapter 1 narration remains untouched.

Remaining limitations: sixteen existing unrelated TV mock failures, normal browser audio activation/buffering limits, source photographs' baked-in labels/date, and actual-speaker review. A fresh authenticated Chapter 8 checkpoint selects version 2; refreshing an already active version-1 run intentionally preserves its previous cut.

## Changed files and preview

- chapter8-finale-timing.js: narration-driven visit sequences and version-2 compatibility.
- chapter8-camera.js: deterministic aspect-preserving forward/reverse grid zoom.
- narrator-screen.js: clone/controller for the actual established narrator component.
- chapter8-finale.js, chapter8.css, chapter8-presentation.js and chapter8-audio.js: correct images/readiness, shared presentation, palette-only styling and music fade/stop.
- api/_chapter8-finale.js: readiness gate extension and version-aware clocks; Redis transport/auth unchanged.
- chapter8-sound-design.js: preserve crossfaded sirens for version 2.
- Focused Chapter 8 camera/audio/view/legacy tests and the existing local browser harness.
- This document. Assets and Chapters 1-7 are unchanged.

Run npm run dev, open local /tv, Ctrl+Shift+C, authenticate and choose CHAPTER 8 - FINAL CINEMATIC. Use a fresh checkpoint for version 2; refreshing a previously active version-1 run intentionally keeps that saved cut. The existing direct scare and news entries remain available. The local rehearsal server uses isolated in-memory state and never contacts production Redis. No commit, push or deployment has been performed for this revision.
