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
clears execution state, and leaving opening pauses audio and cancels its frame
loop. Refreshes skip expired clips and seek into active clips. Assets becoming
ready late use the current clock; expired assets never replay. Pending play
completion also corrects its offset. The previous clip is paused before the
next starts, preventing overlap at intentional zero-gap boundaries.

The TV Start click synchronously primes the media elements before awaiting its
host request. Autoplay permission remains browser-dependent, particularly on a
TV refreshed without a gesture. Failed loading, seeking, or playback logs a
warning and never stops visual rendering or changes server state. Narration
volume is centrally set to 1.0; audio speed and assets are unchanged. There is
no ambience, music, or SFX playback.

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
