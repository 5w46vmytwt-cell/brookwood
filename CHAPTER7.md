# Chapter 7, Phase 1 — WESTMAN NEWS

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
