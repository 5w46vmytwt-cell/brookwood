## Cinematic pacing release (2026-10-14)

The user authorized this polish and the existing feature branch ? main ? Vercel production workflow. New maze runs persist pacingVersion 1; legacy active runs keep their prior pacing without a Redis reset. Chapters 1?4, cast assignments, voting, scores, credentials and supplied recordings remain unchanged.

Ambient music begins at the first mystery message after the complete cast presentation, fades in over two seconds, and retains the same looping element across Chapter 5 ? 6. It uses the existing single TV scheduler and 12% ambient / 5% narration targets. Refresh reconstructs one loop with the existing audio-unlock action. Four Doors description pauses were explicitly deferred by the user: Recording 03 remains continuous; 04?07 remain outcome recordings.

Knowledge answers retain the three-second lock, followed by a persisted 1600-ms exclusive fade into game-specific result artwork. Door outcomes use the selected reveal asset; cinema, memory and bridge results retain their correct answers and complete narration. Chapter 6 uses a navy vignette, with green/red result treatments.

After memory introduction completion, prepare-image waits for the authenticated TV to decode the image. A fenced readiness action persists exposureStartedAt 1500 ms ahead for synchronization. The image has no opacity/transform transition, is fully shown at that authoritative timestamp, and remains for exactly 30000 server milliseconds. Refresh uses the remaining interval; the 90-second answer window is unchanged. No client clock can extend exposure.

Game 5 enters persisted silence-ready only after recordings 21 and 22 finish. BEGIN THE CHALLENGE requires the existing host session and starts the authoritative 60-second window once. The timed scare lasts three seconds at five seconds remaining. Failure presents a three-second shock (last 500 ms fading), then the killer waveform while the same failure recording continues. Text accurately distinguishes a lost life from already-zero lives.

Local validation: 475/475 tests and the 158-file production build passed. Built TV plus two isolated phones passed both success/all-ballot and failure/host-close rehearsals. Non-accelerated memory visibility measured 29999.0 ms (one-frame sampling; server interval exactly 30000 ms). Silence measured 60117.0 ms from host click to persisted verdict (server interval exactly 60000 ms); timed scare measured 3000.0 ms. All three interruptions ended naturally at full volume without overlap. Production verification follows release; local measurements are not production-session mutations.

# Cinematic/host-control/soundtrack authorization (2026-10-13)

The user approved exclusive Chapter 5 finale messages, the supplied Chapter 6 ambient MP3, a host-session EVERYONE READY checkpoint, maze vignette and host resolution after knowledge timer expiry, plus production deployment after validation. The existing final-cast checkpoint retains actual six-role results and starts the six-person presentation without replaying rounds. No production Redis reset or environment changes are authorized. Preserve Chapters 1–4, Chapter 5 gameplay/recordings/cast and all supplied media bytes. New controlVersion 1 maze runs persist intro black pauses, ready and expired phases; legacy runs retain their prior clocks/progression. See CHAPTER6.md.

# Chapter 6 visual/voting release authorization (2026-10-12)

The user approved Chapter 6-only door/card/HUD/result/zero-life/failure-scare polish and token-voting corrections, tests, isolated local rehearsal and the existing feature branch → main → Vercel production workflow. Preserve Chapters 1–5 and all supplied audio bytes. Do not reset production Redis, modify environment variables or create projects/databases. Current implementation and election migration/tie rules are documented in CHAPTER6.md; older first-ballot/30-second-presence/random-token-tie notes are superseded. Production release is not verified until explicitly checked.

# Current coordinated polish authorization (2026-10-12)

The user explicitly approved Chapter 5 unique casting winners and a final-cast host testing checkpoint, plus the coordinated Chapter 6 audio/UX changes and the existing feature branch → main → Vercel production release. Preserve Chapters 1–4 and Chapter 5 narration/art/story. Existing legacy duplicate casting assignments must remain intact; future votes exclude assigned players. Recording 22 was intentionally replaced by the user (17.789388 seconds, spoken 60-second rules); preserve the supplied bytes, use a 60-second silence challenge, and update metadata. This supersedes the previous temporary decision to retain 30 seconds. No Redis reset, environment modification or new project/database is authorized. See CHAPTER6.md for versioned phase recovery and media completion. Release remains unverified until recorded after deployment.

# Brookwood project memory and instructions

## Current release authorization (2026-10-11)

The user subsequently authorized restoring Ctrl+Shift+C during Chapter 6 using the existing PIN-protected, cast-restricted Chapter Select interface, regression/browser tests, and the existing GitHub → Vercel production release workflow. Preserve live Redis and environment variables during release verification. The transition/host-session polish was verified deployed at `49c7c1e` with 421 passing tests and successful local browser and production route checks.

