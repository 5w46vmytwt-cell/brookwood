# Chapter 6 implementation and rehearsal

Branch: `feat/chapter6-killers-maze`. Pre-implementation checkpoint: `76463e32cfd79837913b77d79ce36d2e7b13e0c9`.

The original Chapter 6 release deployed to the existing production project from `main` at `eab51fb` on 2026-10-11. The user subsequently authorized the Chapter 6 transition/host-session/presentation improvements and their production release. Use the existing GitHub → Vercel workflow and Redis configuration; never reset the live session during verification.

Between games, and before the finale, the persisted `transition` phase lasts exactly 4000 ms: 1000 ms fading the completed scene out, 2000 ms fully black, then 1000 ms fading the next introduction in. A black curtain follows the existing scheduler's absolute server clock. No audio cues or countdown run during this phase. Result narration and any once-only zero-life narration finish before transition entry. The next introduction/finale narration begins at the transition deadline. Phones render the persisted transition without answers or voting. Refresh reconstructs the current point rather than restarting the fade. Existing runs without transition data remain readable.

Valid PIN requests through the existing host controls now issue a signed 12-hour HttpOnly, SameSite=Strict cookie (Secure on Vercel). Chapter 6 accepts that session for answers, verdicts and finale controls, with existing generation/run/scene fences intact. The PIN is never saved in client storage or game state. Chapter 6 recovers authentication on panel opening and after refresh; only missing/expired authorization requires login. Chapters 1–5 continue requiring their existing PIN-based requests. Signing uses the existing host key, with no new environment configuration. Game 5 no longer renders the SCREAMER identity; casting results and recordings remain unchanged.

Ctrl+Shift+C reuses the existing Chapter Select panel during Chapter 6. Its maze-specific stacking class places it above the full-screen maze and host overlay. Navigation still requires the existing valid twelve-player paired test cast and a host PIN; the maze cookie does not authorize chapter selection. A jump into or out of Chapter 6 returns the committed public snapshot, renders it immediately, and invalidates pre-jump polls. Leaving stops maze audio through the existing runtime and clears the host controls' run reference, so delayed answers cannot restore an old scene. Server generation/CAS fences invalidate old actions; fresh maze navigation rebuilds prerequisites and starts with three shared lives. Production route checks remain read-only, and chapter-jump rehearsal uses only the local isolated server.

Chapter 6 starts through the existing TV progression loop when Chapter 5 reports `chapter5-complete`. The fixed-purpose `/api/chapter6` start retains all earlier state and is atomic/idempotent. `api/_chapter6.js` stores phase clocks, outcomes, shared lives, zero-life narration consumption, casting/retrieval references, connected-phone presence, private ballots, and token confirmation in the existing Redis room. Answers, silence verdict, simulated voting helper, and token confirmation require existing host authorization plus current generation/run/scene.

Narration timing uses measured MPEG frame duration with the established 200 ms chapter narration tail. Answer windows remain a full 120/120/90/180 seconds; silence lasts 60 seconds. Memory exposure is exactly 15 seconds. Early answers cancel warning cues. The last Box Office recording starts 6.192 seconds before the deadline and ends at zero; spoken-number waveform alignment has not been independently annotated. Silence interruptions start at 48, 34, and 20 seconds remaining, with the jump scare at five seconds remaining. New runs require authenticated TV narration completion before mandatory cinematic progression. The optional jump-scare sting is omitted; the supplied image flashes for 500 ms.

Four Doors timeout shows no selected door, uses no invented narration, and holds the generic failure screen for 1500 ms. Failure results finish before the once-only zero-life clip. All five games still run at zero. Finale selects recording 28 or 29, then phone voting, recording 30, indefinite host-confirmed retrieval wait, expanded recording 31, and black completion.

Real phone polling records presence every ten seconds. Voting freezes all real phones observed during the maze when the vote opens, retaining backgrounded or disconnected voters. If none have been observed, the real registered cast is the conservative fallback. It never shrinks on reconnect or the first ballot. Legacy unfinished votes migrate by retaining existing voters and ballots and including observed phones; finalized results remain unchanged. The machete holder may vote but cannot be selected. Private immutable ballots expose only aggregate progress. All ballots finalize automatically; authenticated CLOSE VOTING requires at least one valid ballot and preserves the partial election. Ties use the lowest SHA-256 hexadecimal rank of JSON [session generation, maze start timestamp, candidate ID], independent of arrival order and CAS retries. In test mode the explicit authenticated helper adds simulated ballots before real ballots.

