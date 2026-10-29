# Chapter 8 - targeted rehearsal corrections

## Review status

Production baseline: 62bf4a7. This revision on fix/chapter8-rehearsal-polish is reviewed and approved for release through the existing GitHub main / Vercel production workflow. Deployment readiness is verified separately. Supplied media, game data, host authorization, earlier chapters and future Collector/webcam work are preserved. The only shared change is backward-compatible narrator CSS selector reuse with original husband color defaults.

## Actual narration and asset mapping (inspected before editing)

The first generic reaction never says driveway or front door. Inspection confirmed that the previous first alert and the doorbell both mapped to ch8_cam04_front_porc.png, the close image beside the doorbell (grid bottom middle). After viewing the actual asset choices, the user explicitly confirmed: use ch8_cam01_driveway.png first, retaining the porch image for doorbells. The corrected first zoom selects the grid's top-middle driveway tile and the actual distant-intruder photograph. It is labeled DRIVEWAY, not silently renamed FRONT PORCH. No image is fabricated or modified.

| Recording | Measured full duration | Recorded content / mapped visual |
| --- | --- | --- |
| wife-01 | 28.682 s | Playful return / husband's existing narrator component, warm wife palette |
| wife-02 | 8.986 s | The Great Halloween Party Rescue / same narrator component and preserved title reveal |
| wife-03 | 6.426 s | Promises no creepy happenings / same narrator component |
| wife-04 | 12.434 s | Camera notifications, I think you should see this / introduces the grid; not assigned to an individual camera |
| wife-05 | 11.886 s | First distant-intruder reaction / DRIVEWAY (user-confirmed asset) |
| wife-06 | 16.274 s | Another notification; moving around the side of the house / SIDE PASSAGE |
| wife-07 | 12.121 s | He's in the backyard now / BACKYARD |
| wife-08 | 10.998 s | That's the doorbell camera; don't open the door / FRONT DOOR, same front-porch photograph |
| wife-09 | 12.121 s | He's inside, in the garage; calling police / GARAGE |
| wife-10 | 12.513 s | Police on their way; hears movement, coming upstairs / EMPTY LIVING ROOM, the requested interior feed; it does not name a camera |
| wife-11 | 5.721 s | Where is he? Keep lights off, nobody move / same EMPTY LIVING ROOM |
| wife-12 | 4.676 s | “He's coming for you. You have to hide. Right now!” / EMPTY LIVING ROOM, BEFORE silence and scare |
| wife-13 | 8.673 s | Sirens/police approaching / existing narrator component, muted wife palette |
| wife-14 | 6.922 s | Think he's gone; is everyone okay / same muted narrator presentation |
| wife-15 | 5.799 s | Introduces emergency broadcast / before the full news video |
| wife-16 | 51.644 s | Full apology, reassurance, jokes and Happy Halloween / after native news completion |

Wife-10 refers to hearing movement upstairs, not an upstairs-camera image. No upstairs feed exists or is invented; the visibly empty interior feed stays on screen. All clips play completely and in their original numeric order. Duration values above are rounded only for reading; canonical gates retain the full measured precision.

## Corrected choreography

Each driveway/side/backyard visit is GRID -> ordinary MOTION DETECTED + full notification sound -> 700-ms registration -> 1.400-second zoom from the correct grid tile -> corresponding full wife recording over the individual image -> 2.500-second same-image hold -> 1.400-second zoom out -> 2.500-second grid pause. No new notification starts while a previous feed is open. The normal alert uses the CCTV label, not the red breach panel.

The first doorbell plays on the grid. Its completion immediately starts the 1.400-second front-door opening transition; wife-08 starts as the individual feed is fully visible, with no extra grid/reaction pause and no wife presentation cutaway. The second full doorbell then plays on that same open front-door image after her complete warning. The feed remains open for another 2.500 seconds, zooms out and holds the grid 2.500 seconds. No grid or wife-screen cut separates the two rings.

