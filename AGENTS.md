# Brookwood project memory and instructions

## Read before changing anything

Every future Codex session must read this root `AGENTS.md` and inspect the relevant existing code, tests, and assets before making changes. Use the existing architecture as the source of truth when this summary lacks technical details. Preserve these safeguards when updating this file. Distinguish repository evidence from user-approved decisions and future plans; do not report planned features as implemented.

Brookwood is a synchronized, cinematic Halloween party game hosted on Vercel, with Redis shared game state. Extend this application and its existing room; never introduce a second game room or independent application. Never deploy to production without explicit user approval. A request to implement or test a feature is not production deployment approval.

## Approved project history and frozen chapters

User-approved status: Chapters 1–5 are completed, tested, approved, and frozen. Do not modify their gameplay, story, narration, assets, or visual design. Shared infrastructure may be extended only through minimal backward-compatible changes that preserve their behavior, timing, authorization, and persisted-state compatibility. Do not rewrite approved tests or fixtures to accommodate regressions.

- Chapter 1: the 1996 Brookwood Farm haunted-house tragedy. Thirteen friends attended; twelve were murdered; Daniel Reeve survived. Preserve the approved historical sequence.
- Chapter 2: transition to the present-day Halloween party (the implemented date is October 31, 2026).
- Chapter 3: private phone messages and synchronized TV storytelling.
- Chapter 4: investigation of Daniel Reeve and the missing machete; a voted player retrieves a physical sealed package. Preserve this player's identity for Chapter 6 eligibility.
- Chapter 5: THE CAST, with husband-and-wife horror hosts and six voting rounds. Preserve every result, especially THE SCREAMER. The casting role THE KILLER does not resolve the mysterious killer's identity.

Verified Git history runs from `27c742f` (initial lobby) through Chapter 1 cue/audio/scheduler work, Chapters 2–4, package handoff, and Chapter 5 implementation/polish. Inspection HEAD: `6603257` (Add Chapter 5 narrator handoff visuals), following `d75bdb0` (suspense-to-winner fix), `a152ead` (casting polish), `719ee41` (narration/package handoff), and `9a73043` (Chapter 5 implementation). User approval/frozen status is a project instruction, not inferred from commit messages or tests.

## Verified repository architecture

This is a plain HTML/CSS/browser JavaScript application with Node ESM Vercel API handlers, not a framework-generated app. `package.json` declares `type: module`, Node >=18, and `npm test` runs `node --test tests/*.test.js`. No build script or runtime package dependencies are declared.

### Routes, identities, and authorization

- `vercel.json` rewrites `/` and `/tv` to root `tv.html`, and `/join` to root `join.html`. Preserve these TV and phone routes. Assets and browser modules live at the repository root or under `assets/`.
- `tv.html` owns the lobby/cast board, QR join URL, host controls, cinematic DOM, state polling, and requests for progression. It polls `/api/state` about every 1200 ms through the existing loop.
- `join.html` owns joining, partner/readiness/status, photo confirmation, private messages, package confirmation, and voting. Its single guarded polling loop reads `/api/me` about every 1400 ms. Session data is stored under localStorage key `brookwood-player-v3`; malformed or invalid sessions are handled without creating another loop.
- `client.js` provides `lobbyRequest`: no-store requests, a 10-second timeout, safe user-facing failures, and no automatic mutation retries. A failed response can follow a committed write.
- `api/join.js` creates UUID player IDs and random 24-byte hex tokens. Stored player fields include `id`, `token`, `name`, `partnerId`, `ready`, `alive`, `hearts`, and `inventory`; development players can have `simulated: true`. Reuse these identities and data; never hardcode names or IDs.
- `api/me.js` and `api/player.js` authenticate the requesting player's matching ID/token against current state. `/api/me` restores the player's own status and checkpoint flags; private message text is exposed only for that player's opened, unread assignment.
- `api/host.js` accepts POST and checks the supplied `code` against `HOST_KEY`, with existing prototype fallback `1031`. Host authorization is separate from player identity. Do not infer host privileges from the first player, a name, or a casting result. Do not embed credentials in browser source, QR URLs, or public state.
- Host actions include start/reset, return-lobby, casting-ready, chapter-select, and simulated-player helpers. Test selection allowlist currently covers `chapter1`, `chapter2`, `photo`, `chapter3`, `chapter4`, `package`, and `chapter5`. Test fill requires two real players and adds ten simulated players. Preserve authentication and safeguards. Ctrl+Shift+C opens the test selector; the hidden return control uses five separate R presses within two seconds after Chapter 1 finishes.
- `api/state.js` is GET-only and exposes `publicState` plus response-only `serverNow`. `api/progress.js` is a public POST capability limited to server-gated progression; its request body cannot select clocks or phases. `api/chapter3.js` is a fixed-purpose public POST start after completed photo prerequisites. Do not turn these into unrestricted mutation endpoints.