## Local checks

From the project directory with Node installed:

```powershell
npm test
node scripts/measure-chapter6.mjs
npm run build
npm run dev -- --built
```

Open `http://127.0.0.1:3000/tv`. Open `/join` on two separate browsers/profiles (each needs its own localStorage). Join both players, pair them, then use the TV's host controls with local rehearsal PIN `1031` to TEST: FILL and TEST: CHAPTER SELECT → Chapter 6. During Chapter 6, HOST CONTROLS reuses that authentication; if opened on a new browser, authenticate once. Ordinary phones only watch until the token vote. ENABLE AUDIO retries the current active clip after a user gesture. After the finale narration, use TEST: VOTE SIMULATED PLAYERS before either real phone votes, then vote on both phones. After selected-retriever narration, confirm Player Returned With Token and wait for the final recording.

The local server uses the real API handlers with an isolated in-memory Redis CAS transport, never the live database. It intentionally sets its own local credentials. Ctrl+C stops it; restarting loses rehearsal state. Do not expose this rehearsal server publicly.

For accelerated browser verification, stop the normal rehearsal server, then run:

```powershell
npm run dev -- --built --automation
```

In another terminal:

```powershell
node scripts/verify-chapter6-browser.mjs
```

This requires Node 22+ and Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, or `BROOKWOOD_CHROME` set to the local Chrome executable. It isolates phone browser storage, drives the actual DOM controls, advances the local server clock, checks API results, and writes TV screenshots under ignored `logs/`. It enables autoplay for automation; manually rehearse TV audio unlocking and speech clarity on the actual party screen.

The production build copies public browser files and approved media to ignored `dist/`, checks syntax/imports/routes/media URLs, and leaves native Vercel API handlers in source. This verifies local build output, not a deployed Vercel/Redis integration. Release actions require the user's explicit authorization, recorded above for this release.

## Measured audio

`chapter6-media.json` stores all 32 exact sample counts, formats, and durations. Measurements use the repository's contiguous MPEG Layer III parser; files remain unchanged. Values below are rounded to six decimal places in seconds.

| Recording | Actual duration (seconds) |
| --- | ---: |
| ch6_01_interruption.mp3 | 15.960816 |
| ch6_02_maze_intro.mp3 | 13.871020 |
| ch6_03_doors_intro.mp3 | 39.392653 |
| ch6_04_doors_red.mp3 | 8.280816 |
| ch6_05_doors_blue.mp3 | 11.311020 |
| ch6_06_doors_green.mp3 | 9.717551 |
| ch6_07_doors_black.mp3 | 12.120816 |
| ch6_08_boxoffice_intro.mp3 | 20.610612 |
| ch6_09_boxoffice_60.mp3 | 5.328980 |
| ch6_10_boxoffice_30.mp3 | 11.389388 |
| ch6_11_boxoffice_05.mp3 | 6.191020 |
| ch6_12_boxoffice_correct.mp3 | 12.747755 |
| ch6_13_boxoffice_wrong.mp3 | 22.047347 |
| ch6_14_memory_intro.mp3 | 26.357551 |
| ch6_15_memory_question.mp3 | 16.927347 |
| ch6_16_memory_correct.mp3 | 13.244082 |
| ch6_17_memory_wrong.mp3 | 17.319184 |
| ch6_18_bridge_intro.mp3 | 44.199184 |
| ch6_19_bridge_correct.mp3 | 9.795918 |
| ch6_20_bridge_wrong.mp3 | 17.946122 |
| ch6_21_silence_intro.mp3 | 31.320816 |
| ch6_22_silence_rules.mp3 | 17.789388 |
| ch6_23_silence_whisper.mp3 | 7.627755 |
| ch6_24_silence_chicken_reaction.mp3 | 6.112653 |
| ch6_25_silence_accusation.mp3 | 5.955918 |
| ch6_26_silence_pass.mp3 | 14.994286 |
| ch6_27_silence_fail.mp3 | 14.524082 |
| ch6_28_final_win.mp3 | 27.088980 |
| ch6_29_final_lose.mp3 | 25.391020 |
| ch6_30_retriever_selected.mp3 | 10.448980 |
| ch6_31_token_return.mp3 | 33.149388 |
| ch6_32_all_lives_lost.mp3 | 25.155918 |