The red SECURITY BREACH panel stays on the grid for the alarm lead, complete automated announcement with existing ducking, and release fade. Only then does the garage open. Wife-09 plays over the garage photograph for its complete native recording. Its 2.500-second post-recording hold, zoom out and 2.500-second grid pause precede the interior door sound and living-room opening. Wife-10 and wife-11 stay on the empty living-room feed throughout, followed by the original uninterrupted approaching whistle. Then the complete 4.675918-second wife-12 warning plays over that empty room. Its native ended event advances into an image-ready, persisted 5.000-second genuinely silent hold. One 2.000-second scare follows, then the existing SIGNAL LOST. No siren starts before wife-13.

The first doorbell has a visual opening transition before the first spoken word because camera-specific speech must never begin while the grid remains the primary view. There is no arbitrary additional delay. All source media is preloaded, and every camera-open transition is armed only after the requested image is decoded/visible-ready on an authenticated TV. Late media cannot skip the first words.

## Zoom and audio synchronization

The actual grid is 1774 x 887 (2:1), with three columns and two rows. Tile coordinates are image-relative percentages: DRIVEWAY = top middle; FRONT DOOR/DOORBELL = bottom middle, SIDE = top left, BACKYARD = top right, GARAGE = bottom right, LIVING ROOM = bottom left. One pure cameraFrame resolver samples the existing TV scheduler. It centers the selected tile, calculates the correct aspect-preserving zoom for the viewport, and blends to the unchanged contained feed only near the end. The return is the exact reverse. No replacement photographs, arbitrary camera timers or separate RAFs are introduced.

Camera-specific native audio cannot start until its image has decoded. Zooms have persisted server deadlines armed through the existing generation/run/sequence-fenced host acknowledgment. Once speech begins, the cue remains fixed until native ended passes the full measured server duration gate. The post-narration cue retains the same image at opacity 1; there is no new fade-to-black or camera change at that boundary.

The 1.600-second takeover fades out existing background MUSIC completely before wife-01 starts. It pauses after that fade and never restarts during any camera, wife return, news or ending. Intentional notifications, doorbells, breach/voice, door, whistle, sting, running, slam and police sirens remain independent and intact. The existing two-slot crossfaded sirens still begin with wife-13 and continue until the two-second pre-news fade; no siren overlaps the anchor.

## Exactly reused narrator screen

narrator-screen.js instantiates the actual #chapter5-radio DOM from the husband's established screen, including its vintage microphone SVG, grille/metal geometry, broadcast labels/frequency, original waveform bars and existing broadcast-wave CSS animation. It samples the same paused animation through the scheduler's negative --handoff-delay. No new microphone drawing, decorative lighting system, pulse engine or waveform keyframes are created. SVG definition IDs are namespaced only on the clone; the husband's DOM and computed appearance are unchanged. The existing CSS rule bodies now also target .brookwood-narrator; background color variables retain the exact original husband defaults. The Chapter 8 recreation of the gradient, scanlines and responsive title layout is removed. A theme parameter changes colors only. Explicit presentation layering prevents CCTV overlays from covering the wife.

Only the wife's palette is overridden: slightly lighter lavender/blue initially, darker muted colors on later appearances. Layout, microphone dimensions, typography, scanline treatment, responsive positions and animation are the existing broadcast design. The game title remains source-synchronized at wife-02 offsets 1.460-8.100 seconds with its brief fade. Wife-16 starts muted and returns to warm colors only after the recorded relaxation line at 14.800 seconds. Reduced-motion support remains.

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
| impact | ch6_sfx_scream.mp3 | 3.312 | 0.200 - 2.150 for fresh version-3 runs |
| doorbell | assets/chapter4/audio/doorbell.mp3 | 3.024 | 0.000 - 3.024, twice |

No requested asset is missing or format-unusable. The reused Chapter 6 sound is a scream/sting: its 0.200-2.150-second excerpt plays at 80% for fresh version-3 runs, fading over the last 100 ms. This increases only the sting from the former 24% (about +10.46 dB), never above unity; source bytes and other audio gains remain untouched. Older stored cuts retain the former excerpt and gain. Earlier chapters and that file are unchanged. Running/slam peaks approach full scale, so playback is attenuated rather than destructively normalized. A human rehearsal on the actual party speakers is recommended.



