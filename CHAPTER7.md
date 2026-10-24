# Chapter 7 — THE THREE THEORIES & THE EVIDENCE

## Final window handoff — local, pending review

New scene entries use `polishVersion: 5`. After the complete photograph narration, the final static hold changes from 12000 ms to 10500 ms (1500 ms shorter). The following smooth visual fade changes from 1600 ms to 1500 ms. The photograph/window zoom formulas, enhanced-window cue at narration offset 34300 ms and supplied narration are unchanged. Persisted legacy scenes retain their stored deadlines; no active phase is shortened mid-refresh.

After the fade completes, the same server-authoritative progress transaction marks Chapter 7 complete and enters (or resumes) Chapter 8. No host click, player reset, vote change or environment change is involved. Refresh/multiple TVs cannot create duplicate Chapter 8 runs. The existing final-window checkpoint is labelled FINAL WINDOW ZOOM; AFTER FINAL WINDOW ZOOM enters the post-narration hold using the same host authentication and explicit test-outcome safeguards. The user approved release through the existing feature branch ? main ? Vercel workflow. Preserve live Redis, environment variables, host authentication and media; production verification must be read-only.

## Envelope audio and photo separation (2026-10-21)

New scenes use `polishVersion: 4`; an already active legacy incoming poll retains its prior completion contract. Only `vote-intro` targets 6% ambience, returning smoothly to the usual 7% afterward on the same loop. Narration remains at full supplied volume.

After the preserved verdict blackout, `incoming` plays the existing 2450-ms ring, `ring-gap` holds 450 ms, and `incoming-second` plays it again. These phases show only INCOMING MESSAGE! and expose no active retrieval ballot. Native completion then enters `envelope-instructions`, playing unchanged `ch7_10_envelope_instructions.wav` in full (22.450 s; 538800 float PCM samples at 24 kHz; SHA-256 `48a6d289b755ed2e77e08ff005b987adfa0da298347271e361b7a5768a3954ad`). Only its native completion opens the persistent retrieval poll. Existing cast identities, prior retriever exclusions and host authorization remain intact. Refresh seeks the current ring or narration, without replaying earlier phases.

After authenticated return, `photo-appearance` waits for the original image to load, plays the existing 255.238-ms camera effect at its existing volume and persists its native start. `photo-delay` remains visible until at least that start plus 1500 ms, including refresh before the effect ends. Then the unchanged photo narration starts at offset zero. Refresh skips an already-started camera effect; the enhanced-window cue remains relative to narration at 34300 ms. Focused validation: 74 Chapter 7 tests passed, one production build passed (186 static files), and a built-TV/two-phone rehearsal completed both twelve-player polls with ten host-assigned simulated votes, native double ringing, full instructions, refreshes during instructions/voting/photo delay, one camera effect and the full synchronized photo reveal. No runtime exceptions occurred.

## Restored second narrator sequence (2026-10-21)

This supersedes the ordering and narrator branding introduced in `ea9971f`. That change placed Theory 01 before the existing second narration and assigned its scene podcast branding. Correct order: native complete narrator return ? date zoom ? complete `ch7_02_podcast_intro.wav` (27.550 s) on the original THREE THEORIES narrator scene ? Theory 01 transition ? THE UNSEEN possession recording. Native acknowledgments remain required; refresh restores the persisted scene and seeks only within its current recording.

The same ambience element continues at 7% through both narrators, the date and Theory 01; only the final 1200 ms of the Theory 01 transition fades it to silence before the actual podcast. Foreground recordings, logos and later transitions remain unchanged. Focused validation: 68 Chapter 7 tests passed; one production build passed (185 static files). Native-speed isolated browser validation completed both full narrators (33.400 s and 27.550 s), date refresh recovery, Theory 01 and the first podcast, with continuous 7% ambience until its final fade and zero runtime exceptions.

## Theory 01 and ambience level (2026-10-20)