Recording 22 was intentionally replaced by the user: 784512 samples, 17.789388 seconds, spoken 60-second rules. Preserve its supplied bytes. New runs persist audioVersion 2, individual intro cues, a 15-second exposure, answer lock, takeover, and GAME OVER. Legacy persisted runs retain their original phase progression.

## Coordinated polish release

New maze runs serialize takeover → individual narration → question/exposure → answer lock (3000 ms for Games 1–4; the Game 5 verdict retains 1800 ms) → result narration → black transition. The authenticated TV reports media ended; /api/progress alone cannot advance mandatory narration in audioVersion 2. Blocked or interrupted playback shows a resume action; authentication expiry requires host login and explicit resume. Old runs without audioVersion 2 keep their persisted phase behavior. Doors are shuffled once per start request and persisted by identity.

Games 1–4 retain 120/120/90/180-second answer windows. Game 5 now uses 60 seconds, after recordings 21 and the supplied 22 finish. Whisper/chicken/accusation occur at 48/34/20 seconds remaining; the 500-ms image scare occurs at five seconds remaining, suppressed if narration remains active. Recording 32 applies only to final-life losses in Games 1–4. After Game 5, the 1-second fade, 3-second black hold and 1-second reveal lead to a 3-second GAME OVER interstitial, then the complete win/lose narration and token retrieval.

Chapter 5 new runs assign at most one role per player. Server eligibility excludes prior winners; simulated votes use the same candidates. Legacy duplicate assignments remain intact and are flagged in projections. An unfinished legacy round with ballots targeting an assigned player fails closed with a host-review message rather than changing ballots. The PIN-protected CHAPTER 5 — FINAL CAST REVEAL checkpoint retains completed actual assignments, otherwise prepares a valid cast using stored player identities. It preserves Chapter 4 retrieval data when completed assignments exist.

The supplied Recording 22 SHA-256 is A8954C205D8ED6746CB146C3A0D18D882C5A597C7EDFF0A1C8C2B9E0D7D5ED8F. No recording is edited or regenerated by this change.

Local polish validation (2026-10-12): 440/440 automated tests, production build (155 public files), and accelerated built-TV/two-phone rehearsal passed, including the three silence interruptions, authenticated media completion, private voting/return, black completion, refresh/navigation, and final-cast checkpoint. Acceleration seeks media near its end to exercise real browser `ended` events; actual-party speech clarity and autoplay remain device-dependent. Production release verification is recorded separately after deployment.

## Chapter 6 visual and voting polish (2026-10-12)

Complete door cards (image/color/symbol/identity), TV options and host buttons use the same stored order. New games exclude the exact narration-order permutation; refresh and active legacy runs keep their stored order. Box Office and memory questions use balanced large cards, with movie years and compact active-title HUD. Memory artwork remains restricted to exposure. Knowledge answers lock for three server-timed seconds without narration before green success/red failure results. Mandatory narration still requires authenticated media completion. Zero-life Recording 32 owns a dedicated dark waveform scene in Games 1–4; Game 5 failures hold the existing scare image through Recording 27 without extra sound. No MP3, score, deadline, Chapter 1–5 content or environment changes are included.

Regression coverage checks actual rendered image order, refresh, questions, HUD, result scenes, three-second locking, stable electorate/ballots, simultaneous voting, deterministic ties, host closure and legacy pending vote migration. Local browser rehearsal exercises first vote at 11/12 without finalization, phone refresh and both automatic completion and host early closure. Production status must be verified after release.

Visual/voting release local validation: 451/451 automated tests and the 155-file production build passed. Both accelerated built-TV/two-phone rehearsals passed: all-ballot completion and host early closure, including first-vote pending progress/refresh, zero-life waveform, Game 5 failure image, token narration/return, black completion and authorized chapter navigation. Chapter 1–5 implementation files, approved fixture and all recordings remain unchanged. Browser acceleration exercises native ended events by seeking near the end; it does not replace an actual-party listening check. Production verification remains a release step.