Verified production baseline: Chapter 6 deployed from `main` at `eab51fb` on 2026-10-11, with 412 passing tests, successful build, production READY status, and read-only TV/join/API checks. Older local-only notes below are historical. The user also authorized Chapter 6-only four-second transitions (including finale entry), reusable server-authorized host sessions, removal of the Game 5 SCREAMER display, tests, commit/push/integration and production deployment. Never reset Redis or modify environment variables for this work. See `CHAPTER6.md` for current conventions.

The user explicitly authorized committing Chapter 6 on the existing feature branch, pushing it to the existing GitHub repository, integrating it into `main`, and allowing the existing Vercel Git integration to deploy production. Use the existing Vercel project and Redis configuration; do not create additional databases, projects, or environment configurations. Do not reset or manually modify the existing Redis session. Chapters 1–5 remain frozen. This authorization supersedes the older no-push/no-merge/no-deployment status notes below for this Chapter 6 release only. Deployment completion must be verified before being reported as implemented in production.

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

## Approved Chapter 6: THE KILLER'S MAZE

The following is approved direction. Chapter 6 is now implemented locally on `feat/chapter6-killers-maze`, using checkpoint `76463e32cfd79837913b77d79ce36d2e7b13e0c9`; it has not been pushed or deployed. A mysterious, electronically disguised killer interrupts the Chapter 5 hosts and takes over the TV. Integration must preserve the frozen Chapter 5 sequence and its results through minimal backward-compatible shared changes. See `CHAPTER6.md` for implementation conventions, measured audio, and local rehearsal instructions.

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

The complete implementation specification resolved answer ownership (host-only), timeouts (incorrect), takeover (`chapter5-complete` without an added wait), and jump scare (five seconds remaining, 500 ms). Voting reuses existing no-self-vote and random tied-maximum conventions. Do not invent additional story or gameplay rules.

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
- Validation: pre-implementation baseline was **378/378** tests. Chapter 6 now passes **412/412** tests with zero failures/skips; production static build and accelerated built-TV/two-phone browser verification pass. This is local verification, not live production verification.
- Implemented locally: Chapter 6 runtime/state, all five games, shared lives, one-time zero-life narration, killer takeover, finale branches, private token vote, and host return confirmation. New modules: `api/_chapter6.js`, `api/chapter6.js`, `chapter6-timing.js`, `chapter6.js`, `chapter6.css`, `chapter6-interface.js`, `chapter6-phone.js`, and `chapter6-media.json`; regression coverage is in `tests/chapter6.test.js` and `tests/chapter6-view.test.js`. Shared API/TV/phone integration is extended backward-compatibly. Production deployment remains unverified and unauthorized.
- Assets verified: all 11 expected Chapter 6 PNG images and all 32 numbered MP3 recordings are valid and nonempty. The corrected `blue_reveal.png` and added `silence_jumpscare.png` resolve the previous inventory discrepancies. All MP3 durations were measured using contiguous MPEG frame samples and are recorded in `chapter6-media.json` and `CHAPTER6.md`. Actual-party audio clarity/autoplay and deployed Vercel/Redis integration remain to be rehearsed.
- Existing cast constraint: lobby join cap, start, validators, checkpoint counts, and Chapter 4/5 ballot completion currently explicitly require twelve players/six couples. Preserve these frozen rules. New functionality must derive participants from stored player data and must not equate online connections with the eligible cast.
- Documentation drift: README largely describes the original lobby. Older `CINEMATICS.md` passages say Chapter 2 automatic progression or Chapter 5 is absent, describe Chapter 4 without score, or list an older chapter-selector allowlist; current code and later sections supersede these claims. Consult actual code and timing modules.
- Final asset-preservation scope authorized by the user: commit root `AGENTS.md` and `assets/chapter6/` only. No tracked Chapter 1–5 files were modified at verification. The pre-existing untracked `assets/chapter1/narration.mp3` remains excluded and untouched; Chapter 1 playback references its approved numbered WAV recordings.
- The complete Chapter 6 specification subsequently authorized implementation, regression tests, and local production build. `package.json` and `vercel.json` now configure `scripts/build.mjs`; `scripts/dev.mjs` supplies local isolated rehearsal and `scripts/verify-chapter6-browser.mjs` exercises built TV/phone flows. Chapters 1–5 content and approved assets remain unchanged. No push, merge, or deployment is authorized.
