# TV cinematic architecture

`cinematic-engine.js` resolves a declarative timeline and renders its layers.
`chapter1.js` contains `chapter1Timeline`, including the four-second opening and
the historical sequence. `tv.html` supplies server state and owns the existing
overlay/lobby flow. `chapter1.css` remains unchanged.

All `at`, `end`, fade ranges, and movement ranges are absolute milliseconds from
server `startedAt`. Cue windows are inclusive at start and exclusive at end.
Linear opacity ramps multiply together; flicker and darkening are deterministic
modifiers. Images/text are bound once to the existing DOM. Each animation frame
resolves `Date.now() - startedAt`; state polling cannot restart a transition or
add another animation loop. The flash is simply the 36000–36120ms visual window.

To define another chapter, supply its own `id`, `end`, optional `sections`, and
`cues` to `BrookwoodTimeline.Renderer`. Each cue groups its timing, type, visual
target, asset/text, and transitions together. Optional future metadata can live
on that same cue; fields without visual implementations are ignored. Phone and
game events are not dispatched by the cinematic engine.

## Narration

`cinematic-audio.js` provides `BrookwoodAudio.Player`, separately from the pure
visual resolver. It consumes cues with `type: 'narration'`, stable `id`, absolute
`at`, `src`, and validated `durationMs`. Chapter 1 uses `narration-01` through
`narration-10` under `/assets/chapter1/audio/`, with original WAV assets.

Both renderers derive elapsed time from `Date.now() - startedAt`. Audio preloads
without delaying that clock. Each narration ID is handled once per startedAt
run, including failed attempts; polling cannot replay it. A changed startedAt
clears synchronized execution state, and leaving opening pauses synchronized
clips. Refreshes skip expired clips and seek into active clips. Assets becoming
ready late use the current clock; expired assets never replay. Pending play
completion also corrects its offset. The previous clip is paused before the
next starts, preventing overlap at intentional zero-gap boundaries.

The TV Start click synchronously primes the media elements before awaiting its
host request. Autoplay permission remains browser-dependent, particularly on a
TV refreshed without a gesture. Failed loading, seeking, or playback logs a
warning and never stops visual rendering or changes server state. Narration
volume is centrally set to 1.0; audio speed and assets are unchanged.

## Persistent soundtrack and synchronized SFX

The same Player optionally accepts `{soundtrack: BrookwoodAudio.tvSoundtrack}`.
This configuration belongs to the TV experience, not a chapter cue. It preloads
`/assets/chapter1/audio/brookwood-background.wav` and uses native `audio.loop`.
Its musical position is independent of server startedAt. Starting, resetting,
or completing a chapter never pauses, seeks, or replaces the score element.
An initial blocked play attempt is caught; TV pointer/keyboard interactions
retry synchronously, and Start also unlocks it before awaiting the host request.

Lobby target volume is 0.18. Declarative chapter `scoreMix` selects 0.15 before
narration, 0.08 while narration is active, and 0.12 between lines. Its optional
volume windows override that mix: Chapter 1 uses 0.07 from 36000 to 39000ms for
the flash and silent photograph hold. Volume ramps take 200ms downward and
350ms upward, without restarting ramps on repeated polling. Narration volume
remains 1.0. The audio player uses one frame loop for synchronized cues and
score ramps; it stops scheduling once cues and ramps are finished.

Reusable `type: 'sfx'` cues have stable `id`, absolute `at`, `src`, `durationMs`,
and `volume`. They preload and use the same server-clock seeking and per-run
one-shot rules as narration, with independent playback tracking. A failed SFX
cannot pause narration. Chapter 1's only SFX is `camera-shutter`, at 36000ms,
volume 0.55, using `/assets/chapter1/audio/sfx-camera-shutter.wav`. Its exact
duration is 67536 / 264600 * 1000ms. Expired refreshes skip it; refreshes within
its window may play the remaining portion. The flash itself is unchanged.
No other sounds or additional score assets are dispatched.