Investigation ambience now targets 7% through the existing single constant; fades, exclusions and foreground audio levels are unchanged. The date reveal now leads to `theory1-transition`, using the same nine-second title/fade renderer as Theories 02/03, then the preserved podcast introduction recording with THE UNSEEN branding. No recording starts during the title transition. Focused validation passed 11 ambience tests and two Theory 01 state/view tests.

## Supplied connection recovery and deferred date (2026-10-20)

This supersedes the earlier silent recovery and date-during-narration notes below. New investigation scenes use `polishVersion: 3`. The unchanged `ch7_connection_recovery.mp3` contains 140544 samples at 44100 Hz (3186.939 ms; SHA-256 `93d13ebe50495e0c200f29a2f2b54e2cf5587f291921407682c27527c8a7c296`). A single Web Audio sample-clock source loops the decoded file exactly twice (6373.878 ms), through the existing investigation audio controller and authenticated native playback acknowledgments. Refresh reconstructs the remaining position; autoplay refusal uses the existing resume gesture. No narration or effect gains are faded.

Enlarged analog interference follows the source position across both copies. Native completion enters persisted `connection-black` for at least 1000 ms with no ambience, then starts the full-volume narrator. Only the complete narrator's native end enters the separate 6500-ms `date-reveal`, with OCTOBER 31 / 1996 and a restrained year zoom; the podcast introduction follows. Existing silent connection states upgrade to the new native gate, without replaying the news. Host test controls stay hidden during cinematic scenes and remain available at voting/retrieval checkpoints.

Local validation: 80/80 focused Chapter 7 tests passed, including sample-clock looping, refresh reconstruction, autoplay/retry, server phase gates, visual isolation and preserved transmission/voting behavior. One production build passed (185 static files). A native-speed isolated Chrome rehearsal passed both connection copies, synchronized interference, silent black hold, complete full-volume narrator, subsequent date reveal and hidden cinematic test controls with no runtime exceptions. Production verification is separate from these local checks.

## Investigation ambience (2026-10-20)

`chapter7-ambient.js` reuses the existing cinematic Player's synchronized looping track and the TV scheduler. `INVESTIGATION_AMBIENT_VOLUME` is the single volume setting (0.07); only this background fades, over 1200 ms. One element survives investigation scene changes, seeks to the investigation clock modulo the decoded media duration after refresh, and retries blocked playback through the existing audio unlock action. A slow, blocked or failed background never gates narration or changes its volume.

The background plays during the original narrator's return/introduction, theory voting and verdict reveal, envelope voting/retrieval waiting, and both photograph views. Podcasts, their transitions, recovered radio/prophecy and connection recovery are excluded. The introduction fades the background before the first podcast; the verdict fade reaches zero before the completely silent black and phone ring. The ending fades to zero before completion. No Chapter 6 engine or soundtrack behavior changes.

The supplied MP3 is preserved unchanged: 4,638,720 bytes, stereo 48 kHz, 6,958,080 MPEG samples / 144960 ms; SHA-256 `4251eb6f0ca9892bdf86ad70f216163e145bc7bb90579ae8a0c2725e6588a1d1`. Focused validation: `node --test tests/chapter7-ambient.test.js tests/chapter7-story-audio.test.js` passed 21/21 tests. The existing synchronized engine is exercised directly, including looping, fades, exclusions, refresh, delayed readiness, autoplay, pending playback and narration isolation. Production build and deployment are verified separately for this release.

## Final cinematic and voting fixes (2026-10-20)

New runs, checkpoints and subsequent scene entries use `polishVersion: 2`; an already active scene finishes under its existing clock contract. After the preserved broadcast blackout, a 2800-ms persisted black recovery beat shows a faint analog signal line. No standalone connection-recovery sound exists in the supplied assets; this beat is intentionally quiet rather than borrowing speech or an unrelated effect. The existing camera shutter is available and reused unchanged at its existing 55% level (255.238 ms).