### Redis state and mutation conventions

`api/_state.js` owns validation, projections, lobby/photo/Chapters 3–4 mutations, Redis access, and shared error handling. `api/_chapter5.js` owns package confirmation and casting state. `api/_chapter3-messages.js` is the server-only private template/assignment pool; never import it into browser code.

- One existing room (`1031`) and one existing Redis JSON key (`brookwood:1031:v3:state`). Redis REST configuration accepts `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`. Never print secret values.
- `updateState` uses Lua `EVAL` compare-and-set against the exact raw snapshot, retries conflicts up to 32 attempts, revalidates state, and assigns a unique revision for real writes. Preserve atomicity across Vercel instances; no process-local lock or read-then-unconditional-write replacement.
- Reset writes fresh state with a new generation. Updates reject crossing generations. Legacy v3 state without generation/revision is supported. Corrupt state fails closed instead of being silently repaired or overwritten.
- `UNCHANGED` still atomically compares the snapshot and fences reset, without changing revision/updatedAt. Run wrappers (`withinCinematicRun`, `withinChapter3Run`, `withinChapter4Run`, `withinCastingRun`) fence retries against replay or changed rounds. Validate supplied run timestamps against stored state; they are not client authority.
- Prepare random assignments/tie decisions once per request and reuse them across CAS retries. Door/casting winners use `crypto.randomInt` among tied maximum-vote candidates. Ballots are immutable per voter; duplicates are no-ops, and finalization timestamps are write-once.
- Redis requests have an 8-second timeout. Unknown/database failures return generic 503 responses; intentional `LobbyError` statuses remain meaningful. No automatic retry of ambiguous network writes. Responses use no-store cache headers.
- Public projections expose aggregate progress and appropriately revealed results, not tokens, private assignments, individual ballots, or early winners. Preserve this separation when adding phases.

### Cinematic implementation and progression

- `cinematic-engine.js` exposes `BrookwoodTimeline.resolve` and `Renderer`. Declarative cues have stable IDs, types, absolute millisecond windows, visual DOM targets, and optional fades/scale/text. Windows include their start and exclude their end. The pure visual resolver does not perform API mutations or dispatch gameplay.
- `cinematic-scheduler.js` exports `AbsoluteCueScheduler`: monotonic performance time, serverNow/RTT reconciliation, bounded corrections, per-run one-shots, and reconstruction after refresh/suspension. `tv-cinematic.js` integrates existing TV polling with one scheduler/RAF clock (`autoSync: false`) and existing chapter views/audio. Extend it rather than adding an independent cinematic clock or poller.
- `cinematic-audio.js` exposes `BrookwoodAudio.Player`, narration/SFX seeking and once-per-run execution, soundtrack support, and failure isolation. Expired clips are skipped on reconstruction; active clips seek to the canonical offset. Autoplay unlocking uses user gestures; audio failure must not stop visuals or mutate game state.
- `cinematic-timeline.js` freezes Chapter 1 at 0–44000 ms, Chapter 2 at 44000–88000 ms, photo prompt at 86500 ms, and checkpoint at 88000 ms. Measured Chapter 2 narration ends at 85750 ms, preserving 750 ms of silence before the prompt.
- Chapter files: `chapter1.js`/`.css`; `chapter2.js`/`.css`/`chapter2-audio.js`; `chapter3.js`/`.css`/`chapter3-audio.js`/`chapter3-timing.js`; `chapter4.js`/`.css`/`chapter4-audio.js`/`chapter4-timing.js`; `chapter5.js`/`.css`/`chapter5-audio.js`/`chapter5-timing.js`/`chapter5-audio-timing.js`/`chapter5-reveal-timing.js`. `phone-chapter3.js` provides the existing phone scheduler integration.
- Actual phase flow: lobby -> opening (Chapters 1–2) -> photo -> photo-complete -> chapter3-opening -> private-messages -> private-messages-complete -> chapter4-opening -> door-vote -> door-vote-complete -> chapter5-intro -> chapter5-waiting -> chapter5-rules -> chapter5-casting -> chapter5-finale -> chapter5-complete. Progression is request-driven, server-time-gated, and persisted; no background server timer is assumed.
- Chapter 3 activation is at 12600 ms relative to its run. All messages must be read, then a 2000 ms completion sequence finishes before Chapter 4. Chapter 4 voting gate is 114474 ms. Existing score behavior is implemented in `chapter4-audio.js` using the Chapter 1 background WAV.
- Only the Chapter 4 selected player's authenticated `package-open` action confirms the package and starts Chapter 5. Preserve `chapter4.selectedPlayerId`, top-level `macheteHolderPlayerId`, and `packageOpenedAt`. Package confirmation does not fabricate inventory changes.
- Chapter 5 stores six rounds with votes, `winnerPlayerId`, and completion clocks. Role IDs in order: `screamer`, `terribleDecisionMaker`, `tripper`, `denier`, `sacrifice`, `killer`. A player can win more than one role. Preserve all rounds and derive THE SCREAMER from its stored result.
- Chapter 5 waits for authenticated `casting-ready` before rules. Server gates use measured narration durations and tails. `audioVersion` and `revealVersion` preserve deployed legacy-run compatibility. Winner names stay hidden until the server reveal gate; the TV retains suspense if the name projection has not arrived. Current progression stops at `chapter5-complete`.
- Reuse the established black transitions, restrained image motion, chapter-scoped CSS, horror typography, narration layering, and cue-driven reveals. Assets are under `assets/chapter1/` through `assets/chapter5/`; retain exact names, including `02-the-terrible-decision-make.png`.

