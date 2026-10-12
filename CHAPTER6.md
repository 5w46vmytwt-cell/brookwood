# Chapter 6 implementation and rehearsal

Branch: `feat/chapter6-killers-maze`. Pre-implementation checkpoint: `76463e32cfd79837913b77d79ce36d2e7b13e0c9`.

The original Chapter 6 release deployed to the existing production project from `main` at `eab51fb` on 2026-10-11. The user subsequently authorized the Chapter 6 transition/host-session/presentation improvements and their production release. Use the existing GitHub → Vercel workflow and Redis configuration; never reset the live session during verification.

Between games, and before the finale, the persisted `transition` phase lasts exactly 4000 ms: 1000 ms fading the completed scene out, 2000 ms fully black, then 1000 ms fading the next introduction in. A black curtain follows the existing scheduler's absolute server clock. No audio cues or countdown run during this phase. Result narration and any once-only zero-life narration finish before transition entry. The next introduction/finale narration begins at the transition deadline. Phones render the persisted transition without answers or voting. Refresh reconstructs the current point rather than restarting the fade. Existing runs without transition data remain readable.

Valid PIN requests through the existing host controls now issue a signed 12-hour HttpOnly, SameSite=Strict cookie (Secure on Vercel). Chapter 6 accepts that session for answers, verdicts and finale controls, with existing generation/run/scene fences intact. The PIN is never saved in client storage or game state. Chapter 6 recovers authentication on panel opening and after refresh; only missing/expired authorization requires login. Chapters 1–5 continue requiring their existing PIN-based requests. Signing uses the existing host key, with no new environment configuration. Game 5 no longer renders the SCREAMER identity; casting results and recordings remain unchanged.

Chapter 6 starts through the existing TV progression loop when Chapter 5 reports `chapter5-complete`. The fixed-purpose `/api/chapter6` start retains all earlier state and is atomic/idempotent. `api/_chapter6.js` stores phase clocks, outcomes, shared lives, zero-life narration consumption, casting/retrieval references, connected-phone presence, private ballots, and token confirmation in the existing Redis room. Answers, silence verdict, simulated voting helper, and token confirmation require existing host authorization plus current generation/run/scene.

Narration timing uses measured MPEG frame duration with the established 200 ms chapter narration tail. Answer windows remain a full 120/120/90/180 seconds; silence lasts 30 seconds. Memory exposure is exactly 15 seconds. Early answers cancel warning cues. The last Box Office recording starts 6.192 seconds before the deadline and ends at zero; spoken-number waveform alignment has not been independently annotated. Silence overlaps duck the older voice to 18% rather than moving the timer. The optional jump-scare sting is omitted; the supplied image flashes for 500 ms.

Four Doors timeout shows no selected door, uses no invented narration, and holds the generic failure screen for 1500 ms. Failure results finish before the once-only zero-life clip. All five games still run at zero. Finale selects recording 28 or 29, then phone voting, recording 30, indefinite host-confirmed retrieval wait, expanded recording 31, and black completion.

Real phone polling updates presence every ten seconds. The first finale ballot locks the electorate to real players active within thirty seconds, so completion never assumes twelve connected players. Refresh restores ballots and phase clocks. Chapter 4's retriever may vote but cannot be a candidate. Existing no-self-vote and random maximum-vote tie conventions apply; the random selection is cached across CAS retries. Keep voting phones connected through the first ballot; the locked electorate does not shrink after a disconnection. In test mode, simulated candidates are available; the explicit authenticated helper adds simulated ballots and must be used before real ballots.

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
| ch6_22_silence_rules.mp3 | 24.450612 |
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
