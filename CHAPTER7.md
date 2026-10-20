# Chapter 7 — THE THREE THEORIES & THE EVIDENCE

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