## Planned Chapter 6: THE KILLER'S MAZE

The following is approved direction, not implemented functionality. Do not begin implementation unless requested. A mysterious, electronically disguised killer interrupts the Chapter 5 hosts and takes over the TV. Integration must preserve the frozen Chapter 5 sequence and its results through minimal backward-compatible shared changes.

Five challenges share three lives:

| Challenge | Required answer/behavior | Timer |
| --- | --- | --- |
| The Four Doors | Black door IX is correct | 120 seconds |
| Horror Box Office | The Sixth Sense is correct | 120 seconds |
| Don't Look Away | Brandon Morgue memory image; clock shows 3:45 | 15-second image exposure, then 90-second question timer |
| Bridge of Death | Alex 1 minute, Emma 2, Clara 5, David 10; correct total 17 minutes | 180 seconds |
| Don't Make a Sound | CSS waveform, audio interruptions, jump scare; host-only pass/fail judgment | 30 seconds of silence; no microphone access |

Every incorrect answer costs one shared life, clamped at zero. Complete all five games even after losing all lives. Special narration must trigger once when lives first reach zero. Shared maze lives are distinct from existing individual player hearts; do not overwrite player status to represent the group counter.

The finale branches on remaining lives, then players vote for a physical-token retriever from the laundry room. The Chapter 4 machete retriever cannot be a candidate but may vote. Derive eligibility from stored player IDs and the preserved retrieval result. The host confirms the player's return. Final narration reveals that an additional invited guest was visited by the killer and never arrived; the killer's identity remains unresolved.

Persist progression, challenge timing/results, deductions, zero-life narration state, voting results, and return confirmation in the existing shared state so refresh/reconnect cannot replay gameplay effects. Server-authoritative timers and atomic idempotency must prevent duplicate submissions, votes, and life deductions. Use stored cast membership rather than assuming exactly twelve connected phones. Do not change the approved twelve-player Chapters 1–5 rules as part of this instruction.

Unspecified implementation details (answer submission ownership, timeout outcomes, exact interruption boundary, voting/tie policy, and jump-scare cue timing) must be resolved from relevant existing code/assets and further task instructions; do not invent already-approved behavior.

### Verified Chapter 6 asset inventory (2026-10-11)

Paths are `assets/chapter6/` for images and `assets/chapter6/audio/` for recordings. Verify existence, content, and media durations before wiring cues; filenames alone do not verify spoken text or visual details.

Final verification confirmed all **11 expected PNG files**, present and nonempty:

```text
black_door.png
black_reveal.png
blue_door.png
blue_reveal.png
bridge_background.png
green_door.png
green_reveal.png
morgue_memory.png
red_door.png
red_reveal.png
silence_jumpscare.png
```

The user corrected the original `blue_revea.png` filename to `blue_reveal.png` and added `silence_jumpscare.png`. The obsolete filename is absent. Use the corrected filenames exactly; the previous inventory discrepancies are resolved.

All 32 numbered MP3 files were present and nonempty:

