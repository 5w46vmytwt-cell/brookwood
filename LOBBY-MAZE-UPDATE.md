# Flexible lobby and The Maze

## Implementation map

The existing Redis CAS mechanism remains the only state writer. Registration,
photo confirmation, private messages, package voting and cast voting now derive
their completion counts from the persisted participant list. Joining enforces a
20-player cap inside the CAS mutation. Room locking is an authenticated,
idempotent host action; starting requires a locked, nonempty lobby. Existing
player tokens, legacy partner fields and saved assignments remain intact.

The lobby displays independent participants and removes partner/ready controls.
Host lock/start buttons recover through the existing HttpOnly host session.
The test fill remains two real phones plus ten independently registered test
players, with unchanged names and reset/token fencing. Filling a locked lobby
is rejected. No capacity denominator appears in the lobby UI.

The private-message pool already has 20 templates. New unpaired registrations
use a different participant for name references, without creating a partner.
Single-player assignments use existing messages that need no other person.
The one template referring to “the twelve of you” now says “you”. Persisted
messages are not rewritten.

## Preserved gameplay conflict

The lobby accepts 1–20 participants, including odd counts. Existing gameplay
still forbids self-votes and new casting runs require six distinct winners.
Consequently one participant cannot resolve the package election, and fewer
than seven cannot guarantee all six casting rounds: eventually the only
unassigned candidate cannot cast a legal ballot. These stages display an
explanation and remain unresolved, rather than fabricating participants,
assignments or ballots. No self-vote or repeat-winner exception was introduced.
Synthetic package/final-cast checkpoints reject impossible prerequisite groups
with an explanation. Normal seven-to-twenty-player casting is unchanged.
Physical-retriever exclusions, tie decisions and host election closing remain
unchanged. This limitation follows the requested instruction to preserve
gameplay invariants when flexible registration conflicts with them.

## Cast review and transition

`assets/chapter5/cast_final.png` and its image-relative nameplates are unchanged.
Left-to-right IDs remain screamer, terribleDecisionMaker, denier, tripper,
killer, sacrifice. The native 31.164-second narration and its 1,500-ms execution
allowance remain unchanged, within the original three-second visual hold.

New cast runs persist `transitionVersion: 1`. Each of six mystery text beats
uses a 1,000-ms fade in, 3,800-ms fully visible hold and 1,000-ms fade out,
separated by 500 ms. Previously these were 600/1,800/600 ms. Each fully visible
hold grows exactly 2,000 ms. Total finale increases from 57,265 to 74,065 ms
(+16,800 ms). Server progression and TV cues use the same versioned duration.
Existing saved runs retain their earlier clocks. Text styling reuses Chapter
1's Arial, #d7d5d0 primary type, #9f1717 red and black cinematic surfaces.

## The Maze

Visible name is THE MAZE. Narration, internal IDs and supplied assets remain
unchanged. The ready scene displays “Five games, three lives, only one way out”
and authenticated BEGIN using the existing `maze-start-games` host action.

New Maze runs persist `startVersion: 1`; old active runs keep their old gates.

| Game | Authoritative host start | Unchanged duration |
|---|---|---|
| Four Doors | START after complete door introduction | 120 seconds |
| Horror Box Office | START after complete introduction | 120 seconds |
| Don't Look Away | START reuses show-image / decoded-image readiness | 30-second exposure, then complete question narration and 90-second answer window |
| Bridge of Death | START after complete introduction | 180 seconds |
| Don't Make a Sound | START reuses begin-silence after both recordings and existing gap | 60 seconds |

The first, second and fourth games wait in persisted `game-ready` with no
deadline. The existing fenced action starts each real server timer once. The
memory and silence games retain their existing dedicated start mechanisms.
TV/phone polls read the same state; reload never creates a new deadline.

Direct host-only BLACK, RED, GREEN, BLUE buttons reuse `maze-answer`. They
disable during submission. Separate numeric captions/duplicate door answer
lists are removed; numbers printed into original door artwork remain intact.
All host actions retain session authorization, generation and sequence checks.

Maze typography/palette now follow Chapter 1. Sentence-ending periods are
removed from visible TV/phone Maze copy. Don't Make a Sound has one prominent
title and near-black lighting. Successful finale displays YOU SURVIVED only
when lives remain; zero-life failure remains GAME OVER. Laundry Room TV vote
counts and the repeated name beneath the waiting instruction are removed.

One existing looping Maze soundtrack retains its 12% ambient / 5% narration
targets through results, voting, waiting, final narration and broadcast loading
blackout. It stops when the existing news video attempts playback, before the
news audio. No new music instance, seek or restart is introduced at transitions.

## Focused validation

- 63 targeted lobby/Maze/cast checks pass, covering concurrent 20-player joins,
  locked joins, host-only lock/start, idempotency, sessions, simulation/reset,
  dynamic message/quorum counts, all six roles with 20 ballots, all five start
  paths, durations, refresh, outcome labels, sound lifecycle and cast preservation
- Eight selected existing Maze integration checks pass for legacy narration,
  elections, host close, saved cast checkpoints and memory/silence authorization
- `scripts/verify-flexible-maze-browser.mjs` uses isolated memory Redis and actual
  TV/phone pages: 20-player lobby, lock/start/session recovery, BEGIN, START,
  direct door answer, timer refresh, silent guest screen, long names, desktop
  1920×1080 and 1280×720, and 390×844 host/guest screenshots
- `scripts/verify-cast-party-browser.mjs` passes with static review mapping,
  long names, unchanged READY, and native final narration completion
- Screenshots/reports: `logs/flexible-maze/` and `logs/cast-party/`
- Production build and read-only deployment verification are recorded with
  the release; no production game mutation is used for verification

Browser automation uses Chrome. Native Safari/Samsung/Firefox devices were not
rehearsed. Existing autoplay restrictions still require the established host
audio-unlock gesture when the browser blocks playback.