The narrator's initial “Hey there, can everyone hear me?” measures 230–2050 ms in the unchanged WAV. The date appears from 2200 ms, zooms the year from scale 1 to 1.25, fades out completely by 7400 ms, and the existing narrator screen fades in at 7800–9600 ms. All timing follows media position; narration stays continuous at full level. Podcast labels now use PODCAST: and the third is THE MISSING PIECE, retaining its logo and ACCOMPLICE theory. Version 2 visual fades use smoothstep easing and separated scenes; the theory transition structure is preserved with nine-second transitions (eleven seconds when returning to the narrator). No audio fade, gain or ducking change is introduced.

New police transmissions start the unchanged prophecy at officer position 50057.551 ms, exactly 1000 ms earlier than version 1, for a 1900-ms interference overlap. Active version 1 transmissions retain their stored timing contract. Refresh still reconstructs the same continuous radio scene.

The envelope failure was caused by `startInvestigation` hardcoding `testMode: false` even when the host-created simulated cast remained in `players`. Normal-mode candidates filtered out simulated players, leaving no candidates when the two real players were the earlier retrievers. The earlier rehearsal explicitly opted into test mode and therefore missed this natural-entry path. New investigations infer test mode from persisted simulated identities; checkpoints retain it for that cast. Existing affected sessions recover through the existing server progression capability: saved real elections remain untouched, separate test elections retain their ballots, and only unfinished test electorates/candidate lists gain the existing eligible participants. A stored empty fallback returns to the envelope poll without replaying the ring. Genuine empty groups retain authenticated host retrieval with an explanation. No participants or historical selections are fabricated.

The incoming screen remains through the ring and open poll. An early completed vote waits for native ring completion before its reveal. The photograph shutter is claimed atomically through the authenticated host API when the decoded original photograph is displayed; the persisted claim prevents another play after TV/phone refresh. It neither restarts nor attenuates narration, and the enhanced window keeps its original cue.

Local validation: 57 focused Chapter 7 tests passed, including natural test-cast entry, persisted fallback recovery through the API, ties/host closure, concurrent camera claims, deferred native radio playback and legacy clocks. One production build passed (181 static files). The TV/two-phone rehearsal verified connection/date/branding, then exposed a radio refresh queue edge case; after its focused fix it resumed at the radio scene and completed the theory vote, verdict, persistent envelope vote with all twelve identities, host return, one native camera sound with refresh suppression, full photograph/window reveal and final hold, and all twelve host checkpoints. No unintended audio overlaps or browser exceptions occurred. The corrected audio module was syntax-checked and copied into the existing build output; final browser files match source byte for byte. Production status must be verified independently after release.

## Cinematic polish (2026-10-19)

New investigations and explicit checkpoints persist `polishVersion: 1`. Narrator audio starts at full volume on black; only the picture fades in, from audio position 3500 to 6000 ms. The existing broadcast and blackout are unchanged.

The police files remain byte-identical: officer 51957.551 ms, prophecy 6864 ms. Inspection of the decoded ending and conservative allowance for the final radio call place the prophecy at officer position 51057.551 ms (900-ms overlap). Both use one persisted officer scene and the existing TV scheduler/Player; native prophecy completion gates the combined 57921.551-ms transmission. Refresh reconstructs either or both active recordings. Legacy in-flight officer scenes retain their original completion contract.

THE UNSEEN, COLD EVIDENCE and THE THIRTEENTH VOICE have centered inline SVG identities and restrained teal, steel and burgundy treatments. Theory 2/3 transitions last eight seconds: outgoing fade, black pause, approximately three-second title hold and incoming fade, followed by narration. The narrator return adds two seconds of black before THE INVESTIGATION CONTINUES. The private theory result retains its three-second headline, then eases the winning theory from scale 1 to 1.2 before fading to black. Chapter 7 no longer loads or plays a post-verdict scare. Legacy stored scare phases recover silently; Chapter 6 is unchanged.

