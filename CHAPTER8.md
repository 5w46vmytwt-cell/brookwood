# Chapter 8 — interactive picture clues

## Chapter 8 finale extension (release approved)

The supplied wife/security-camera/news finale is now appended automatically after the existing complete puzzle reaction. See [CHAPTER8-FINALE.md](CHAPTER8-FINALE.md) for exact measured cues, assets, persistence, preview shortcuts and validation. The completed finale and sound integration are approved for release through the existing GitHub/main/Vercel workflow; deployment status is verified separately. The prior deployed puzzle/refinement behavior below is retained except for its terminal reaction-to-complete handoff, which now enters the automatic finale. Existing persisted complete runs remain complete.

## Prior approved refinement release

Baseline: `bf36dd4`. The user authorized this focused Chapter 8 refinement, local validation, commit/push on the feature branch and the existing GitHub → main → Vercel production workflow. Never start/reset the production game, mutate production Redis or change environment variables. Production smoke checks are read-only. Chapters 1–7, supplied media and the existing host-session authentication remain unchanged.

## Sequence and host confirmation

Chapter 7's completed final fade still automatically enters Chapter 8 through the server-gated progress mechanism. The complete 13.450-second `ch8_01_unexpected_evidence.wav` now enters persistent `photo-waiting`: TAKE A PHOTOGRAPH OF THE NOTE, with a PHOTO SENT button visible only to the authenticated host. It has no deadline and cannot advance from public progression, player credentials or a narration acknowledgment.

PHOTO SENT is a story confirmation only: there is no camera access, image upload, file input or external messaging. The existing host endpoint persists `photoSentAt`, then enters `coded-message`. Concurrent/duplicate confirmation requests cannot replay the recording, change its clock or overwrite the saved confirmation. Generation, run and phase protections remain in force. Refresh restores the saved phase; already active legacy narration/puzzle states without the optional new field remain valid.

The complete 23.150-second `ch8_02_coded_message.wav` then enters the puzzle. All 17 host-controlled reveals remain unordered, atomic, repeat-safe and persistent across sessions. No typed answers or automatic answer validation exist. Completion remains visible indefinitely, until the authenticated host presses Continue. Continue fades the puzzle visually over 1600 ms, then starts the full 14.400-second `ch8_03_message_reaction.wav`. That deployed release stopped here. The local finale extension described above now follows the full reaction.

## Chapter 7 visual language

`investigation-ui.css` provides reusable scene, eyebrow/title/copy, waveform and host-control classes using the actual declarations from `chapter7.css`. This retains Georgia titles, Arial supporting text, the charcoal/green vignette, muted green waveform and centered host buttons. The existing Chapter 7 waveform animation is reused directly. Chapter 7's selectors/styles are untouched. Chapter 8 uses exclusive visual fade-ins; audio is never faded with its scene.

The supplied 1536 × 1024 PNG is unchanged, contained without cropping or distortion. `chapter8-puzzle.js` retains every mapping and percentage region. Revealed regions use aged-paper samples and original numbered tabs from that same PNG; borders, surrounding paper and answer lines remain intact. Only revealed clues 14–17 (HIDE) use dark red `#792b2b`; the first thirteen keep `#241b11`. Tile backgrounds are not recolored.

## Audio, state and testing controls

`chapter8-audio.js` reuses `BrookwoodAudio.Player`, its synchronized native loop and the existing single TV scheduler. `AMBIENT_VOLUME` remains 0.07. One track follows Chapter 8 `startedAt` through the opening, photo wait, coded narration, puzzle, Continue transition and reaction. It never restarts on ordinary phase changes. After native reaction completion, it fades out over `AMBIENT_FADE_MS` (1600 ms), anchored to persisted `completedAt`. Refresh reconstructs the canonical offset and never replays an expired completion tail. Narration stays at full volume, and ambient readiness never gates narration. Autoplay recovery uses the existing authenticated ENABLE AUDIO gesture. Phones remain silent.

The new confirmation uses the existing Redis JSON state, Lua CAS and host cookie/PIN authorization through `/api/host`. No separate room or database is introduced. Chapter Select retains FINAL WINDOW ZOOM, AFTER FINAL WINDOW ZOOM, OPENING NARRATION and PICTURE CLUES. Revisit checkpoints retain revealed letters and historical results.

All five supplied Chapter 8 media files remain byte-for-byte unchanged. `chapter8-media.json` records their durations and SHA-256 hashes. `node scripts/measure-chapter8.mjs --write` measures metadata without rewriting media.

## Validation and release verification

Focused Chapter 7/8 coverage passes 117 tests; relevant shared-state/TV scheduler regressions pass 118 tests (235 total). Coverage includes host-only confirmation, concurrent duplicates, refresh/reconnect, narration order, continuous ambience and completion fade, exact Chapter 7 design declarations, red HIDE, all clue synchronization/completion and unchanged supplied media. The production build passes with 196 static files.

`node scripts/verify-chapter8-browser.mjs --built` exercises an isolated in-memory server, authenticated TV, read-only TV and silent phone. It passes the complete native window-to-Chapter-8 sequence, persistent photo wait, anonymous rejection, host confirmation, waiting/coded/reaction refreshes, actual computed Chapter 7 design parity, all 17 mouse/touch reveals, red-only HIDE, completion, reaction ambience and final fade, with zero runtime exceptions. Screenshots and reports live under ignored `logs/`.

The historical `tests/client.test.js` has 16 pre-existing mock failures reproduced on an unchanged `3585471` checkout during the original implementation; frozen tests were not rewritten to mask them. These unrelated failures are not part of this focused release run. Production READY status and non-destructive smoke checks must be verified independently after the Git release.
