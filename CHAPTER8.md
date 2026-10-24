# Chapter 8 — interactive picture clues

Visual and implementation review approved on 2026-10-24. The user authorized committing the reviewed changes on `feat/chapter8-picture-puzzle`, pushing and releasing through the existing GitHub → main → Vercel production workflow. Do not start or reset an active game, mutate production Redis data, or change environment variables or host authentication. Production verification must use non-destructive, read-only checks.

## Local transition polish — pending review

The original implementation was deployed as `c9eaa1f`. The subsequent Chapter 7 → 8 transition changes are local only and must not be committed, pushed or deployed before the user's next review.

Chapter 7 now automatically enters Chapter 8 through the existing public, server-gated progression endpoint after its final fade has completed. A request cannot choose a chapter or skip a phase; completed Chapter 7 is the only entry gate. The CAS transaction creates one prepared run across concurrent TV requests, or resumes an existing Chapter 8 run without clearing clues. The manual start button has been removed; Chapter Select remains authenticated testing/navigation.

Chapter 8 ambience now starts immediately under both opening recordings at the existing 7% target with its gentle fade-in. Its canonical clock is Chapter 8 `startedAt`, not puzzle activation. One looping element and fade state survive both narration-to-narration and narration-to-puzzle transitions. Refresh reconstructs the chapter-clock offset. Narration remains at full volume; puzzle Continue retains its existing fade-out and reaction behavior. Phones remain silent.

Ctrl+Shift+C offers FINAL WINDOW ZOOM, AFTER FINAL WINDOW ZOOM, OPENING NARRATION and PICTURE CLUES. Existing checkpoint IDs, host cookies/PINs, historical results and separate test-outcome safeguards are preserved.

Transition-polish validation: all 111 Chapter 7/8 tests passed, the production static build passed (195 files), and the local browser rehearsal passed from the final window recording through the hold/fade, automatic entry, both full opening recordings, all 17 reveals, refresh recovery and reaction. It used a host TV, read-only TV and silent phone, with zero runtime exceptions. No production session was accessed or changed.

## Entry and sequence

After Chapter 7's final fade completes, server-authoritative progress automatically enters Chapter 8 while preserving all Chapter 7 results. The existing Chapter Select also offers CHAPTER 8 — OPENING NARRATION and CHAPTER 8 — PICTURE CLUES, using the existing host cookie/PIN flow. Revisiting a Chapter 8 checkpoint retains its revealed letters; it does not reset the cast or earlier chapter data.

The two supplied opening recordings play completely, using native playing/ended acknowledgments and the existing TV scheduler: unexpected evidence (13.450 s), then coded message (23.150 s), then the puzzle. No timer can bypass narration. The puzzle remains visible indefinitely, including after all 17 reveals. Only an authenticated host can Continue after all 17 clues. Continue fades the picture and ambient loop over 1600 ms, then plays the supplied reaction recording (14.400 s). Its completion stops here; no security-camera scenes are implemented.

## Picture and interaction

`chapter8-puzzle.js` contains all 17 exact mappings and percentage regions relative to the unchanged 1536 × 1024 PNG. The TV contains the entire image without cropping, distortion, filtering or motion. Unrevealed overlays are transparent. Revealed regions use opaque aged-paper samples from the same PNG, uppercase letters and original numbered-tab crops. The answer lines, surrounding paper and other clues are preserved. No replacement media is generated.

Mouse, touchscreen and keyboard activation use authenticated host controls. Dragging, secondary pointers, repeated clicks, chapter navigation and read-only TVs cannot accidentally reveal letters. Independent in-flight guards allow different rapid host clicks; the server merges concurrent reveals atomically. Reveal IDs are validated, duplicates are no-ops, and no typed-answer or automatic answer-validation flow exists.

## State, authorization and audio

The new `api/_chapter8.js` module uses the existing Redis JSON state, Lua CAS, generation fences and host sessions through `/api/host`. Reveals are permanent within the saved Chapter 8 run. Public and phone projections contain only the appropriate state, never host credentials or player tokens. Phase/run/generation checks reject stale actions. Earlier chapter modules and assets are unchanged; shared integrations add Chapter 8 branches only.

`chapter8-audio.js` reuses `BrookwoodAudio.Player` and its synchronized looping track, driven by the existing single TV scheduler. `AMBIENT_VOLUME` (0.07) and `AMBIENT_FADE_MS` (1600) configure the loop across both opening recordings and the puzzle. Refresh restores its canonical offset. Continue fades only the soundtrack, never narration. Playback honors browser autoplay restrictions and exposes the existing-style ENABLE AUDIO gesture to the authenticated host. Phones only say “Watch the TV” and load no Chapter 8 audio code.

All five supplied files are present and unchanged. `chapter8-media.json` records measured WAV/MPEG durations and SHA-256 values. `node scripts/measure-chapter8.mjs --write` regenerates metadata without rewriting media.

## Local validation

Focused tests: `node --test tests/chapter8.test.js tests/chapter8-audio.test.js tests/chapter8-view.test.js` (17 tests). Relevant existing state, TV scheduler and Chapter 7 tests also pass (207 tests). The older `tests/client.test.js` has 16 existing mock failures reproduced on an isolated, unchanged `3585471` checkout; approved historical tests were not rewritten to hide them.

`node scripts/verify-chapter8-browser.mjs` runs an isolated-memory local server, host TV, read-only TV and phone. It verifies the complete native opening, mouse/touch reveals, drag/navigation protection, anonymous rejection, synchronization, refresh, all letters, persistent completion, aspect ratio, portrait scaling, a silent phone and the fade into the complete reaction. `--built` exercises production static output. Screenshots and reports are under ignored `logs/`, including `ch8-original.png`, `ch8-complete.png`, `ch8-portrait.png` and `chapter8-browser-report.json`.

Review validation: all 224 focused/shared tests passed, the production static build passed (195 files), and the built-browser rehearsal passed with zero runtime exceptions. The browser also rejected a late Chapter 7 poll after Chapter 8 entry. The 16 baseline client-mock failures were identical before and after these changes. No earlier chapter modules or supplied media files were edited. The approved release repeats the focused tests and production build before pushing; production READY status and read-only smoke results are verified separately after release.