WAV durations are verified from RIFF `fmt ` and `data` chunks (including extra
chunks and padding), using dataSize / byteRate * 1000. Tests require each clip's
end <= the next narration start; equality is valid. Chapter 1 narration-09 must
end <= the fixed 36000ms flash. Narration-10 ends at 42925ms, after the group
fade begins but before the 44000ms visual end. Visual timing is independent and
is never moved to fit audio.

Approved regression formulas are frozen in
`tests/chapter1-approved-fixture.js`. Tests compare every visual property at every
millisecond, including additional fractional boundary samples. The existing
seconds-based `frameAt`/`Cinematic` adapters remain for regression-test continuity;
the TV uses the reusable engine directly.

## TV server-clock integration

Successful public state responses include response-only `serverNow`; this is
never persisted and does not change Redis revision or updatedAt. The existing
TV poller records monotonic request/response times and supplies them to
`AbsoluteCueScheduler.acceptState()`. RTT midpoint estimation establishes the
server elapsed anchor; injected performance time interpolates between polls.
There is no second scheduler polling loop.

`tv-cinematic.js` passes scheduler elapsed to the existing visual renderer and
audio player, using one cinematic RAF. Standalone adapters retain their default
clock for compatibility; the TV always injects the scheduler clock. Background
score fades and the hidden-control key gesture keep their independent timing.
After suspension, audio waits for authoritative reconciliation; expired cues
are skipped and active clips seek without restarting. The same soundtrack
continues across lobby/Start/replay.

`cinematic-timeline.js` contains locked chapter/checkpoint boundaries and the
verified Chapter 2 narration timing contract.
Chapter 2 is not implemented, and no automatic photo action is dispatched.
Opening at or after 44000ms continues to render Chapter 1's final black state.

## Locked Chapter 2 narration timing contract

Chapter 1 occupies absolute 0–44,000 ms and is production-verified and frozen.
Chapter 2 occupies absolute 44,000–88,000 ms. All 13 Chapter 2 narration
durations have been measured; their start/end timestamps are now locked.
These values are implementation constants, not provisional planning values.
All table values are absolute milliseconds from server `startedAt`, except
Duration, which is the measured clip length in milliseconds.

| ID | Start | Duration | End |
| --- | ---: | ---: | ---: |
| 01 | 50,500 | 3,750 | 54,250 |
| 02 | 54,400 | 4,925 | 59,325 |
| 03 | 59,425 | 2,875 | 62,300 |
| 04 | 62,400 | 2,550 | 64,950 |
| 05 | 65,100 | 3,575 | 68,675 |
| 06 | 68,875 | 1,075 | 69,950 |
| 07 | 69,950 | 750 | 70,700 |
| 08 | 70,700 | 750 | 71,450 |
| 09 | 71,600 | 3,425 | 75,025 |
| 10 | 75,225 | 2,550 | 77,775 |
| 11 | 77,875 | 2,150 | 80,025 |
| 12 | 80,125 | 2,325 | 82,450 |
| 13 | 82,625 | 3,125 | 85,750 |

The 06→07 transition at 69,950 ms and the 07→08 transition at 70,700 ms
intentionally have zero gaps. Narration #13 ends exactly at 85,750 ms,
`CHAPTER2_NARRATION_END_DEADLINE_MS`. The interval 85,750–86,500 ms is a
mandatory 750 ms narration-free interval (`CHAPTER2_PHOTO_SILENCE_MS`).
The photo prompt begins at 86,500 ms; the persistent photo checkpoint begins
at 88,000 ms, exactly the Chapter 2 end. The prompt must not move to fit narration.

This checkpoint exports timing constants only. Chapter 2 playback, visuals,
music, and photo progression are not implemented. The narration plan is not
wired into playback, and no automatic begin-photo action is dispatched.
Opening at or after 44,000 ms continues to render Chapter 1's final black state.