## Complete corrected timeline

63 cues; nominal runtime 382.588 seconds = 6 minutes 22.588 seconds. Production baseline: 379.788 seconds. Added nominal time: 2.800 seconds (silence +1.500 s, scare +1.300 s). Moving wife-12 preserves its complete duration. Native loading, acknowledgments and polling can extend actual playback.

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
| wife-12 | 217.174 - 221.850 | living |
| living-silence | 221.850 - 226.850 | living |
| intruder-reveal | 226.850 - 228.850 | scare |
| signal-break | 228.850 - 229.700 | lost |
| wife-13 | 229.700 - 238.373 | wife-dark |
| escape-running | 238.373 - 243.373 | lost |
| escape-slam | 243.373 - 244.743 | lost |
| escape-settle | 244.743 - 247.243 | living |
| wife-14 | 247.243 - 254.165 | wife-dark |
| quiet-after-escape | 254.165 - 256.165 | wife-dark |
| wife-15 | 256.165 - 261.964 | wife-dark |
| news-black | 261.964 - 263.964 | black |
| breaking-news | 263.964 - 326.444 | news |
| news-out | 326.444 - 327.944 | black |
| wife-16 | 327.944 - 379.588 | wife-return |
| ending | 379.588 - 382.588 | ending |

## Validation for this revision

- Chapter 8: 73/73 passed. Chapter 7/8 regression tests: 162/162 passed.
- Full suite: 630 passed, 16 failed (646 total). The failing names match the existing 16 client.test.js TV mock failures on the baseline; no new failures. The unchanged mock lacks chapter7Checkpoints/document.body.
- Production build: passed, 235 static files; API syntax verified.
- Actual Chrome viewport checks: wife background and microphone render at 1920x1080, 1280x720 and 1024x768. All measured husband computed styles match the baseline stylesheet at all three sizes.
- Full native Chrome TV/phone rehearsal: PASS, all 63 cues, all 16 complete recordings at full voice volume, silent phone and preserved 12 participants. First reaction used the actual driveway asset; side/backyard and post-backyard doorbells retained their synchronization. Five refresh checks passed: opening zoom, side narration, silent room, sirens and native news playback.
- The native wife-12 ended event precedes the full 5.000-second silent hold. One 2.000-second masked reveal and stronger sting precede SIGNAL LOST. Sirens continue until the pre-news fade; the 62.480-second news reaches native ended before wife-16. The final recording and ending complete normally, with no runtime exceptions.
- All supplied media hashes are unchanged. No production data, sessions, Redis configuration or environment variables are changed.

The prior gradient/scanline recreation is removed. Both narrator instances use the established background/effect CSS rule bodies, with original husband color defaults and a wife palette parameter. The original SVG geometry, typography, microphone positions, responsive rules, paused waveform keyframes and scheduler-sampled animation remain shared. Explicit wife stacking keeps CCTV layers behind her presentation. No independent animation clock or new narrator artwork exists.

The stronger sting uses the existing scream file's 0.200-2.150-second excerpt at 80%, compared with the former 24%/0.650-second excerpt. A 100-ms tail fade ends 50 ms before the image disappears. This is approximately +10.46 dB relative to the prior playback gain, without gain above unity or source-file processing. Narration and every other effect retain their existing volume.

## Preview and compatibility

Run npm run dev, open local /tv, use Ctrl+Shift+C, authenticate and select CHAPTER 8 - FINAL CINEMATIC. A fresh checkpoint selects polishVersion 3. Existing unversioned/version-1/version-2 runs retain their saved cue mapping, hold lengths and sting behavior on refresh; no migration or reset is performed. All 17 puzzle clues, synchronization, host authentication and player data are preserved.

Normal browser audio activation and buffering limitations remain. Actual party-speaker loudness should be checked during local rehearsal. Local validation completed before release authorization; production status is verified separately after deployment.