The incoming ring opens the envelope poll immediately. Its message remains throughout voting, including after the effect ends and after refresh, until all ballots or authenticated CLOSE VOTING resolve it. Previous retrievers remain excluded as candidates and retain voting rights.

For simulated voting, use Ctrl+Shift+C, explicitly enable host test mode, and choose a non-voting Chapter 7 checkpoint. TEST: ADD TEN SIMULATED PLAYERS reuses the existing two-real-player fill safeguards without recreating earlier chapters. Then select either voting checkpoint in test mode. TEST: ASSIGN SIMULATED VOTES provides one assignment per simulated player; leave any uncast or distribute them across options to test different winners and ties. These authenticated actions preserve real phone ballots and never submit votes automatically. Both real players remain in the test electorate, so simulated ballots alone cannot complete it. Test candidates include simulated players while applying the same historical retrieval exclusions. Ballots persist in `testElections`, separate from actual `elections`; repeat completed test polls through checkpoints to archive and reopen them. No historical retriever or casting result is fabricated.

Local validation: 47 focused Chapter 7 tests and three existing shared test-fill checks passed. The single production build passed (181 static files). The TV/two-phone rehearsal with ten simulated voters passed both polls, static handoff and refresh, persistent incoming message and refresh, exclusions, native photograph narration/hold, all twelve authenticated checkpoints, and no unintended audio overlap or runtime exceptions. Two stale harness assertions were corrected; the envelope/photograph portion resumed on isolated memory rather than repeating the podcast sequence. Final browser files were checked byte for byte against the build output after targeted corrections. Production status must be independently verified after release; historical verification below describes the earlier implementation.

## Current extension (2026-10-19)

The original WESTMAN NEWS player and source MP4 remain unchanged in behavior. After native video completion and the existing 800-ms fade, the persisted broadcast stays `waiting` and its new `investigation` subtree begins the narrator. Existing phase-1 waiting states enter the investigation through the existing progress capability; no production data reset or migration is needed. Chapters 1–6 and their source media remain frozen.

### Supplied recordings

`node scripts/measure-chapter7-story.mjs --write` uses the existing RIFF/MPEG parsers to generate `chapter7-story-media.json` (format, samples and SHA-256) and `chapter7-recordings.js` (runtime cues). No source audio is edited. Actual asset names differ slightly from the requested logical names; all are matched and included, including the extra podcast introduction.

| Scene | Actual filename under `assets/chapter7/audio/` | Measured seconds |
| --- | --- | ---: |
| Narrator returns | ch7_01_narrator_returns.wav | 33.400 |
| Podcast introduction | ch7_02_podcast_intro.wav | 27.550 |
| Possession | ch7_03_possession.mp3 | 62.119184 |
| Police transmission | ch7_04a_police_officer.mp3 | 51.957551 |
| Prophecy | ch7_04b_prophecy_whisper.mp3 | 6.864 |
| Possession reaction | ch7_05_possession_reaction.mp3 | 40.986122 |
| Premeditation | ch7_06_premeditation.mp3 | 51.565714 |
| Accomplice | ch7_07_accomplice.mp3 | 58.514286 |
| Vote introduction | ch7_08_theory_vote_intro.wav | 47.175 |
| Photograph | ch7_09_photograph_revelation.wav | 41.575 |

The existing Chapter 6 scream and jump-scare image are reused unchanged; the picture lasts 900 ms while its full 3.312-second effect finishes on black. After another second of silence, the established Chapter 3 private-message vibration (2.450 seconds) accompanies the incoming envelope message. No new background music or audio distortion is layered over the supplied clips.

### Synchronization and elections

`api/_chapter7-story.js` owns scene transitions and elections inside `chapter7.investigation`. The existing Redis compare-and-set transaction, host cookie, generation fence, player credentials, phone poller, TV scheduler and cinematic audio Player are reused. Narration phases never auto-advance from a deadline: an authenticated native `playing` event establishes the actual playback clock, and `ended` authorizes the next scene after the measured duration gate. Delayed loading starts from the first word; refresh seeks within an active clip. Reconstructed expired effects are consumed silently. Scene sequence and investigation/broadcast IDs fence obsolete callbacks.