```text
ch6_01_interruption.mp3
ch6_02_maze_intro.mp3
ch6_03_doors_intro.mp3
ch6_04_doors_red.mp3
ch6_05_doors_blue.mp3
ch6_06_doors_green.mp3
ch6_07_doors_black.mp3
ch6_08_boxoffice_intro.mp3
ch6_09_boxoffice_60.mp3
ch6_10_boxoffice_30.mp3
ch6_11_boxoffice_05.mp3
ch6_12_boxoffice_correct.mp3
ch6_13_boxoffice_wrong.mp3
ch6_14_memory_intro.mp3
ch6_15_memory_question.mp3
ch6_16_memory_correct.mp3
ch6_17_memory_wrong.mp3
ch6_18_bridge_intro.mp3
ch6_19_bridge_correct.mp3
ch6_20_bridge_wrong.mp3
ch6_21_silence_intro.mp3
ch6_22_silence_rules.mp3
ch6_23_silence_whisper.mp3
ch6_24_silence_chicken_reaction.mp3
ch6_25_silence_accusation.mp3
ch6_26_silence_pass.mp3
ch6_27_silence_fail.mp3
ch6_28_final_win.mp3
ch6_29_final_lose.mp3
ch6_30_retriever_selected.mp3
ch6_31_token_return.mp3
ch6_32_all_lives_lost.mp3
```

## Validation conventions

Run existing `npm test` and add meaningful regression coverage for new functionality. Preserve the frozen Chapter 1 fixture in `tests/chapter1-approved-fixture.js`. `tests/lobby.test.js` uses an in-memory Redis REST substitute implementing the Lua CAS contract and forced concurrency; no live database is contacted. `tests/client.test.js` covers TV/phone flows, polling, credentials, syntax/imports/routes, and stale-response handling. Cinematic engine/scheduler/audio/timeline/TV tests and chapter-specific tests cover timing boundaries, refresh/seek behavior, visual formulas, asset metadata, and Chapter 5 handoff/reveal/audio polish. `tests/wav-metadata.js` and `tests/mp3-metadata.js` measure existing media without re-encoding.

Future Chapter 6 regressions must cover authorization, concurrent/duplicate submissions and deductions, zero-life narration once, all five games at zero lives, server deadline boundaries, refresh/reconnect, reset/replay generation fencing, retriever exclusion with voting eligibility, preserved Chapter 4/5 results, and host-only silence judgment/return confirmation. Local tests do not prove live Vercel/Redis integration or TV autoplay; validate relevant integration and browser behavior when authorized, without deploying to production by default.

## Current Project Status

Inspection date: 2026-10-11. No pre-existing repository `AGENTS.md` was found. README and `CINEMATICS.md` supplied existing documentation; this file preserves their applicable safeguards while recording current implementation.

- Implemented: existing lobby, session/authentication, atomic Redis state, synchronized Chapters 1–5, private messages, photo checkpoint, physical-package selection/confirmation, six casting rounds, host test tools, and refresh/reconnect reconstruction. Chapters 1–5 remain approved and frozen per user direction.
- Validation: existing `npm test` passed **378/378 tests**, zero failures/skips, during this documentation-only inspection. This is local verification, not a new live production verification.
- Planned: all Chapter 6 runtime/state, challenge interfaces/timers, shared lives, killer takeover, finale branching, token vote, and host return confirmation. No Chapter 6 JS/CSS/API phases or tests exist in this inspected checkout; asset presence is not implementation.
- Assets verified: all 11 expected Chapter 6 PNG images and all 32 numbered MP3 recordings are present and nonempty. The corrected `blue_reveal.png` and added `silence_jumpscare.png` resolve the previous inventory discrepancies. Media contents/durations and cue timing still need verification before implementation.
- Existing cast constraint: lobby join cap, start, validators, checkpoint counts, and Chapter 4/5 ballot completion currently explicitly require twelve players/six couples. Preserve these frozen rules. New functionality must derive participants from stored player data and must not equate online connections with the eligible cast.
- Documentation drift: README largely describes the original lobby. Older `CINEMATICS.md` passages say Chapter 2 automatic progression or Chapter 5 is absent, describe Chapter 4 without score, or list an older chapter-selector allowlist; current code and later sections supersede these claims. Consult actual code and timing modules.
- Final asset-preservation scope authorized by the user: commit root `AGENTS.md` and `assets/chapter6/` only. No tracked Chapter 1–5 files were modified at verification. The pre-existing untracked `assets/chapter1/narration.mp3` remains excluded and untouched; Chapter 1 playback references its approved numbered WAV recordings.
- Chapter 6 remains planned. Asset preservation does not authorize implementation or deployment; no game code, existing assets, tests, or configuration were changed in these documentation/verification tasks.