The winning real theory persists at `chapter7.investigation.elections.theory.winnerId`; the envelope retriever persists in `elections.envelope.winnerId`. Voter identities are real participants observed in the investigation within the preceding two minutes, with a conservative registered-real-player fallback if no phone has been observed. Each election freezes its electorate, stores immutable private ballots, waits for all ballots or authenticated CLOSE VOTING, and uses Chapter 6's existing deterministic hash ranking for ties. No individual choices or raw ballots are projected publicly. Phone presence writes are throttled to ten seconds and reads within that interval avoid a mutation transaction.

Envelope candidates exclude the persisted Chapter 4 machete retriever, Chapter 6 token retriever, and other recorded physical-retrieval IDs. These people can still vote. If no eligible candidate or voting group exists, the host explicitly takes the retrieval task. A selected player is revealed for 4.5 seconds, followed by indefinite waiting for authenticated CONFIRM ENVELOPE RETURNED. A return is never inferred from a timer.

The theory result uses an 800-ms voting fade, a three-second exclusive headline, a 1.5-second winner fade-in plus five-second hold, 1.2-second fade out and 3.5 seconds of silent black before the scare. These are presentation timings; narration lengths come only from measured media.

### Photograph and host checkpoints

The supplied PNGs are shown without modification or aspect-ratio distortion. Local speech recognition and audio-envelope alignment locate the farmhouse sentence at 29.730–31.770 seconds and “Look at the upstairs window” at 32.530–34.090 seconds in the photograph WAV. Attention begins at 29.730 seconds; enhancement starts at 34.300 seconds, using actual media position so buffering cannot reveal it early. The complete recording finishes before a further twelve-second enhanced-image hold and final fade to black. The figure's identity is not explained.

Ctrl+Shift+C adds all twelve requested investigation checkpoints alongside the existing broadcast checkpoints. Existing host sessions require no new PIN. Missing theory/retriever prerequisites require the host to explicitly enable separate test outcomes and choose a theory or eligible player; they are never fabricated as real results. Rehearsal elections live in `testElections`, with completed test ballots archived in `testHistory`. Real `elections`, previous chapters, cast roles and retrieval history remain intact during checkpoint navigation.

### Focused verification

```
node --test tests/chapter7.test.js tests/chapter7-story.test.js tests/chapter7-story-audio.test.js
node scripts/verify-chapter7-story-browser.mjs
npm run build
```

The current focused coverage passes 40/40 tests. The single local production build passed with 181 static files; supplied assets and browser modules were verified byte for byte against source. A final host-fallback checkpoint edge case and the exact-black CSS backdrop were checked with focused tests and syntax validation; no additional local build or full rehearsal was run. The local TV/two-phone rehearsal passed the full investigation flow, private ballots and refresh, prior-retriever exclusions, host return, all twelve cookie-authenticated checkpoints, silent phones, and zero audio overlap/runtime exceptions. Podcasts were sampled then sought to native completion for efficiency; the photograph recording and its final hold played at native speed. The enhanced image first became visible at 34.328 seconds. The harness uses isolated memory and never mutates production data. Phase-1 verification below is historical; its old indefinite waiting expectation is superseded by the new narrator handoff.

# Chapter 7, Phase 1 — WESTMAN NEWS (historical release)

This phase adds only the supplied fictional broadcast. Chapters 1–5 and Chapter 6 gameplay, recordings, effects, timers, scoring, cast and voting remain locked. Do not add later Chapter 7 content until requested.

## Supplied media

`assets/chapter7/ch7_breaking_news.mp4` is served unchanged through the existing static build. Inspection with `node scripts/measure-chapter7.mjs` finds:

- 51.202-second movie presentation (also confirmed by Chrome); video track 51.2 seconds, encoded audio track 51.223020833 seconds before its edit offset.
- 1280×720 H.264 Main (`avc1.4d401f`), stereo 48 kHz AAC audio; browser playback verifies embedded audio.
- 22,345,597 bytes, with front-loaded `moov` metadata.
- SHA-256 `5186fd97669cc33ce6a6842b2b4707358faf69de263cfae20607323d0b7b67ab`.

Do not replace, transcode or regenerate the source asset.

## State and handoff

The existing Recording 31 native-completion acknowledgment still completes Chapter 6. Only its completed state can enter Chapter 7 through `/api/progress`. The new blackout starts at this observed transition, rather than at an earlier narration metadata deadline, and lasts at least 3000 milliseconds. Chapter 6 narration/effects stop and its ambient music fades out during black. The TV runtime blocks all older soundtrack/unlock paths while Chapter 7 is active.

Chapter 7 persists `id`, `step`, `startedAt`, `playbackStartedAt`, `endedAt`, `completedAt` and `sequence` in the existing room state. Steps are `blackout` → `playing` → `fading` → `waiting`. The existing scheduler and polling loops drive presentation; no new poller or periodic playback writes are introduced.

The authenticated TV acknowledges `broadcast-playing` only from the media `playing` event after blackout and loading. Autoplay refusal leaves the clock unset and shows a host-only PLAY BROADCAST gesture control. Media acknowledgments use the existing host cookie, generation and broadcast ID; duplicates do not write new state. The server will not finish from a timer alone: native `ended` must acknowledge completion after the duration gate. The picture fades for 800 milliseconds, then remains black indefinitely. The embedded audio stays at full volume apart from a short final fade.

Refresh reconstructs Chapter 7 and seeks near the server elapsed playback position, clamped just before the media end so native completion can still occur. Loading or autoplay refusal never completes the broadcast. Refresh of `waiting` does not load or play the asset. Browsers can seek only as their media APIs permit; a reload during buffering uses elapsed server time as the recovery estimate.

`/api/me` projects Chapter 7 directly, without Chapter 6 presence updates. Phones show only a quiet TV status and never import the video player or media asset.

## Host checkpoints

Ctrl+Shift+C reuses Chapter Select with CHAPTER 7 — BREAKING NEWS and CHAPTER 7 — AFTER BROADCAST. These explicitly selected checkpoints accept the existing authenticated host cookie without another PIN, can skip directly from an earlier phase without synthesizing a cast, and change only active phase/Chapter 7 state. All saved players, cast results, lives and votes remain untouched. Earlier chapter checkpoint authorization and cast prerequisites remain unchanged.

## Focused validation

Run only relevant coverage:

```
node --test tests/chapter7.test.js tests/chapter6-audio.test.js tests/chapter6-ambient.test.js
node scripts/verify-chapter7-browser.mjs
npm run build
```

The browser script uses Chrome, the existing isolated-memory dev server and a fixture at Recording 31. It plays that recording and the real MP4 at native speed, checks audio signal and black waiting, tests playback refresh and both authenticated checkpoints, and checks two silent phones. It never resets or writes production data. Reports and screenshots are local under ignored `logs/`.

The build copies MP4 files byte for byte. Release uses the existing GitHub → Vercel project; do not change Redis, environment variables or production game state. Production verification must be read-only.

Local validation on 2026-10-16: 24/24 focused tests passed; the single production build passed with 164 static files. One native-speed browser rehearsal verified Recording 31 completion, a 3037-ms blackout, 51305 ms from video playing to ended, embedded audio signal, a completely black waiting screen, playback refresh, both authenticated checkpoints and two silent phones, with zero runtime exceptions. Built runtime files and the MP4 match source byte for byte. The measured movie presentation duration was subsequently aligned to Chrome's 51.202 seconds (the encoded audio track contains an edit offset); focused tests and the build use that exact value.
